package db

import (
	"time"
)

// Event represents a scheduled event for which items can be borrowed
type Event struct {
	tableName   struct{}  `pg:"event"`
	ID          int       `json:"id" pg:"id,pk"`
	Name        string    `json:"name" pg:"name"`
	Description string    `json:"description,omitempty" pg:"description"`
	StartDate   time.Time `json:"start_date" pg:"start_date"`
	EndDate     time.Time `json:"end_date" pg:"end_date"`
	CreatedAt   time.Time `json:"created_at" pg:"created_at,default:now()"`
}

// EventHelper represents a person who can help organize and borrow items for an event
type EventHelper struct {
	tableName struct{} `pg:"event_helper"`
	ID        int      `json:"id" pg:"id,pk"`
	EventID   int      `json:"event_id" pg:"event_id,notnull"`
	PersonID  int      `json:"person_id" pg:"person_id,notnull"`
}

// EventLoan represents an item borrowed for a specific event
type EventLoan struct {
	tableName struct{}  `pg:"event_loan"`
	ID        int       `json:"id" pg:"id,pk"`
	EventID   int       `json:"event_id" pg:"event_id,notnull"`
	ItemID    int       `json:"item_id" pg:"item_id,notnull"`
	PersonID  int       `json:"person_id" pg:"person_id,notnull"` // Who borrowed it
	Amount    int       `json:"amount" pg:"amount,notnull"`
	BorrowedAt time.Time `json:"borrowed_at" pg:"borrowed_at,default:now()"`
	ReturnedAt *time.Time `json:"returned_at,omitempty" pg:"returned_at"` // NULL if not yet returned
}
