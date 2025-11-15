package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
)

func (h *Handler) CreateBuilding(c *gin.Context) {
	var req api_objects.BuildingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newBuilding, err := db.CreateBuilding(h.DB, req.Name, req.Campus)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newBuilding)
}

func (h *Handler) CreateRoom(c *gin.Context) {
	var req api_objects.RoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newRoom, err := db.CreateRoom(h.DB, req.Name, req.Floor, req.Number, req.BuildingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newRoom)
}

func (h *Handler) CreateShelf(c *gin.Context) {
	var req api_objects.ShelfRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newShelf, err := db.CreateShelf(h.DB, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newShelf)
}
