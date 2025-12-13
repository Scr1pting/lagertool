package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
)

func (h *Handler) UpdateRequest(c *gin.Context) {
	var req api_objects.UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := db.Update_Request(h.DB, req.RequestID, req.Outcome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, req)
}

func (h *Handler) UpdateLoan(c *gin.Context) {
	var req api_objects.UpdateLoan
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := db.Update_Loan(h.DB, req.LoanID, req.ReturnedAt, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, req)
}
