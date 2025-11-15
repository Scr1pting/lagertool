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

func (h *Handler) GetShelves(c *gin.Context) {
	var res []api_objects.Shelves
	var dbRes []db.Shelf
	err := h.DB.Model(&dbRes).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, shelf := range dbRes {
		shelfObj, err2 := h.GetShelfHelper(shelf.ID)
		if err2 != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err2.Error()})
			return
		}
		res = append(res, shelfObj)
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetItem(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id")) //the id should be the id of the inventory entry
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	start, err := time.Parse("2006-01-02", c.Param("start"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	end, err := time.Parse("2006-01-02", c.Param("end"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	invItem, err := h.GetInventoryItemHelper(id, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	shelf, err := h.GetShelfHelper(invItem.ShelfID)

	res := api_objects.InventoryItemWithShelf{
		invItem, shelf,
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetOrganisations(c *gin.Context) {
	var organisations []db.Organisation
	err := h.DB.Model(&organisations).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, organisations)
}

func (h *Handler) GetShoppingCart(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id")) //the id should be the id of the inventory entry
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	start, err := time.Parse("2006-01-02", c.Param("start"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	end, err := time.Parse("2006-01-02", c.Param("end"))
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
