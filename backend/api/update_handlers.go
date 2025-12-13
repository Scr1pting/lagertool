package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
)

func (h *Handler) UpdateRequest(c *gin.Context) {
	var req api_objects.UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
}

func (h *Handler) UpdateLoan(c *gin.Context) {
	var req api_objects.UpdateLoan
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	//err =
}
