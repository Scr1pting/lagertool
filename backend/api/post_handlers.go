package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
	"lagertool.com/main/db_models"
)

// @Summary Create a new building
// @Description Create a new building for an organisation Admin only.
// @Tags buildings
// @Accept  json
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Param building body api_objects.BuildingRequest true "Building object"
// @Success 201 {object} db_models.Building
// @Failure 403 {object} map[string]string "Admin rights required"
// @Router /organisations/{orgId}/buildings [post]
func (h *Handler) CreateBuilding(c *gin.Context) {
	var req api_objects.BuildingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newBuilding, err := db.CreateBuilding(h.DB, req.Name, req.Campus)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, toBuilding(*newBuilding))
}

// @Summary Create a new room
// @Description Create a new room in a building Admin only.
// @Tags rooms
// @Accept  json
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Param buildingId path int true "Building ID"
// @Param room body api_objects.RoomRequest true "Room object"
// @Success 201 {object} api_objects.Room
// @Failure 403 {object} map[string]string "Admin rights required"
// @Failure 404 {object} map[string]string "Building not found"
// @Router /organisations/{orgId}/buildings/{buildingId}/rooms [post]
func (h *Handler) CreateRoom(c *gin.Context) {
	buildingId, err := strconv.Atoi(c.Param("buildingId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid building id"})
		return
	}
	var req api_objects.RoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	building := &db_models.Building{ID: buildingId}
	err = h.DB.Model(building).WherePK().Select()
	if errors.Is(err, pg.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "building not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	newRoom, err := db.CreateRoom(h.DB, req.Name, req.Floor, req.Number, buildingId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Same shape as GET /rooms, including the building.
	newRoom.Building = building
	c.JSON(http.StatusCreated, toRoom(*newRoom))
}

// @Summary Create a new inventory item
// @Description Create a new inventory item Admin only.
// @Tags items
// @Accept  json
// @Produce  json
// @Param item body api_objects.InventoryItemRequest true "Inventory item object"
// @Success 201 {object} db_models.Inventory
// @Failure 403 {object} map[string]string "Admin rights required"
// @Router /organisations/{orgId}/items [post]
func (h *Handler) CreateItem(c *gin.Context) {
	var req api_objects.InventoryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newItem, err := db.CreateInventoryItem(h.DB, req.Name, req.Amount, req.ShelfUnitID, req.IsConsumable, req.Note, req.ShelfID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.triggerRegenAsync(newItem.ShelfUnitID)
	c.JSON(http.StatusCreated, newItem)
}

// @Summary Add an item to my shopping cart
// @Description Adds an inventory item to the logged-in user's cart. The cart is created on first use.
// @Tags cart
// @Accept  json
// @Produce  json
// @Param cart_item body api_objects.CartRequest true "Inventory item id and amount"
// @Success 201 {object} db_models.ShoppingCartItem
// @Failure 401 {object} map[string]string "Not logged in"
// @Router /me/cart/items [post]
func (h *Handler) CreateCartItem(c *gin.Context) {
	userId, ok := targetUserID(c)
	if !ok {
		return
	}
	var err error
	var req api_objects.CartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newCart, err := db.CreateCartItem(h.DB, req.InvItemID, req.NumSelected, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newCart)
}

// checkoutDetails validates what every borrow request needs: a title and a
// period that doesn't end before it starts. It responds 400 and returns false
// otherwise.
func checkoutDetails(c *gin.Context, title string, start, end time.Time) (string, bool) {
	title = strings.TrimSpace(title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title must not be empty"})
		return "", false
	}
	if end.Before(start) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end date is before start date"})
		return "", false
	}
	return title, true
}

// @Summary Check out my shopping cart
// @Description Turns the logged-in user's cart into borrow requests (one per organisation, state "requested") for the given dates and title, then empties the cart. Nothing is created if any item isn't available for the whole period.
// @Tags cart
// @Accept  json
// @Produce  json
// @Param checkout body api_objects.CheckoutRequest true "Borrow period"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string "Invalid body, missing title or empty cart"
// @Failure 401 {object} map[string]string "Not logged in"
// @Failure 409 {object} api_objects.AvailabilityConflict "Some items aren't available for the period"
// @Router /me/cart/checkout [post]
func (h *Handler) CheckoutCart(c *gin.Context) {
	userId, ok := targetUserID(c)
	if !ok {
		return
	}
	var err error
	var req api_objects.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	title, ok := checkoutDetails(c, req.Title, req.StartDate, req.EndDate)
	if !ok {
		return
	}
	description := strings.TrimSpace(req.Description)
	itemMap, err := h.GetCartItemHelper(userId, req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(itemMap) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}

	requested := map[int]int{}
	for _, items := range itemMap {
		for _, item := range items {
			requested[item.ID] += item.AmountSelected
		}
	}

	// All or nothing: either every item is free for the period and the cart
	// becomes requests, or nothing is created.
	err = h.DB.RunInTransaction(c.Request.Context(), func(tx *pg.Tx) error {
		unavailable, err := unavailableItems(tx, requested, req.StartDate, req.EndDate)
		if err != nil {
			return err
		}
		if len(unavailable) > 0 {
			return availabilityConflict{unavailable}
		}

		for org, items := range itemMap {
			request := &db_models.Request{
				UserID:           userId,
				StartDate:        req.StartDate,
				EndDate:          req.EndDate,
				Note:             title,
				State:            "requested",
				OrganisationName: org,
				CreatedAt:        time.Now(),
			}
			if err := db.CreateRequest(tx, request); err != nil {
				return err
			}
			for _, item := range items {
				reqItem := db_models.RequestItems{RequestID: request.ID, InventoryID: item.ID, Amount: item.AmountSelected}
				if err := db.CreateRequestItem(tx, reqItem); err != nil {
					return err
				}
			}
			if description != "" {
				msg := db_models.UserRequestMessage{UserID: userId, RequestID: request.ID, Message: description, TimeStamp: time.Now()}
				if err := db.CreateUserMessage(tx, &msg); err != nil {
					return err
				}
			}
		}
		// The cart's contents are now borrow requests: empty it.
		_, err = tx.Model((*db_models.ShoppingCartItem)(nil)).
			Where("shopping_cart_id IN (SELECT id FROM shopping_cart WHERE user_id = ?)", userId).
			Delete()
		return err
	})
	if err != nil {
		respondCheckoutError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "checkout complete"})
}

// @Summary Review a request
// @Description Approve or reject a pending borrow request (outcome "approved" or "rejected"). Sets the request state; approving creates loans (or consumed records for consumables). The note is shown to the author in the request chat. The reviewer is the logged-in user. Admin only.
// @Tags requests
// @Accept  json
// @Produce  json
// @Param id path int true "Request ID"
// @Param review body api_objects.RequestReview true "Review details"
// @Success 200 {object} db_models.RequestReview
// @Failure 400 {object} map[string]string "Invalid body or outcome"
// @Failure 403 {object} map[string]string "Admin rights required"
// @Failure 404 {object} map[string]string "Request not found"
// @Failure 409 {object} map[string]string "Request was already reviewed"
// @Router /requests/{id}/review [post]
func (h *Handler) RequestReview(c *gin.Context) {
	requestId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var req api_objects.RequestReview
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Outcome != "approved" && req.Outcome != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": `outcome must be "approved" or "rejected"`})
		return
	}

	var request db_models.Request
	err = h.DB.Model(&request).
		Relation("RequestItems.Inventory").
		Where("id = ?", requestId).
		Select()
	if errors.Is(err, pg.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "request not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Only unreviewed requests, or approving a rejected one: approving twice
	// would create duplicate loans.
	state := mapApprovalState(request.State)
	if state != "pending" && !(state == "rejected" && req.Outcome == "approved") {
		c.JSON(http.StatusConflict, gin.H{"error": "request was already reviewed (" + request.State + ")"})
		return
	}

	rev := &db_models.RequestReview{
		UserID:    actingUserID(c, req.UserID),
		RequestID: requestId,
		Outcome:   req.Outcome,
		Note:      req.Note,
		TimeStamp: time.Now(),
	}
	err = db.CreateRequestReview(h.DB, rev)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if rev.Outcome == "approved" {
		for _, rItem := range request.RequestItems {
			if rItem.Inventory.IsConsumable {
				cons := &db_models.Consumed{
					RequestItemID: rItem.ID,
				}
				err := db.Create_consumed(h.DB, cons)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
			} else {
				l := &db_models.Loans{
					RequestItemID: rItem.ID,
					IsReturned:    false,
					ReturnedAt:    time.Time{},
				}
				err := db.Create_loans(h.DB, l)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
			}
		}
	}

	if err := db.UpdateRequest(h.DB, requestId, rev.Outcome); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rev)
}

// @Summary Mark a request as picked up
// @Description Record that the items of an approved borrow request were picked up
// @Tags requests
// @Produce  json
// @Param id path int true "Request ID"
// @Success 202
// @Router /requests/{id}/pickup [post]
func (h *Handler) PickUpRequest(c *gin.Context) {
	requestId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	err = h.DB.RunInTransaction(c.Request.Context(), func(tx *pg.Tx) error {
		request, err := lockRequest(tx, requestId)
		if err != nil {
			return err
		}
		if stage := requestStage(tx, request); stage != "notPickedUp" {
			return stageConflict{"only approved requests that weren't picked up yet can be picked up (" + stage + ")"}
		}
		if err := moveConsumables(tx, requestId, -1); err != nil {
			return err
		}
		_, err = tx.Model((*db_models.Request)(nil)).Set("picked_up_at = ?", time.Now()).Where("id = ?", requestId).Update()
		return err
	})
	if !respondTxError(c, err) {
		c.Status(http.StatusAccepted)
	}
}

// @Summary Revert a request by one stage
// @Description Undo the last step of a borrow request. "from" must be its current stage:
// @Description notPickedUp → pending (loans and consumptions are deleted), borrowed → not picked up,
// @Description returned → borrowed, rejected → pending.
// @Tags requests
// @Accept  json
// @Produce  json
// @Param id path int true "Request ID"
// @Param revert body api_objects.RevertRequest true "Current stage"
// @Success 202
// @Router /requests/{id}/revert [post]
func (h *Handler) RevertReview(c *gin.Context) {
	requestId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var req api_objects.RevertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.DB.RunInTransaction(c.Request.Context(), func(tx *pg.Tx) error {
		request, err := lockRequest(tx, requestId)
		if err != nil {
			return err
		}
		// Checking the expected stage makes a repeated click revert only once.
		if stage := requestStage(tx, request); stage != req.From {
			return stageConflict{"request is " + stage + ", not " + req.From}
		}
		itemIDs := tx.Model((*db_models.RequestItems)(nil)).Column("id").Where("request_id = ?", requestId)
		switch req.From {
		case "notPickedUp":
			// Remove what approving created, so a later approval doesn't duplicate it.
			if _, err := tx.Model((*db_models.Loans)(nil)).Where("request_item_id IN (?)", itemIDs).Delete(); err != nil {
				return err
			}
			if _, err := tx.Model((*db_models.Consumed)(nil)).Where("request_item_id IN (?)", itemIDs).Delete(); err != nil {
				return err
			}
			return setRequestState(tx, requestId, "pending")
		case "borrowed":
			if err := moveConsumables(tx, requestId, +1); err != nil {
				return err
			}
			_, err := tx.Model((*db_models.Request)(nil)).Set("picked_up_at = NULL").Where("id = ?", requestId).Update()
			return err
		case "returned":
			_, err := tx.Model((*db_models.Loans)(nil)).
				Set("returned = ?", false).
				Set("returned_at = ?", time.Time{}).
				Where("request_item_id IN (?)", itemIDs).
				Update()
			return err
		case "rejected":
			return setRequestState(tx, requestId, "pending")
		default:
			return stageConflict{"request can't be reverted from " + req.From}
		}
	})
	if !respondTxError(c, err) {
		c.Status(http.StatusAccepted)
	}
}

// stageConflict is returned from a transaction when the request isn't in a
// stage that allows the action.
type stageConflict struct{ msg string }

func (e stageConflict) Error() string { return e.msg }

// lockRequest loads a request and locks its row until the transaction ends,
// so concurrent stage changes can't interleave.
func lockRequest(tx *pg.Tx, requestId int) (db_models.Request, error) {
	var request db_models.Request
	err := tx.Model(&request).Where("id = ?", requestId).For("UPDATE").Select()
	return request, err
}

// moveConsumables changes the amount of each consumable in the request by
// direction × the requested amount: -1 when they're picked up (used up),
// +1 when that pickup is reverted.
func moveConsumables(tx *pg.Tx, requestId int, direction int) error {
	_, err := tx.Exec(`
UPDATE "Inventory" AS i SET amount = i.amount + ? * ri.amount
FROM request_items AS ri
WHERE ri.inventory_id = i.id AND ri.request_id = ? AND i.is_consumable`, direction, requestId)
	return err
}

func setRequestState(tx *pg.Tx, requestId int, state string) error {
	_, err := tx.Model((*db_models.Request)(nil)).Set("state = ?", state).Where("id = ?", requestId).Update()
	return err
}

// respondTxError writes the response for a failed stage transaction and
// reports whether there was an error.
func respondTxError(c *gin.Context, err error) bool {
	var conflict stageConflict
	switch {
	case err == nil:
		return false
	case errors.Is(err, pg.ErrNoRows):
		c.JSON(http.StatusNotFound, gin.H{"error": "request not found"})
	case errors.As(err, &conflict):
		c.JSON(http.StatusConflict, gin.H{"error": conflict.msg})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	return true
}

// @Summary Post a message to a request
// @Description Post a user message on a borrow request Only the request's author or an admin. The author is the logged-in user (userId in the body is ignored then).
// @Tags requests
// @Accept  json
// @Produce  json
// @Param id path int true "Request ID"
// @Param message body api_objects.UserMessage true "Message object"
// @Success 200 {object} api_objects.UserMessage
// @Failure 403 {object} map[string]string "Not the author and not an admin"
// @Failure 404 {object} map[string]string "Request not found"
// @Router /requests/{id}/messages [post]
func (h *Handler) PostMessage(c *gin.Context) {
	requestId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	if !h.canAccessRequest(c, requestId) {
		return
	}
	var msg api_objects.UserMessage
	if err = c.ShouldBindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error while parsing payload": err.Error()})
		return
	}
	if msg.AsAdmin {
		if u := currentUser(c); u != nil && !u.IsAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin rights required"})
			return
		}
	}
	dbMsg := db_models.UserRequestMessage{
		UserID:    actingUserID(c, msg.UserID),
		RequestID: requestId,
		Message:   msg.Message,
		TimeStamp: time.Now(),
		IsAdmin:   msg.AsAdmin,
	}
	err = db.CreateUserMessage(h.DB, &dbMsg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, msg)
}

// @Summary Create a new shelf
// @Description Create a new shelf in a room Admin only.
// @Tags shelves
// @Accept  json
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Param buildingId path int true "Building ID"
// @Param roomId path int true "Room ID"
// @Param shelf body api_objects.ShelfRequest true "Shelf object"
// @Success 201 {object} db_models.Shelf
// @Failure 403 {object} map[string]string "Admin rights required"
// @Router /organisations/{orgId}/buildings/{buildingId}/rooms/{roomId}/shelves [post]
func (h *Handler) CreateShelf(c *gin.Context) {
	orgId := c.Param("orgId")
	roomId, err := strconv.Atoi(c.Param("roomId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room id"})
		return
	}

	var req api_objects.ShelfRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert api_objects columns to db.ColumnInput
	columns := make([]db.ColumnInput, len(req.Columns))
	for i, col := range req.Columns {
		elements := make([]db.ShelfElementInput, len(col.Elements))
		for j, el := range col.Elements {
			elements[j] = db.ShelfElementInput{ID: el.ID, Type: el.Type}
		}
		columns[i] = db.ColumnInput{ID: col.ID, Elements: elements}
	}

	newShelf, err := db.CreateShelf(h.DB, req.ID, req.Name, orgId, roomId, columns)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newShelf)
}

// @Summary Borrow a single item directly
// @Description Creates a borrow request for one item without going through (or touching) the cart. The description, if any, becomes the first message on the request. Refused (409) if the amount isn't available for the whole period.
// @Tags cart
// @Accept  json
// @Produce  json
// @Param checkout body api_objects.InstantCheckoutRequest true "Item, amount, dates, title and description"
// @Success 201 {object} db_models.Request
// @Failure 400 {object} map[string]string "Invalid body or missing title"
// @Failure 401 {object} map[string]string "Not logged in"
// @Failure 404 {object} map[string]string "Item not found"
// @Failure 409 {object} api_objects.AvailabilityConflict "Not available for the period"
// @Router /me/checkout [post]
func (h *Handler) InstantCheckout(c *gin.Context) {
	userId, ok := targetUserID(c)
	if !ok {
		return
	}
	var req api_objects.InstantCheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	title, ok := checkoutDetails(c, req.Title, req.StartDate, req.EndDate)
	if !ok {
		return
	}
	req.Description = strings.TrimSpace(req.Description)

	// The request belongs to the organisation that owns the item's shelf.
	var inv db_models.Inventory
	err := h.DB.Model(&inv).Relation("ShelfUnit.Column.Shelf").Where("inventory.id = ?", req.InvItemID).Select()
	if errors.Is(err, pg.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if inv.ShelfUnit == nil || inv.ShelfUnit.Column == nil || inv.ShelfUnit.Column.Shelf == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "item has no shelf"})
		return
	}

	request := &db_models.Request{
		UserID:           userId,
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
		Note:             title,
		State:            "requested",
		OrganisationName: inv.ShelfUnit.Column.Shelf.OwnedBy,
		CreatedAt:        time.Now(),
	}
	err = h.DB.RunInTransaction(c.Request.Context(), func(tx *pg.Tx) error {
		unavailable, err := unavailableItems(tx, map[int]int{inv.ID: req.NumSelected}, req.StartDate, req.EndDate)
		if err != nil {
			return err
		}
		if len(unavailable) > 0 {
			return availabilityConflict{unavailable}
		}
		if err := db.CreateRequest(tx, request); err != nil {
			return err
		}
		reqItem := db_models.RequestItems{RequestID: request.ID, InventoryID: inv.ID, Amount: req.NumSelected}
		if err := db.CreateRequestItem(tx, reqItem); err != nil {
			return err
		}
		if req.Description != "" {
			msg := db_models.UserRequestMessage{UserID: userId, RequestID: request.ID, Message: req.Description, TimeStamp: time.Now()}
			return db.CreateUserMessage(tx, &msg)
		}
		return nil
	})
	if err != nil {
		respondCheckoutError(c, err)
		return
	}
	c.JSON(http.StatusCreated, request)
}
