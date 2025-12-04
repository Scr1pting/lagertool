package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
)

// @Summary Get all rooms sorted by update date
// @Description Get all rooms sorted by update date
// @Tags rooms
// @Produce  json
// @Success 200 {array} api_objects.Room
// @Router /rooms_sorted [get]
func (h *Handler) GetRoomsS(c *gin.Context) {
	var dbRes []db.Room
	err := h.DB.Model(&dbRes).Column("room.*").Relation("Building").Order("update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var res []api_objects.Room
	for _, item := range dbRes {
		res = append(res, api_objects.Room{
			item.ID, item.Number, item.Floor, item.Name, item.Building.Name, item.UpdateDate.Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get all buildings sorted by update date
// @Description Get all buildings sorted by update date
// @Tags buildings
// @Produce  json
// @Success 200 {array} api_objects.Building
// @Router /buildings_sorted [get]
func (h *Handler) GetBuildingsS(c *gin.Context) {
	var dbRes []db.Building
	err := h.DB.Model(&dbRes).Order("update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var res []api_objects.Building
	for _, item := range dbRes {
		res = append(res, api_objects.Building{
			item.ID, item.Name, item.Campus, item.UpdateDate.Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get all shelves sorted by update date
// @Description Get all shelves sorted by update date
// @Tags shelves
// @Produce  json
// @Success 200 {array} api_objects.ShelfSorted
// @Router /shelves_sorted [get]
func (h *Handler) GetShelvesS(c *gin.Context) {
	var dbRes []db.Shelf
	err := h.DB.Model(&dbRes).Relation("Room.Building").Order("update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var res []api_objects.ShelfSorted
	for _, item := range dbRes {
		res = append(res, api_objects.ShelfSorted{
			item.ID, item.Name, item.Room.Name, item.Room.Building.Name,
		})
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get all inventory items sorted by update date
// @Description Get all inventory items sorted by update date
// @Tags items
// @Produce  json
// @Param start path string true "Start date in format 2006-01-02"
// @Param end path string true "End date in format 2006-01-02"
// @Success 200 {array} api_objects.InventorySorted
// @Router /inventory_sorted/{start}/{end} [get]
func (h *Handler) GetInventoryS(c *gin.Context) {
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
	var dbRes []db.Inventory
	err = h.DB.Model(&dbRes).Column("inventory.*").Relation("Item").Relation("ShelfUnit.Column.Shelf.Room.Building").Relation("ShelfUnit.Column.Shelf.Room").Order("inventory.update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var res []api_objects.InventorySorted
	for _, item := range dbRes {
		available, err := h.GetAvailable(item.ID, start, end)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		res = append(res, api_objects.InventorySorted{
			item.ItemID, item.Item.Name, item.Amount, available, item.ShelfUnit.Column.Shelf.Room.Name, item.ShelfUnit.Column.Shelf.Room.Building.Name,
		})
	}
	c.JSON(http.StatusOK, res)
}
