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
// @Success 200 {array} api_objects.Shelves
// @Router /organisations/{orgId}/shelves [get]
func (h *Handler) GetShelves(c *gin.Context) {
	organisation := c.Param("orgId")
	var res []api_objects.Shelves
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
// @Router /items/{id} [get]
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
