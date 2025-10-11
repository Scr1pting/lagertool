package api

import (
	"lagertool.com/main/db"
)

// ============================================================================
// LOCAL EVENT HANDLERS (for internal use and code reuse)
// ============================================================================

// Event operations

func (h *Handler) LocalGetAllEvents() ([]db.Event, error) {
	return db.GetAllEvents(h.DB)
}

func (h *Handler) LocalGetEventByID(id int) (*db.Event, error) {
	return db.GetEventByID(h.DB, id)
}

func (h *Handler) LocalCreateEvent(event *db.Event) error {
	return db.CreateEvent(h.DB, event)
}

func (h *Handler) LocalUpdateEvent(id int, event *db.Event) error {
	return db.UpdateEvent(h.DB, id, event)
}

func (h *Handler) LocalDeleteEvent(id int) error {
	return db.DeleteEvent(h.DB, id)
}

// EventHelper operations

func (h *Handler) LocalGetEventHelpers(eventID int) ([]db.EventHelper, error) {
	return db.GetEventHelpers(h.DB, eventID)
}

func (h *Handler) LocalAddEventHelper(helper *db.EventHelper) error {
	return db.AddEventHelper(h.DB, helper)
}

func (h *Handler) LocalRemoveEventHelper(id int) error {
	return db.RemoveEventHelper(h.DB, id)
}

func (h *Handler) LocalRemoveEventHelperByEventAndPerson(eventID, personID int) error {
	return db.RemoveEventHelperByEventAndPerson(h.DB, eventID, personID)
}

// EventLoan operations

func (h *Handler) LocalGetEventLoans(eventID int) ([]db.EventLoan, error) {
	return db.GetEventLoans(h.DB, eventID)
}

func (h *Handler) LocalGetActiveEventLoans(eventID int) ([]db.EventLoan, error) {
	return db.GetActiveEventLoans(h.DB, eventID)
}

func (h *Handler) LocalGetEventLoanByID(id int) (*db.EventLoan, error) {
	return db.GetEventLoanByID(h.DB, id)
}

func (h *Handler) LocalCreateEventLoan(loan *db.EventLoan) error {
	return db.CreateEventLoan(h.DB, loan)
}

func (h *Handler) LocalReturnEventLoan(id int) error {
	return db.ReturnEventLoan(h.DB, id)
}

func (h *Handler) LocalReturnAllEventLoans(eventID int) error {
	return db.ReturnAllEventLoans(h.DB, eventID)
}

func (h *Handler) LocalDeleteEventLoan(id int) error {
	return db.DeleteEventLoan(h.DB, id)
}

func (h *Handler) LocalGetEventLoansByPerson(personID int) ([]db.EventLoan, error) {
	return db.GetEventLoansByPerson(h.DB, personID)
}
