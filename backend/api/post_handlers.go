package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) CreateBuilding(c *gin.Context) {
	var req BuildingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

}
