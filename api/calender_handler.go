package api

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/util"
)

// GetDownloadICS godoc
// @Summary Download calendar file for a specific loan
// @Description Downloads an iCalendar (.ics) file for a specific loan containing a reminder to return the item
// @Tags calendar
// @Produce text/calendar
// @Param id path int true "Loan ID"
// @Success 200 {string} string "ICS file content"
// @Failure 400 {string} string "Invalid loan ID"
// @Router /calendar/{id} [get]
func (h *Handler) GetDownloadICS(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.String(http.StatusBadRequest, "invalid loan id")
	}
	loan, err := h.LocalGetLoanByID(id)
	if err != nil {
		return
	}
	item, err := h.LocalGetItemByID(loan.ItemID)
	if err != nil {
		return
	}
	end := loan.Until
	if loan.Returned {
		end = *loan.ReturnedAt
	}
	icsContent := util.GenerateICSContent(item.Name, "Return item", loan.Begin, end)

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.ics", strings.ReplaceAll(item.Name, " ", "_")))
	c.Header("Content-Type", "text/calendar; charset=utf-8")

	// Write ICS content
	c.String(http.StatusOK, icsContent)
}

// GetDownloadICSALL godoc
// @Summary Download calendar file for all loans
// @Description Downloads an iCalendar (.ics) file containing all loan records with reminders to return items
// @Tags calendar
// @Produce text/calendar
// @Success 200 {string} string "ICS file content with all loan events"
// @Router /calendar/all [get]
func (h *Handler) GetDownloadICSALL(c *gin.Context) {

	loans, err := h.LocalGetAllLoans()
	if err != nil {
		return
	}
	var events []util.Events
	for _, loan := range loans {
		item, err := h.LocalGetItemByID(loan.ItemID)
		if err != nil {
			return
		}
		end := loan.Until
		if loan.Returned {
			end = *loan.ReturnedAt
		}

		events = append(events, util.Events{loan.Begin, end, "Return Item", item.Name})
	}
	icsContent := util.GenerateICSForDates(events)

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.ics", strings.ReplaceAll(events[0].Description, " ", "_")))
	c.Header("Content-Type", "text/calendar; charset=utf-8")

	// Write ICS content
	c.String(http.StatusOK, icsContent)
}
