package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/db"
)

func (h *Handler) GetRoomsS(c *gin.Context) {
	var dbRes []db.Room
	err := h.DB.Model(&dbRes).Order("update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	var res []Room
	for _, item := range dbRes {
		res = append(res, Room{
			item.ID, item.Number, item.Floor, item.Name, item.Building.Name, item.UpdateDate,
		})
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetBuildingsS(c *gin.Context) {
	var dbRes []db.Building
	err := h.DB.Model(&dbRes).Order("update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	var res []Building
	for _, item := range dbRes {
		res = append(res, Building{
			item.ID, item.Name, item.Campus, item.UpdateDate,
		})
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetShelvesS(c *gin.Context) {
	var dbRes []db.Shelf
	err := h.DB.Model(&dbRes).Order("update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	var res []ShelfSorted
	for _, item := range dbRes {
		res = append(res, ShelfSorted{
			item.ID, item.Name, item.Room.Name, item.Room.Building.Name,
		})
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetInventoryS(c *gin.Context) {
	start, err := time.Parse(time.RFC3339, c.Param("start"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	end, err := time.Parse(time.RFC3339, c.Param("end"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	var dbRes []db.Inventory
	err = h.DB.Model(&dbRes).Order("update_date desc").Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	var res []InventorySorted
	for _, item := range dbRes {
		available, err := h.GetAvailable(item.ID, start, end)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		res = append(res, InventorySorted{
			item.ItemID, item.Item.Name, item.Amount, available, item.ShelfUnit.Column.Shelf.Room.Name, item.ShelfUnit.Column.Shelf.Room.Building.Name,
		})
	}
	c.JSON(http.StatusOK, res)
}
