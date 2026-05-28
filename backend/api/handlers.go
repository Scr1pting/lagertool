package api

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/config"
	"lagertool.com/main/db_models"
	"lagertool.com/main/util"
)

type Handler struct {
	DB  *pg.DB
	Cfg *config.Config
}

func NewHandler(db *pg.DB, cfg *config.Config) *Handler {
	return &Handler{DB: db, Cfg: cfg}
}

// @Summary Get all organisations
// @Description Get all organisations
// @Tags organisations
// @Produce  json
// @Success 200 {array} db_models.Organisation
// @Router /organisations [get]
func (h *Handler) GetOrganisations(c *gin.Context) {
	var organisations []db_models.Organisation
	err := h.DB.Model(&organisations).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, organisations)
}

// @Summary Get all shelves for an organisation
// @Description Get all shelves for an organisation
// @Tags shelves
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Success 200 {array} api_objects.Shelf
// @Router /organisations/{orgId}/shelves [get]
func (h *Handler) GetShelves(c *gin.Context) {
	organisation := c.Param("orgId")
	var res []api_objects.Shelf
	var dbRes []db_models.Shelf
	err := h.DB.Model(&dbRes).Where("owned_by = ?", organisation).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, shelf := range dbRes {
		shelfObj, err2 := h.GetShelfHelper(shelf.ID, organisation)
		if err2 != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err2.Error()})
			return
		}
		res = append(res, shelfObj)
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get a specific item
// @Description Get a specific item
// @Tags items
// @Produce  json
// @Param id path int true "Inventory Item ID"
// @Param start query string false "Start date in format 2006-01-02"
// @Param end query string false "End date in format 2006-01-02"
// @Success 200 {object} api_objects.InventoryItemWithShelf
// @Router /organisations/{orgId}/items/{id} [get]
func (h *Handler) GetItem(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	start, err := time.Parse("2006-01-02", c.Query("start"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start date"})
		return
	}
	end, err := time.Parse("2006-01-02", c.Query("end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end date"})
		return
	}
	invItem, err := h.GetInventoryItemHelper(id, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Look up the organisation from the shelf
	var shelf db_models.Shelf
	err = h.DB.Model(&shelf).Where("id = ?", invItem.ShelfID).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	shelfObj, err := h.GetShelfHelper(invItem.ShelfID, shelf.OwnedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := api_objects.InventoryItemWithShelf{
		InventoryItem: invItem,
		Shelf:         shelfObj,
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get a user's shopping cart
// @Description Get a user's shopping cart
// @Tags cart
// @Produce  json
// @Param userId path int true "User ID"
// @Param start query string true "Start date in format 2006-01-02"
// @Param end query string true "End date in format 2006-01-02"
// @Success 200 {object} map[string][]api_objects.CartItem
// @Router /users/{userId}/cart [get]
func (h *Handler) GetShoppingCart(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	start, err := time.Parse("2006-01-02", c.Query("start"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start date"})
		return
	}
	end, err := time.Parse("2006-01-02", c.Query("end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end date"})
		return
	}
	m, err := h.GetCartItemHelper(id, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, m)
}

// @Summary Get messages for a request
// @Description Get all messages (user and admin) for a request, sorted by timestamp
// @Tags requests
// @Produce  json
// @Param id path int true "Request ID"
// @Success 200 {array} api_objects.Message
// @Router /requests/{id}/messages [get]
func (h *Handler) GetMessages(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var res []api_objects.Message
	var dbResAdmin []db_models.RequestReview
	var dbResMember []db_models.UserRequestMessage

	err = h.DB.Model(&dbResMember).Relation("User").
		Where("request_id = ?", id).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	err = h.DB.Model(&dbResAdmin).Relation("User").Where("request_id = ?", id).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	for _, admin := range dbResAdmin {
		res = append(res, api_objects.Message{ID: admin.ID, AuthorName: admin.User.Name, Message: admin.Note, IsAdmin: true, TimeStamp: admin.TimeStamp})
	}
	for _, member := range dbResMember {
		res = append(res, api_objects.Message{
			ID:         member.ID,
			AuthorName: member.User.Name,
			Message:    member.Message,
			IsAdmin:    false,
			TimeStamp:  member.TimeStamp,
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].TimeStamp.Before(res[j].TimeStamp)
	})
	c.JSON(http.StatusOK, res)
}

// @Summary List borrow requests
// @Description List borrow requests. Without query params returns all (admin view); with ?userId=N returns only that user's.
// @Tags requests
// @Produce  json
// @Param userId query int false "Filter to requests owned by this user"
// @Success 200 {array} api_objects.BorrowRequest
// @Router /borrow_requests [get]
func (h *Handler) GetBorrowRequests(c *gin.Context) {
	var requests []db_models.Request
	// NB: keep this relation chain shallow. go-pg builds composite column aliases like
	// `request_items__inventory__shelf_unit__column__shelf__room__building__update_date`
	// and silently truncates them at ~63 chars, which then fails to round-trip. We
	// resolve the inventory + shelf hierarchy per item below via GetInventoryItemHelper.
	q := h.DB.Model(&requests).
		Relation("User").
		Relation("RequestItems").
		Order("created_at DESC")

	if userIdStr := c.Query("userId"); userIdStr != "" {
		userId, err := strconv.Atoi(userIdStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
			return
		}
		q = q.Where("request.user_id = ?", userId)
	}

	if err := q.Select(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := make([]api_objects.BorrowRequest, 0, len(requests))
	for _, r := range requests {
		br, err := h.buildBorrowRequest(r)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		res = append(res, br)
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) buildBorrowRequest(r db_models.Request) (api_objects.BorrowRequest, error) {
	items := make([]api_objects.BorrowItem, 0, len(r.RequestItems))
	for _, ri := range r.RequestItems {
		invItem, err := h.GetInventoryItemHelper(ri.InventoryID, r.StartDate, r.EndDate)
		if err != nil {
			return api_objects.BorrowRequest{}, err
		}
		items = append(items, api_objects.BorrowItem{InventoryItem: invItem, Borrowed: ri.Amount})
	}

	messages, err := h.getBorrowMessages(r.ID)
	if err != nil {
		return api_objects.BorrowRequest{}, err
	}

	timeState, returnedAt := h.deriveTimeState(r)

	author := ""
	if r.User != nil {
		author = r.User.Name
	}

	return api_objects.BorrowRequest{
		ID:            r.ID,
		ApprovalState: mapApprovalState(r.State),
		TimeState:     timeState,
		Title:         r.Note,
		Author:        author,
		CreationDate:  r.CreatedAt,
		StartDate:     r.StartDate,
		EndDate:       r.EndDate,
		ReturnedDate:  returnedAt,
		Items:         items,
		Messages:      messages,
	}, nil
}

// mapApprovalState normalises DB request.state into the frontend's approvalState
// vocabulary ("pending" | "approved" | "rejected"). The DB has historically used
// both "requested" and "pending" for unreviewed requests.
func mapApprovalState(s string) string {
	switch s {
	case "requested", "pending", "":
		return "pending"
	default:
		return s
	}
}

func (h *Handler) deriveTimeState(r db_models.Request) (string, *time.Time) {
	if mapApprovalState(r.State) != "approved" {
		return "", nil
	}
	var loans []db_models.Loans
	err := h.DB.Model(&loans).
		Where("request_item_id IN (SELECT id FROM request_items WHERE request_id = ?)", r.ID).
		Select()
	now := time.Now()
	bracket := func() string {
		switch {
		case now.Before(r.StartDate):
			return "future"
		case now.After(r.EndDate):
			return "overdue"
		default:
			return "onLoan"
		}
	}
	if err != nil || len(loans) == 0 {
		return bracket(), nil
	}
	allReturned := true
	var latest time.Time
	for _, l := range loans {
		if !l.IsReturned {
			allReturned = false
			break
		}
		if l.ReturnedAt.After(latest) {
			latest = l.ReturnedAt
		}
	}
	if allReturned {
		return "returned", &latest
	}
	return bracket(), nil
}

func (h *Handler) getBorrowMessages(requestId int) ([]api_objects.BorrowMessage, error) {
	var member []db_models.UserRequestMessage
	if err := h.DB.Model(&member).Relation("User").Where("request_id = ?", requestId).Select(); err != nil {
		return nil, err
	}
	var admin []db_models.RequestReview
	if err := h.DB.Model(&admin).Relation("User").Where("request_id = ?", requestId).Select(); err != nil {
		return nil, err
	}
	type tsMsg struct {
		msg api_objects.BorrowMessage
		ts  time.Time
	}
	all := make([]tsMsg, 0, len(member)+len(admin))
	for _, m := range member {
		name := ""
		if m.User != nil {
			name = m.User.Name
		}
		all = append(all, tsMsg{
			msg: api_objects.BorrowMessage{ID: m.ID, Text: m.Message, Author: name, IsAdmin: false},
			ts:  m.TimeStamp,
		})
	}
	for _, a := range admin {
		name := ""
		if a.User != nil {
			name = a.User.Name
		}
		all = append(all, tsMsg{
			msg: api_objects.BorrowMessage{ID: a.ID, Text: a.Note, Author: name, IsAdmin: true},
			ts:  a.TimeStamp,
		})
	}
	sort.Slice(all, func(i, j int) bool { return all[i].ts.Before(all[j].ts) })
	res := make([]api_objects.BorrowMessage, len(all))
	for i, x := range all {
		res[i] = x.msg
	}
	return res, nil
}

// @Summary Get borrow history for an item
// @Description Get all borrow/loan history for an inventory item
// @Tags items
// @Produce  json
// @Param id path int true "Inventory Item ID"
// @Success 200 {array} api_objects.BorrowHistory
// @Router /organisations/{orgId}/items/{id}/borrows [get]
func (h *Handler) GetBorrowHistory(c *gin.Context) {
	itemId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	var dbRes []db_models.RequestItems
	err = h.DB.Model(&dbRes).
		Where("inventory_id = ?", itemId).
		Relation("Request.User").
		Select()
	var res []api_objects.BorrowHistory
	for _, item := range dbRes {
		out := api_objects.BorrowHistory{
			User:      item.Request.User.Name,
			Event:     item.Request.Note,
			StartedAt: item.Request.StartDate,
			DueAt:     item.Request.EndDate,
			State:     item.Request.State,
			Amount:    item.Amount,
		}
		if item.Request.State == "approved" {
			var db2res db_models.Loans
			err = h.DB.Model(&db2res).Where("request_item_id = ?", item.ID).First()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if db2res.IsReturned {
				out.ReturnedAt = db2res.ReturnedAt
			}
		}
		res = append(res, out)
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Fuzzy search for inventory items
// @Description Search for inventory items by name using fuzzy matching
// @Tags search
// @Produce  json
// @Param searchTerm path string true "Search term"
// @Param start query string false "Start date in format 2006-01-02 (defaults to today)"
// @Param end query string false "End date in format 2006-01-02 (defaults to start)"
// @Success 200 {array} api_objects.InventorySorted
// @Router /search/{searchTerm} [get]
func (h *Handler) FuzzyFindItems(c *gin.Context) {
	searchTerm := c.Param("searchTerm")

	start, err := time.Parse("2006-01-02", c.Query("start"))
	if err != nil {
		start = time.Now().Truncate(24 * time.Hour)
	}
	end, err := time.Parse("2006-01-02", c.Query("end"))
	if err != nil {
		end = start
	}

	var dbAll []db_models.Inventory
	err = h.DB.Model(&dbAll).
		Column("inventory.*").
		Relation("ShelfUnit.Column.Shelf.Room.Building").
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	matches := util.FindItemSearchTermsInDB(dbAll, searchTerm)

	var res []api_objects.InventorySorted
	for _, item := range matches {
		available, err := h.GetAvailable(item.ID, start, end)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		res = append(res, api_objects.InventorySorted{
			ID:             item.ID,
			Name:           item.Name,
			Amount:         item.Amount,
			Available:      available,
			Room:           toRoom(*item.ShelfUnit.Column.Shelf.Room),
			Building:       toBuilding(*item.ShelfUnit.Column.Shelf.Room.Building),
			ShelfElementID: item.ShelfUnitID,
		})
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Delete all cart items
// @Description Delete all items from a user's shopping cart
// @Tags cart
// @Produce  json
// @Param userId path int true "User ID"
// @Success 200 {array} db_models.ShoppingCartItem
// @Router /users/{userId}/cart/items [delete]
func (h *Handler) DeleteAllCartItems(c *gin.Context) {
	var dbCI []db_models.ShoppingCartItem
	userId, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	err = h.DB.Model(&dbCI).Relation("ShoppingCart").Where("shopping_cart.user_id = ?", userId).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(dbCI) == 0 {
		c.JSON(http.StatusOK, []db_models.ShoppingCartItem{})
		return
	}
	ids := make([]int, len(dbCI))
	for i, item := range dbCI {
		ids[i] = item.ID
	}
	_, err = h.DB.Model((*db_models.ShoppingCartItem)(nil)).Where("id IN (?)", pg.In(ids)).Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dbCI)
}

// @Summary Delete a single cart item
// @Description Delete a specific item from a user's shopping cart by inventory item ID
// @Tags cart
// @Produce  json
// @Param userId path int true "User ID"
// @Param itemId path int true "Inventory Item ID"
// @Success 200
// @Router /users/{userId}/cart/items/{itemId} [delete]
func (h *Handler) DeleteCartItem(c *gin.Context) {
	itemId, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	userId, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	var cart db_models.ShoppingCart
	err = h.DB.Model(&cart).Where("user_id = ?", userId).First()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"no matching cart": err.Error()})
		return
	}

	var item db_models.ShoppingCartItem
	res, err := h.DB.Model(&item).Where("inventory_id = ?", itemId).Where("shopping_cart_id = ?", cart.ID).Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"could not delete item": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}
