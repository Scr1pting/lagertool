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
		shelfObj, err2 := h.GetShelfHelper(shelf.ID)
		if err2 != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err2.Error()})
		}
		res = append(res, shelfObj)
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetItem(c *gin.Context) {
	//id := c.Param("id") //the id should be the id of the inventory entry
	//var item Item
	//var dbItem []db.Inventory
	//err := h.DB.Model(&dbItem).Where("id = ?", id).Select()
	//item.Name = dbItem.Name
	//item.ID = dbItem.ID
	//item.IsConsumable = dbItem.IsConsumable
	//shelf, err := h.GetShelfHelper(dbItem.)
	//if err != nil {
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": err})
	//}
	//item.Shelf = shelf
	//c.JSON(http.StatusOK, item)
}
