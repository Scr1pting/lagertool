package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db_models"
)

// @Summary Get all rooms for an organisation
// @Description Get all rooms sorted by update date
// @Tags rooms
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Success 200 {array} api_objects.Room
// @Router /organisations/{orgId}/rooms [get]
func (h *Handler) GetRooms(c *gin.Context) {
	orgId := c.Param("orgId")
	var dbRes []db_models.Room
	err := h.DB.Model(&dbRes).
		Column("room.*").
		Relation("Building").
		Join("JOIN shelf ON shelf.room_id = room.id").
		Where("shelf.owned_by = ?", orgId).
		GroupExpr("room.id, building.id").
		Order("room.update_date desc").
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var res []api_objects.Room
	for _, item := range dbRes {
		res = append(res, api_objects.Room{
			ID: item.ID, Number: item.Number, Floor: item.Floor, Name: item.Name, Building: *item.Building, UpdateDate: item.UpdateDate.Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get all buildings for an organisation
// @Description Get all buildings sorted by update date
// @Tags buildings
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Success 200 {array} api_objects.Building
// @Router /organisations/{orgId}/buildings [get]
func (h *Handler) GetBuildings(c *gin.Context) {
	orgId := c.Param("orgId")
	var dbRes []db_models.Building
	err := h.DB.Model(&dbRes).
		Join("JOIN room ON room.building_id = building.id").
		Join("JOIN shelf ON shelf.room_id = room.id").
		Where("shelf.owned_by = ?", orgId).
		GroupExpr("building.id").
		Order("building.update_date desc").
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var res []api_objects.Building
	for _, item := range dbRes {
		res = append(res, api_objects.Building{
			ID: item.ID, Name: item.Name, Campus: item.Campus, UpdateDate: item.UpdateDate.Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get all inventory items for an organisation
// @Description Get all inventory items sorted by update date
// @Tags inventory
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Param start query string true "Start date in format 2006-01-02"
// @Param end query string true "End date in format 2006-01-02"
// @Success 200 {array} api_objects.InventorySorted
// @Router /organisations/{orgId}/inventory [get]
func (h *Handler) GetInventory(c *gin.Context) {
	orgId := c.Param("orgId")
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
	// First, find inventory IDs that belong to this org via shelf ownership
	var inventoryIDs []int
	err = h.DB.Model((*db_models.Inventory)(nil)).
		Column("inventory.id").
		Join("JOIN shelf_unit ON shelf_unit.id = inventory.shelf_unit_id").
		Join("JOIN \"column\" ON \"column\".id = shelf_unit.column_id").
		Join("JOIN shelf ON shelf.id = \"column\".shelf_id").
		Where("shelf.owned_by = ?", orgId).
		Select(&inventoryIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(inventoryIDs) == 0 {
		c.JSON(http.StatusOK, []api_objects.InventorySorted{})
		return
	}

	var dbRes []db_models.Inventory
	err = h.DB.Model(&dbRes).
		Column("inventory.*").
		Relation("Item").
		Relation("ShelfUnit.Column.Shelf.Room.Building").
		Relation("ShelfUnit.Column.Shelf.Room").
		Where("inventory.id IN (?)", pg.In(inventoryIDs)).
		Order("inventory.update_date desc").
		Select()
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
			ID: item.ItemID, Name: item.Item.Name, Amount: item.Amount, Available: available, RoomName: *item.ShelfUnit.Column.Shelf.Room, BuildingName: *item.ShelfUnit.Column.Shelf.Room.Building,
		})
	}
	c.JSON(http.StatusOK, res)
}
