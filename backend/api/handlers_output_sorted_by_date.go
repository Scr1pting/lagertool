package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
)

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

func (h *Handler) GetInventoryS(c *gin.Context) {
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
