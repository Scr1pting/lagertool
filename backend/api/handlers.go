package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
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
	var res []Shelves
	var dbRes []db.Shelf
	err := h.DB.Model(&dbRes).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, shelf := range dbRes {
		var shelfObj Shelves
		shelfObj.ID = shelf.ID
		shelfObj.Name = shelf.Name
		if shelf.Room.Name != "" {
			shelfObj.RoomName = shelf.Room.Name
		} else {
			shelfObj.RoomName = shelf.Room.Floor + shelf.Room.Number
		}
		shelfObj.BuildingName = shelf.Room.Building.Name
		var col Columns
		for _, c := range *shelf.Columns {
			col.ID = c.ID
			var el Element
			for _, e := range *c.ShelfUnits {
				el.ID = e.ID
				if e.Type == 0 {
					el.Type = "slim"
				} else if e.Type == 1 {
					el.Type = "high"
				}
				col.Elements = append(col.Elements, el)
			}
			shelfObj.Columns = append(shelfObj.Columns, col)
		}
		res = append(res, shelfObj)
	}
}
