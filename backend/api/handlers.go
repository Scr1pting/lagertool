package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/config"
	"lagertool.com/main/db_models"
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
// @Param organisation query string true "Organisation name"
// @Success 200 {array} api_objects.Shelves
// @Router /shelves [get]
func (h *Handler) GetShelves(c *gin.Context) {
	organisation := c.Query("organisation")
	if organisation == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No organisation"})
		return
	}
	var res []api_objects.Shelves
	var dbRes []db_models.Shelf
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
// @Param organisation query string true "Organisation name"
// @Param id query int true "Inventory Item ID"
// @Param start query string true "Start date in format 2006-01-02"
// @Param end query string true "End date in format 2006-01-02"
// @Success 200 {object} api_objects.InventoryItemWithShelf
// @Router /item [get]
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
	var organisations []db_models.Organisation
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
// @Param userID query int true "User ID"
// @Param start query string true "Start date in format 2006-01-02"
// @Param end query string true "End date in format 2006-01-02"
// @Success 200 {object} map[string][]api_objects.CartItem
// @Router /shopping_cart [get]
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
	m, err := h.GetCartItemHelper(id, start, end)
	c.JSON(http.StatusOK, m)
}
