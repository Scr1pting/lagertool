package api

import (
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
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
	peak := 0
	var peakSet []commitment
	// The claimed amount only rises where a commitment starts, so the peak
	// is at one of those moments (clipped to now).
	for _, candidate := range cs {
		if candidate.until(now).Before(now) {
			continue
		}
		t := candidate.Start
		if t.Before(now) {
			t = now
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
