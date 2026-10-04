package api

import (
	"errors"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db_models"
)

// commitment is stock of an item that a request has claimed and that isn't
// back on the shelf yet.
type commitment struct {
	RequestID int
	Title     string
	Author    string
	Start     time.Time
	End       time.Time
	Amount    int
	PickedUp  bool
}

// until is when the stock is free again: the end date, or now for a loan
// that is overdue (picked up, past its end, not returned).
func (c commitment) until(now time.Time) time.Time {
	if c.PickedUp && now.After(c.End) {
		return now
	}
	return c.End
}

func (c commitment) overlaps(start, end, now time.Time) bool {
	return !(c.Start.After(end) || start.After(c.until(now)))
}

// loadCommitments lists the requests holding stock of inv, which must have
// RequestItems.Request.User loaded. Rejected requests and returned loans hold
// nothing. Consumables are taken off the amount when picked up, so for them
// only requests that weren't picked up yet count.
func loadCommitments(con orm.DB, inv db_models.Inventory) ([]commitment, error) {
	returned := map[int]bool{}
	if !inv.IsConsumable && len(inv.RequestItems) > 0 {
		ids := make([]int, len(inv.RequestItems))
		for i, ri := range inv.RequestItems {
			ids[i] = ri.ID
		}
		var loans []db_models.Loans
		err := con.Model(&loans).Where("request_item_id IN (?)", pg.In(ids)).Where("returned").Select()
		if err != nil {
			return nil, err
		}
		for _, l := range loans {
			returned[l.RequestItemID] = true
		}
	}

	var res []commitment
	for _, ri := range inv.RequestItems {
		r := ri.Request
		if r == nil || mapApprovalState(r.State) == "rejected" || returned[ri.ID] {
			continue
		}
		pickedUp := mapApprovalState(r.State) == "approved" && r.PickedUpAt != nil
		if inv.IsConsumable && pickedUp {
			continue
		}
		author := ""
		if r.User != nil {
			author = r.User.Name
		}
		res = append(res, commitment{
			RequestID: r.ID,
			Title:     r.Note,
			Author:    author,
			Start:     r.StartDate,
			End:       r.EndDate,
			Amount:    ri.Amount,
			PickedUp:  pickedUp,
		})
	}
	return res, nil
}

// itemCommitments loads an item together with its commitments.
func itemCommitments(con orm.DB, invId int) (db_models.Inventory, []commitment, error) {
	var inv db_models.Inventory
	err := con.Model(&inv).Relation("RequestItems.Request.User").Where("inventory.id = ?", invId).Select()
	if err != nil {
		return inv, nil, err
	}
	cs, err := loadCommitments(con, inv)
	return inv, cs, err
}

// peakCommitment is the most stock claimed at once from now on, and the
// requests claiming it then. Consumables are claimed until picked up
// whatever the dates, so for them it's everything outstanding.
func peakCommitment(cs []commitment, consumable bool, now time.Time) (int, []commitment) {
	if consumable {
		total := 0
		for _, c := range cs {
			total += c.Amount
		}
		return total, cs
	}
	return peakBetween(cs, now, time.Date(9999, 1, 1, 0, 0, 0, 0, time.UTC), now)
}

// peakBetween is the most stock of a loanable item claimed on any single
// moment between start and end, and the requests claiming it then. (Summing
// everything that overlaps the period would count requests on different days
// against each other.)
func peakBetween(cs []commitment, start, end, now time.Time) (int, []commitment) {
	peak := 0
	var peakSet []commitment
	// The claimed amount only rises where a commitment starts, so the peak
	// is at the period's start or where one starts inside it.
	for _, candidate := range cs {
		if !candidate.overlaps(start, end, now) {
			continue
		}
		t := candidate.Start
		if t.Before(start) {
			t = start
		}
		sum := 0
		var set []commitment
		for _, c := range cs {
			if c.overlaps(t, t, now) {
				sum += c.Amount
				set = append(set, c)
			}
		}
		if sum > peak {
			peak, peakSet = sum, set
		}
	}
	return peak, peakSet
}

// availableFor is how much of inv is free throughout start–end; negative when
// overbooked. Consumables aren't time-bound: every outstanding request counts.
func availableFor(inv db_models.Inventory, cs []commitment, start, end time.Time) int {
	if inv.IsConsumable {
		total := 0
		for _, c := range cs {
			total += c.Amount
		}
		return inv.Amount - total
	}
	peak, _ := peakBetween(cs, start, end, time.Now())
	return inv.Amount - peak
}

// unavailableItems locks the given items until the transaction ends (so
// concurrent checkouts can't both take the last one) and returns those whose
// requested amount isn't free throughout start–end.
func unavailableItems(tx *pg.Tx, requested map[int]int, start, end time.Time) ([]api_objects.UnavailableItem, error) {
	ids := make([]int, 0, len(requested))
	for id := range requested {
		ids = append(ids, id)
	}
	sort.Ints(ids) // a fixed lock order avoids deadlocks between checkouts
	if _, err := tx.Exec(`SELECT id FROM "Inventory" WHERE id IN (?) ORDER BY id FOR UPDATE`, pg.In(ids)); err != nil {
		return nil, err
	}
	var res []api_objects.UnavailableItem
	for _, id := range ids {
		inv, cs, err := itemCommitments(tx, id)
		if err != nil {
			return nil, err
		}
		if available := availableFor(inv, cs, start, end); requested[id] > available {
			res = append(res, api_objects.UnavailableItem{
				ID: id, Name: inv.Name, Requested: requested[id], Available: max(available, 0),
			})
		}
	}
	return res, nil
}

// availabilityConflict is returned from a checkout transaction when items
// aren't available; nothing was created.
type availabilityConflict struct{ items []api_objects.UnavailableItem }

func (e availabilityConflict) Error() string { return "some items aren't available for this period" }

// respondCheckoutError writes the response for a failed checkout transaction.
func respondCheckoutError(c *gin.Context, err error) {
	var conflict availabilityConflict
	if errors.As(err, &conflict) {
		c.JSON(http.StatusConflict, api_objects.AvailabilityConflict{Error: conflict.Error(), Items: conflict.items})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
