package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
	"lagertool.com/main/db_models"
)

// @Summary Update a request
// @Description Update the status of a request
// @Tags requests
// @Accept  json
// @Produce  json
// @Param id path int true "Request ID"
// @Param request body api_objects.UpdateRequest true "Update details"
// @Success 202
// @Router /requests/{id} [put]
func (h *Handler) UpdateRequest(c *gin.Context) {
	requestId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var req api_objects.UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err = db.UpdateRequest(h.DB, requestId, req.Outcome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, req)
}

// @Summary Update a loan
// @Description Mark a loan as returned
// @Tags loans
// @Accept  json
// @Produce  json
// @Param id path int true "Loan ID"
// @Param loan body api_objects.UpdateLoan true "Update details"
// @Success 202
// @Router /loans/{id} [put]
func (h *Handler) UpdateLoan(c *gin.Context) {
	loanId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid loan id"})
		return
	}
	var req api_objects.UpdateLoan
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err = db.UpdateLoan(h.DB, loanId, req.ReturnedAt, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, req)
}

// @Summary Bulk update loans for a request
// @Description Mark all loans for a given request as returned
// @Tags loans
// @Accept  json
// @Produce  json
// @Param id path int true "Request ID"
// @Param loan body api_objects.UpdateLoan true "Update details"
// @Success 202
// @Router /requests/{id}/loans [put]
func (h *Handler) UpdateLoanBulk(c *gin.Context) {
	requestId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid loan id"})
		return
	}
	var req api_objects.UpdateLoan
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var dbRes []db_models.Loans
	err = h.DB.Model(&dbRes).
		Where("request_item_id IN (SELECT id FROM request_items WHERE request_id = ?)", requestId).
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, loan := range dbRes {
		err = db.UpdateLoan(h.DB, loan.ID, req.ReturnedAt, true)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusAccepted, req)
}

// @Summary Update an inventory item
// @Description Update an inventory item's details
// @Tags items
// @Accept  json
// @Produce  json
// @Param id path int true "Inventory Item ID"
// @Param item body api_objects.UpdateItemRequest true "Update details"
// @Success 200 {object} db_models.Inventory
// @Router /organisations/{orgId}/items/{id} [put]
func (h *Handler) UpdateItem(c *gin.Context) {
	itemId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	var req api_objects.UpdateItemRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var inv db_models.Inventory
	err = h.DB.Model(&inv).Where("id = ?", itemId).Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}

	if req.Amount != nil {
		inv.Amount = *req.Amount
	}
	if req.Note != nil {
		inv.Note = *req.Note
	}
	if req.ShelfUnitID != nil {
		inv.ShelfUnitID = *req.ShelfUnitID
	}

	_, err = h.DB.Model(&inv).WherePK().Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, inv)
}

// @Summary Update a cart item
// @Description Update the amount of an item in a user's shopping cart
// @Tags cart
// @Accept  json
// @Produce  json
// @Param userId path int true "User ID"
// @Param itemId path int true "Inventory Item ID"
// @Param item body api_objects.UpdateCartItem true "Update details"
// @Success 200
// @Router /users/{userId}/cart/items/{itemId} [put]
func (h *Handler) UpdateCartItem(c *gin.Context) {
	itemId, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	userId, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	var req api_objects.UpdateCartItem
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var i db_models.ShoppingCart
	err = h.DB.Model(&i).Where("user_id = ?", userId).First()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"no matching cart found": err.Error()})
		return
	}

	var it db_models.ShoppingCartItem
	res, err := h.DB.Model(&it).Set("amount = ?", req.Amount).Where("inventory_id = ?", itemId).Where("shopping_cart_id = ?", i.ID).Update()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}
	c.JSON(http.StatusOK, res)
}
