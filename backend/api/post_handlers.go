package api

import (
	"errors"
	"net/http"
	"strconv"
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
// @Success 201 {object} db_models.Room
// @Failure 403 {object} map[string]string "Admin rights required"
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

	newRoom, err := db.CreateRoom(h.DB, req.Name, req.Floor, req.Number, buildingId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
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
	newItem, err := db.CreateInventoryItem(h.DB, req.Name, req.Amount, req.ShelfUnitID, req.IsConsumable, req.Note, req.ShelfID, req.Keywords)
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

// @Summary Check out my shopping cart
// @Description Turns the logged-in user's cart into borrow requests (one per organisation, state "requested") for the given dates, then empties the cart.
// @Tags cart
// @Accept  json
// @Produce  json
// @Param checkout body api_objects.CheckoutRequest true "Borrow period"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string "Invalid body or empty cart"
// @Failure 401 {object} map[string]string "Not logged in"
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
	itemMap, err := h.GetCartItemHelper(userId, req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(itemMap) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}

	for k, v := range itemMap {
		request := &db_models.Request{
			UserID:           userId,
			StartDate:        req.StartDate,
			EndDate:          req.EndDate,
			Note:             "",
			State:            "requested",
			OrganisationName: k,
			CreatedAt:        time.Now(),
		}
		err := db.CreateRequest(h.DB, request)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create request"})
			return
		}
		for _, item := range v {
			reqItem := db_models.RequestItems{
				RequestID:   request.ID,
				InventoryID: item.ID,
				Amount:      item.AmountSelected,
				Request:     request,
			}
			err := db.CreateRequestItem(h.DB, reqItem)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create request item"})
				return
			}
		}
	}
	// The cart's contents are now borrow requests: empty it.
	_, err = h.DB.Model((*db_models.ShoppingCartItem)(nil)).
		Where("shopping_cart_id IN (SELECT id FROM shopping_cart WHERE user_id = ?)", userId).
		Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "requests created, but could not empty cart"})
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
	// Only unreviewed requests: approving twice would create duplicate loans.
	if mapApprovalState(request.State) != "pending" {
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
// @Description Creates a borrow request for one item without going through (or touching) the cart. The description, if any, becomes the first message on the request.
// @Tags cart
// @Accept  json
// @Produce  json
// @Param checkout body api_objects.InstantCheckoutRequest true "Item, amount, dates, title and description"
// @Success 201 {object} db_models.Request
// @Failure 400 {object} map[string]string "Invalid body"
// @Failure 401 {object} map[string]string "Not logged in"
// @Failure 404 {object} map[string]string "Item not found"
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
		Note:             req.Title,
		State:            "requested",
		OrganisationName: inv.ShelfUnit.Column.Shelf.OwnedBy,
		CreatedAt:        time.Now(),
	}
	if err := db.CreateRequest(h.DB, request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create request"})
		return
	}
	reqItem := db_models.RequestItems{RequestID: request.ID, InventoryID: inv.ID, Amount: req.NumSelected}
	if err := db.CreateRequestItem(h.DB, reqItem); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create request item"})
		return
	}
	if req.Description != "" {
		msg := db_models.UserRequestMessage{UserID: userId, RequestID: request.ID, Message: req.Description, TimeStamp: time.Now()}
		if err := db.CreateUserMessage(h.DB, &msg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "request created, but could not save description"})
			return
		}
	}
	c.JSON(http.StatusCreated, request)
}
