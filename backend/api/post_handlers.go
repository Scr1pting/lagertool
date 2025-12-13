package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
	"lagertool.com/main/db_models"
)

// @Summary Create a new building
// @Description Create a new building
// @Tags buildings
// @Accept  json
// @Produce  json
// @Param building body api_objects.BuildingRequest true "Building object"
// @Success 201 {object} db.Building
// @Router /create_building [post]
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
// @Description Create a new room
// @Tags rooms
// @Accept  json
// @Produce  json
// @Param room body api_objects.RoomRequest true "Room object"
// @Success 201 {object} db.Room
// @Router /create_room [post]
func (h *Handler) CreateRoom(c *gin.Context) {
	var req api_objects.RoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newRoom, err := db.CreateRoom(h.DB, req.Name, req.Floor, req.Number, req.BuildingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newRoom)
}

// @Summary Create a new shelf
// @Description Create a new shelf
// @Tags shelves
// @Accept  json
// @Produce  json
// @Param shelf body api_objects.ShelfRequest true "Shelf object"
// @Success 201 {object} db.Shelf
// @Router /create_shelf [post]
func (h *Handler) CreateShelf(c *gin.Context) {
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

	newShelf, err := db.CreateShelf(h.DB, req.ID, req.Name, req.OwnedBy, req.RoomID, columns)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newShelf)
}

// @Summary Add an item to the shopping cart
// @Description Add an item to the shopping cart
// @Tags shopping_cart
// @Accept  json
// @Produce  json
// @Param cart_item body api_objects.CartRequest true "Cart item object"
// @Success 201 {object} db.ShoppingCartItem
// @Router /add_item_to_cart [post]
func (h *Handler) CreateCartItem(c *gin.Context) {
	var req api_objects.CartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newCart, err := db.CreateCartItem(h.DB, req.InvItemID, req.NumSelected, 1) //TODO: user id is currently a dummy
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newCart)
}

// @Summary Create a new inventory item
// @Description Create a new inventory item
// @Tags items
// @Accept  json
// @Produce  json
// @Param item body api_objects.InventoryItemRequest true "Inventory item object"
// @Success 201 {object} db.Inventory
// @Router /create_item [post]
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

func (h *Handler) CheckoutCart(c *gin.Context) {
	var req api_objects.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	itemMap, err := h.GetCartItemHelper(req.CartID, req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for k, v := range itemMap {
		request := &db_models.Request{
			UserID:           req.UserID,
			StartDate:        req.StartDate,
			EndDate:          req.EndDate,
			Note:             "",
			Status:           "requested",
			OrganisationName: k,
		}
		err := db.Create_request(h.DB, request)
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
	c.JSON(http.StatusCreated, req)
}

func (h *Handler) RequestReview(c *gin.Context) {
	var req api_objects.RequestReview
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rev := &db_models.RequestReview{
		UserID:    req.UserID,
		RequestID: req.RequestID,
		Outcome:   req.Outcome,
		Note:      req.Note,
	}
	db.create_request_review(h.DB, rev)

	if rev.Outcome == "success" {
		for _, rItem := range rev.Request.RequestItems {
			if rItem.Inventory.Item.IsConsumable {
				cons := &db_models.Consumed{
					RequestItemID: rItem.ID,
				}
				db.create_consumable(h.DB, cons)
			} else {
				l := &db_models.Loans{
					RequestItemID: rItem.ID,
					IsReturned:    false,
					ReturnedAt:    time.Time{},
				}
				db.create_loan(h.DB, l)
			}
		}
	}
}
