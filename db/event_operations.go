package db

import (
	"time"

	"github.com/go-pg/pg/v10"
)

// Event-related database operations

// GetAllEvents retrieves all events from the database
func GetAllEvents(db *pg.DB) ([]Event, error) {
	var events []Event
	err := db.Model(&events).Select()
	return events, err
}

// GetEventByID retrieves a specific event by ID
func GetEventByID(db *pg.DB, id int) (*Event, error) {
	event := &Event{ID: id}
	err := db.Model(event).WherePK().Select()
	return event, err
}

// CreateEvent creates a new event
func CreateEvent(db *pg.DB, event *Event) error {
	_, err := db.Model(event).Insert()
	return err
}

// UpdateEvent updates an existing event
func UpdateEvent(db *pg.DB, id int, event *Event) error {
	event.ID = id
	_, err := db.Model(event).WherePK().Update()
	return err
}

// DeleteEvent deletes an event by ID
func DeleteEvent(db *pg.DB, id int) error {
	event := &Event{ID: id}
	_, err := db.Model(event).WherePK().Delete()
	return err
}

// EventHelper-related database operations

// GetEventHelpers retrieves all helpers for a specific event
func GetEventHelpers(db *pg.DB, eventID int) ([]EventHelper, error) {
	var helpers []EventHelper
	err := db.Model(&helpers).Where("event_id = ?", eventID).Select()
	return helpers, err
}

// AddEventHelper adds a person as a helper to an event
func AddEventHelper(db *pg.DB, helper *EventHelper) error {
	_, err := db.Model(helper).Insert()
	return err
}

// RemoveEventHelper removes a helper from an event
func RemoveEventHelper(db *pg.DB, id int) error {
	helper := &EventHelper{ID: id}
	_, err := db.Model(helper).WherePK().Delete()
	return err
}

// RemoveEventHelperByEventAndPerson removes a helper by event and person IDs
func RemoveEventHelperByEventAndPerson(db *pg.DB, eventID, personID int) error {
	_, err := db.Model(&EventHelper{}).
		Where("event_id = ? AND person_id = ?", eventID, personID).
		Delete()
	return err
}

// EventLoan-related database operations

// GetEventLoans retrieves all loans for a specific event
func GetEventLoans(db *pg.DB, eventID int) ([]EventLoan, error) {
	var loans []EventLoan
	err := db.Model(&loans).Where("event_id = ?", eventID).Select()
	return loans, err
}

// GetActiveEventLoans retrieves all unreturned loans for a specific event
func GetActiveEventLoans(db *pg.DB, eventID int) ([]EventLoan, error) {
	var loans []EventLoan
	err := db.Model(&loans).
		Where("event_id = ? AND returned_at IS NULL", eventID).
		Select()
	return loans, err
}

// GetEventLoanByID retrieves a specific event loan by ID
func GetEventLoanByID(db *pg.DB, id int) (*EventLoan, error) {
	loan := &EventLoan{ID: id}
	err := db.Model(loan).WherePK().Select()
	return loan, err
}

// CreateEventLoan creates a new event loan (borrow for event)
func CreateEventLoan(db *pg.DB, loan *EventLoan) error {
	_, err := db.Model(loan).Insert()
	return err
}

// ReturnEventLoan marks an event loan as returned
func ReturnEventLoan(db *pg.DB, id int) error {
	now := time.Now()
	loan := &EventLoan{ID: id}
	_, err := db.Model(loan).
		Set("returned_at = ?", now).
		WherePK().
		Update()
	return err
}

// ReturnAllEventLoans marks all unreturned loans for an event as returned
func ReturnAllEventLoans(db *pg.DB, eventID int) error {
	now := time.Now()
	_, err := db.Model(&EventLoan{}).
		Set("returned_at = ?", now).
		Where("event_id = ? AND returned_at IS NULL", eventID).
		Update()
	return err
}

// DeleteEventLoan deletes an event loan by ID
func DeleteEventLoan(db *pg.DB, id int) error {
	loan := &EventLoan{ID: id}
	_, err := db.Model(loan).WherePK().Delete()
	return err
}

// GetEventLoansByPerson retrieves all event loans for a specific person
func GetEventLoansByPerson(db *pg.DB, personID int) ([]EventLoan, error) {
	var loans []EventLoan
	err := db.Model(&loans).Where("person_id = ?", personID).Select()
	return loans, err
}
