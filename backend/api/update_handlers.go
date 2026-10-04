package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
	"lagertool.com/main/db_models"
)

// @Summary Update a loan
// @Description Mark a loan as returned Admin only.
// @Tags loans
// @Accept  json
// @Produce  json
// @Param id path int true "Loan ID"
// @Param loan body api_objects.UpdateLoan true "Update details"
// @Success 202
// @Failure 403 {object} map[string]string "Admin rights required"
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
// @Description Mark all loans for a given request as returned Admin only.
// @Tags loans
// @Accept  json
// @Produce  json
// @Param id path int true "Request ID"
// @Param loan body api_objects.UpdateLoan true "Update details"
// @Success 202
// @Failure 403 {object} map[string]string "Admin rights required"
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
// @Description Update an inventory item's details. Admin only. Lowering the amount below what requests hold at once is refused (409) unless force is set.
// @Tags items
// @Accept  json
// @Produce  json
// @Param id path int true "Inventory Item ID"
// @Param item body api_objects.UpdateItemRequest true "Update details"
// @Success 200 {object} db_models.Inventory
// @Failure 400 {object} map[string]string "Invalid body, empty name or unknown shelf unit"
// @Failure 403 {object} map[string]string "Admin rights required"
// @Failure 409 {object} api_objects.AmountConflict "Amount below what requests hold; resend with force"
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

	previousShelfUnitID := inv.ShelfUnitID
	previousAmount, previousConsumable := inv.Amount, inv.IsConsumable

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name must not be empty"})
			return
		}
		inv.Name = name
	}
	if req.IsConsumable != nil {
		inv.IsConsumable = *req.IsConsumable
	}
	if req.Amount != nil {
		inv.Amount = *req.Amount
	}
	if req.Note != nil {
		inv.Note = *req.Note
	}
	if req.ShelfUnitID != nil && *req.ShelfUnitID != inv.ShelfUnitID {
		// The item's shelf follows from the unit, so moving it can change both.
		var unit db_models.ShelfUnit
		err = h.DB.Model(&unit).Relation("Column").Where("shelf_unit.id = ?", *req.ShelfUnitID).Select()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "shelf unit not found"})
			return
		}
		inv.ShelfUnitID = unit.ID
		inv.ShelfID = unit.Column.ShelfID
	}

	// Lowering the amount below what requests hold needs confirmation (force):
	// it's allowed, since items do get lost, but the admin should know who's affected.
	if (inv.Amount != previousAmount || inv.IsConsumable != previousConsumable) && !req.Force {
		var withRequests db_models.Inventory
		err = h.DB.Model(&withRequests).Relation("RequestItems.Request.User").Where("inventory.id = ?", itemId).Select()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		withRequests.IsConsumable = inv.IsConsumable
		cs, err := loadCommitments(h.DB, withRequests)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if peak, affected := peakCommitment(cs, inv.IsConsumable, time.Now()); inv.Amount < peak {
			conflict := api_objects.AmountConflict{
				Error:     "requests hold " + strconv.Itoa(peak) + " of this item at once",
				Committed: peak,
				Affected:  make([]api_objects.AffectedRequest, len(affected)),
			}
			for i, a := range affected {
				conflict.Affected[i] = api_objects.AffectedRequest{
					ID: a.RequestID, Title: a.Title, Author: a.Author,
					StartDate: a.Start, EndDate: a.End, Amount: a.Amount,
				}
			}
			c.JSON(http.StatusConflict, conflict)
			return
		}
	}

	_, err = h.DB.Model(&inv).WherePK().Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Regenerate the new unit's description; if the item moved, also the
	// old one so it reflects the items left behind.
	if previousShelfUnitID != inv.ShelfUnitID {
		h.triggerRegenAsync(previousShelfUnitID, inv.ShelfUnitID)
	} else {
		h.triggerRegenAsync(inv.ShelfUnitID)
	}
	c.JSON(http.StatusOK, inv)
}

// @Summary Change an amount in my shopping cart
// @Description Updates the amount of an item in the logged-in user's cart.
// @Tags cart
// @Accept  json
// @Produce  json
// @Param itemId path int true "Inventory Item ID"
// @Param item body api_objects.UpdateCartItem true "New amount"
// @Success 200
// @Failure 401 {object} map[string]string "Not logged in"
// @Router /me/cart/items/{itemId} [put]
func (h *Handler) UpdateCartItem(c *gin.Context) {
	itemId, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	userId, ok := targetUserID(c)
	if !ok {
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
