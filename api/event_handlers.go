package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/db"
)

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// GetAllEvents godoc
// @Summary Get all events
// @Description Retrieve all events from the database
// @Tags events
// @Produce json
// @Success 200 {array} db.Event
// @Failure 500 {object} map[string]string
// @Router /events [get]
func (h *Handler) GetAllEvents(c *gin.Context) {
	events, err := db.GetAllEvents(h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, events)
}

// GetEventByID godoc
// @Summary Get event by ID
// @Description Retrieve a specific event by its ID
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Success 200 {object} db.Event
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /events/{id} [get]
func (h *Handler) GetEventByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	event, err := db.GetEventByID(h.DB, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	c.JSON(http.StatusOK, event)
}

// CreateEvent godoc
// @Summary Create a new event
// @Description Create a new event with the provided details. The ID is auto-generated and should not be included in the request body.
// @Tags events
// @Accept json
// @Produce json
// @Param event body db.Event true "Event object"
// @Success 201 {object} db.Event
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events [post]
func (h *Handler) CreateEvent(c *gin.Context) {
	var event db.Event
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate dates
	if event.EndDate.Before(event.StartDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be after start_date"})
		return
	}

	err := db.CreateEvent(h.DB, &event)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, event)
}

// UpdateEvent godoc
// @Summary Update an event
// @Description Update an existing event by ID. The ID in the request body is ignored; use the path parameter.
// @Tags events
// @Accept json
// @Produce json
// @Param id path int true "Event ID"
// @Param event body db.Event true "Event object"
// @Success 200 {object} db.Event
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id} [put]
func (h *Handler) UpdateEvent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var event db.Event
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate dates
	if event.EndDate.Before(event.StartDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be after start_date"})
		return
	}

	err = db.UpdateEvent(h.DB, id, &event)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	event.ID = id
	c.JSON(http.StatusOK, event)
}

// DeleteEvent godoc
// @Summary Delete an event
// @Description Delete an event by ID
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id} [delete]
func (h *Handler) DeleteEvent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	err = db.DeleteEvent(h.DB, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "event deleted successfully"})
}

// ============================================================================
// EVENT HELPER HANDLERS
// ============================================================================

// GetEventHelpers godoc
// @Summary Get all helpers for an event
// @Description Retrieve all persons who are helpers for a specific event
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Success 200 {array} db.EventHelper
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/helpers [get]
func (h *Handler) GetEventHelpers(c *gin.Context) {
	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	helpers, err := db.GetEventHelpers(h.DB, eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, helpers)
}

// AddEventHelper godoc
// @Summary Add a helper to an event
// @Description Add a person as a helper to an event, allowing them to borrow items for the event
// @Tags events
// @Accept json
// @Produce json
// @Param id path int true "Event ID"
// @Param helper body object{person_id=int} true "Helper object with person_id"
// @Success 201 {object} db.EventHelper
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/helpers [post]
func (h *Handler) AddEventHelper(c *gin.Context) {
	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		PersonID int `json:"person_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	helper := &db.EventHelper{
		EventID:  eventID,
		PersonID: req.PersonID,
	}

	err = db.AddEventHelper(h.DB, helper)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, helper)
}

// RemoveEventHelper godoc
// @Summary Remove a helper from an event
// @Description Remove a person from being a helper for an event
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Param person_id path int true "Person ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/helpers/{person_id} [delete]
func (h *Handler) RemoveEventHelper(c *gin.Context) {
	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	personID, err := strconv.Atoi(c.Param("person_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid person_id"})
		return
	}

	err = db.RemoveEventHelperByEventAndPerson(h.DB, eventID, personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "helper removed successfully"})
}

// ============================================================================
// EVENT LOAN HANDLERS
// ============================================================================

// GetEventLoans godoc
// @Summary Get all loans for an event
// @Description Retrieve all item loans (both active and returned) for a specific event
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Success 200 {array} db.EventLoan
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/loans [get]
func (h *Handler) GetEventLoans(c *gin.Context) {
	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	loans, err := db.GetEventLoans(h.DB, eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// GetActiveEventLoans godoc
// @Summary Get active loans for an event
// @Description Retrieve all unreturned item loans for a specific event
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Success 200 {array} db.EventLoan
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/loans/active [get]
func (h *Handler) GetActiveEventLoans(c *gin.Context) {
	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	loans, err := db.GetActiveEventLoans(h.DB, eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// CreateEventLoan godoc
// @Summary Borrow an item for an event
// @Description Create a new loan record for an item borrowed for an event
// @Tags events
// @Accept json
// @Produce json
// @Param id path int true "Event ID"
// @Param loan body object{item_id=int,person_id=int,amount=int} true "Loan object"
// @Success 201 {object} db.EventLoan
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/loans [post]
func (h *Handler) CreateEventLoan(c *gin.Context) {
	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		ItemID   int `json:"item_id" binding:"required"`
		PersonID int `json:"person_id" binding:"required"`
		Amount   int `json:"amount" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loan := &db.EventLoan{
		EventID:  eventID,
		ItemID:   req.ItemID,
		PersonID: req.PersonID,
		Amount:   req.Amount,
	}

	err = db.CreateEventLoan(h.DB, loan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, loan)
}

// ReturnEventLoan godoc
// @Summary Return a specific event loan
// @Description Mark a specific event loan as returned
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Param loan_id path int true "Event Loan ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/loans/{loan_id}/return [post]
func (h *Handler) ReturnEventLoan(c *gin.Context) {
	loanID, err := strconv.Atoi(c.Param("loan_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid loan_id"})
		return
	}

	err = db.ReturnEventLoan(h.DB, loanID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "loan returned successfully", "returned_at": time.Now()})
}

// ReturnAllEventLoans godoc
// @Summary Return all items for an event
// @Description Mark all unreturned loans for an event as returned at once
// @Tags events
// @Produce json
// @Param id path int true "Event ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /events/{id}/loans/return-all [post]
func (h *Handler) ReturnAllEventLoans(c *gin.Context) {
	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	err = db.ReturnAllEventLoans(h.DB, eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all event loans returned successfully", "returned_at": time.Now()})
}

// GetEventLoansByPerson godoc
// @Summary Get event loans by person
// @Description Retrieve all event loans for a specific person across all events
// @Tags events
// @Produce json
// @Param id path int true "Person ID"
// @Success 200 {array} db.EventLoan
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /persons/{id}/event-loans [get]
func (h *Handler) GetEventLoansByPerson(c *gin.Context) {
	personID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	loans, err := db.GetEventLoansByPerson(h.DB, personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}
