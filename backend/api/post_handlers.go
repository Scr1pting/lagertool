package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/db"
)

func (h *Handler) CreateBuilding(c *gin.Context) {
	var req BuildingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.CreateBuilding(h.DB, req.Name, req.Campus); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	c.JSON(http.StatusCreated, gin.H{"building": req})
}

func (h *Handler) CreateRoom(c *gin.Context) {
	var req RoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	if err := db.CreateRoom(h.DB, req.Name, req.Floor, req.Number, req.Building); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	c.JSON(http.StatusCreated, gin.H{"building": req})
}
