package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/config"
	"lagertool.com/main/db"
)

type Handler struct {
	DB  *pg.DB
	Cfg *config.Config
}

func NewHandler(db *pg.DB, cfg *config.Config) *Handler {
	return &Handler{DB: db, Cfg: cfg}
}

// @Summary Get all shelves
// @Description Get all shelves
// @Tags shelves
// @Produce  json
// @Success 200 {array} api_objects.Shelves
// @Router /shelves [get]
func (h *Handler) GetShelves(c *gin.Context) {
	organisation := c.Query("organisation")
	if organisation == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No organisation"})
		return
	}
	var res []api_objects.Shelves
	var dbRes []db.Shelf
	err := h.DB.Model(&dbRes).Select()
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
// @Param start path string true "Start date in format 2006-01-02"
// @Param end path string true "End date in format 2006-01-02"
// @Success 200 {object} api_objects.InventoryItemWithShelf
// @Router /item/{id}/{start}/{end} [get]
func (h *Handler) GetItem(c *gin.Context) {
	organisation := c.Query("organisation")
	if organisation == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No organisation"})
		return
	}
	id, err := strconv.Atoi(c.Query("id")) //the id should be the id of the inventory entry
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	start, err := time.Parse("2006-01-02", c.Query("start"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	end, err := time.Parse("2006-01-02", c.Query("end"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	invItem, err := h.GetInventoryItemHelper(id, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	shelf, err := h.GetShelfHelper(invItem.ShelfID, organisation)

	res := api_objects.InventoryItemWithShelf{
		invItem, shelf,
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get all organisations
// @Description Get all organisations
// @Tags organisations
// @Produce  json
// @Success 200 {array} db.Organisation
// @Router /organisations [get]
func (h *Handler) GetOrganisations(c *gin.Context) {
	var organisations []db.Organisation
	err := h.DB.Model(&organisations).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, organisations)
}

// @Summary Get a user's shopping cart
// @Description Get a user's shopping cart
// @Tags shopping_cart
// @Produce  json
// @Param id path int true "User ID"
// @Param start path string true "Start date in format 2006-01-02"
// @Param end path string true "End date in format 2006-01-02"
// @Success 200 {object} map[string][]api_objects.CartItem
// @Router /shopping_cart/{id}/{start}/{end} [get]
func (h *Handler) GetShoppingCart(c *gin.Context) {
	id, err := strconv.Atoi(c.Query("userID")) //the id should be the id of the inventory entry
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	start, err := time.Parse("2006-01-02", c.Query("start"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	end, err := time.Parse("2006-01-02", c.Query("end"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var shoppingCart db.ShoppingCart
	err = h.DB.Model(&shoppingCart).
		Relation("ShoppingCartItems.Inventory.Item").
		Relation("ShoppingCartItems.Inventory.ShelfUnit.Column.Shelf.Room").
		Relation("ShoppingCartItems.Inventory.ShelfUnit.Column.Shelf.Organisation").
		Where("user_id = ?", id).
		Select()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	m := make(map[string][]api_objects.CartItem)
	for _, item := range shoppingCart.ShoppingCartItems {
		if item.Inventory.ShelfUnit.Column.Shelf.Room.Building == nil {
			var building db.Building
			err = h.DB.Model(&building).
				Where("id = ?", item.Inventory.ShelfUnit.Column.Shelf.Room.BuildingID).
				Select()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			item.Inventory.ShelfUnit.Column.Shelf.Room.Building = &building
		}

		var ci api_objects.CartItem
		ci.ID = item.Inventory.ItemID
		ci.Name = item.Inventory.Item.Name
		ci.Amount = item.Inventory.Amount
		ci.Available, err = h.GetAvailable(item.Inventory.ItemID, start, end)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if item.Inventory.ShelfUnit.Column.Shelf.Room.Name != "" {
			ci.RoomName = item.Inventory.ShelfUnit.Column.Shelf.Room.Name
		} else {
			ci.RoomName = item.Inventory.ShelfUnit.Column.Shelf.Room.Floor + item.Inventory.ShelfUnit.Column.Shelf.Room.Number
		}
		ci.BuildingName = item.Inventory.ShelfUnit.Column.Shelf.Room.Building.Name
		ci.ShelfID = item.Inventory.ShelfUnit.Column.Shelf.ID
		ci.AmountSelected = item.Amount
		m[item.Inventory.ShelfUnit.Column.Shelf.Organisation.Name] = append(m[item.Inventory.ShelfUnit.Column.Shelf.Organisation.Name], ci)
	}
	c.JSON(http.StatusOK, m)
}
