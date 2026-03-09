package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
	"lagertool.com/main/db_models"
)

// @Summary Create a new building
// @Description Create a new building for an organisation
// @Tags buildings
// @Accept  json
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Param building body api_objects.BuildingRequest true "Building object"
// @Success 201 {object} db_models.Building
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
	c.JSON(http.StatusCreated, newBuilding)
}

// @Summary Create a new room
// @Description Create a new room in a building
// @Tags rooms
// @Accept  json
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Param buildingId path int true "Building ID"
// @Param room body api_objects.RoomRequest true "Room object"
// @Success 201 {object} db_models.Room
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
	c.JSON(http.StatusCreated, newRoom)
}

// @Summary Create a new inventory item
// @Description Create a new inventory item
// @Tags items
// @Accept  json
// @Produce  json
// @Param item body api_objects.InventoryItemRequest true "Inventory item object"
// @Success 201 {object} db_models.Inventory
// @Router /items [post]
func (h *Handler) CreateItem(c *gin.Context) {
	var req api_objects.InventoryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newItem, err := db.CreateInventoryItem(h.DB, req.Name, req.Amount, req.ShelfUnitID, req.IsConsumable, req.Note)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newItem)
}

// @Summary Add an item to the shopping cart
// @Description Add an item to the shopping cart
// @Tags cart
// @Accept  json
// @Produce  json
// @Param userId path int true "User ID"
// @Param cart_item body api_objects.CartRequest true "Cart item object"
// @Success 201 {object} db_models.ShoppingCartItem
// @Router /users/{userId}/cart/items [post]
func (h *Handler) CreateCartItem(c *gin.Context) {
	userId, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
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

// @Summary Checkout shopping cart
// @Description Checkout the user's shopping cart and create requests
// @Tags cart
// @Accept  json
// @Produce  json
// @Param userId path int true "User ID"
// @Param checkout body api_objects.CheckoutRequest true "Checkout details"
// @Success 201
// @Router /users/{userId}/cart/checkout [post]
func (h *Handler) CheckoutCart(c *gin.Context) {
	userId, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
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

	for k, v := range itemMap {
		request := &db_models.Request{
			UserID:           userId,
			StartDate:        req.StartDate,
			EndDate:          req.EndDate,
			Note:             "",
			State:            "requested",
			OrganisationName: k,
		}
		err := db.Create_request(h.DB, request)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create request"})
			return
		}
		request.GroupID = request.ID
		_, err = h.DB.Model(request).Set("group_id = ?", request.GroupID).Where("id = ?", request.ID).Update()
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
			err := db.Create_request_item(h.DB, reqItem)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create request item"})
				return
			}
		}
	}
	c.JSON(http.StatusCreated, gin.H{"status": "checkout complete"})
}

// @Summary Review a request
// @Description Review/approve/deny a borrow request
// @Tags requests
// @Accept  json
// @Produce  json
// @Param id path int true "Request ID"
// @Param review body api_objects.RequestReview true "Review details"
// @Success 200 {object} db_models.RequestReview
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
	rev := &db_models.RequestReview{
		UserID:    req.UserID,
		RequestID: requestId,
		Outcome:   req.Outcome,
		Note:      req.Note,
	}
	err = db.Create_request_review(h.DB, rev)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if rev.Outcome == "Approved" {
		var request db_models.Request
		err := h.DB.Model(&request).
			Relation("RequestItems.Inventory").
			Where("id = ?", requestId).
			Select()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

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
	c.JSON(http.StatusOK, rev)
}

func (h *Handler) PostMessage(c *gin.Context) {
	requestId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var msg api_objects.UserMessage
	if err = c.ShouldBindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error while parsing payload": err.Error()})
		return
	}
	dbMsg := db_models.UserRequestMessage{
		UserID:    msg.UserID,
		RequestID: requestId,
		Message:   msg.Message,
		TimeStamp: time.Now(),
	}
	err = db.CreateUserMessage(h.DB, &dbMsg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	c.JSON(http.StatusOK, msg)
}

// @Summary Create a new shelf
// @Description Create a new shelf in a room
// @Tags shelves
// @Accept  json
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Param buildingId path int true "Building ID"
// @Param roomId path int true "Room ID"
// @Param shelf body api_objects.ShelfRequest true "Shelf object"
// @Success 201 {object} db_models.Shelf
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
