package db

import (
	"time"
)

// Shelf represents a physical shelf layout in a room
type Shelf struct {
	tableName struct{} `pg:"shelf"`
	ID        string   `json:"id" pg:"id,pk"`       // 5-letter unique ID from frontend
	Name      string   `json:"name" pg:"name"`
	Building  string   `json:"building" pg:"building"`
	Room      string   `json:"room" pg:"room"`
}

// Column represents a column in a shelf with an ID
type Column struct {
	tableName struct{} `pg:"column"`
	ID        string   `json:"id" pg:"id,pk"`       // Generated column ID from frontend
	ShelfID   string   `json:"shelf_id" pg:"shelf_id"`
}

// ShelfUnit represents an individual unit/element on a shelf
type ShelfUnit struct {
	tableName struct{} `pg:"shelf_unit"`
	ID        string   `json:"id" pg:"id,pk"`        // 5-letter unique ID from frontend
	ColumnID  string   `json:"column_id" pg:"column_id"`
	Type      string   `json:"type" pg:"type"`       // "high" or "slim"
}

// Location represents a specific shelf unit (for backward compatibility with Inventory)
type Location struct {
	tableName   struct{} `pg:"location"`
	ID          int      `json:"id" pg:"id,pk"`
	ShelfUnitID string   `json:"shelf_unit_id,omitempty" pg:"shelf_unit_id"` // Reference to ShelfUnit.ID
}

type Item struct {
	tableName struct{} `pg:"item"`
	ID        int      `json:"id" pg:"id,pk"`
	Name      string   `json:"name" pg:"name"`
	Category  string   `json:"category" pg:"category"`
}

type Person struct {
	tableName struct{} `pg:"person"`
	ID        int      `json:"id" pg:"id,pk"`
	Firstname string   `json:"firstname" pg:"firstname"`
	Lastname  string   `json:"lastname" pg:"lastname"`
	SlackID   string   `json:"slack_id,omitempty" pg:"slack_id"`
}
type Inventory struct {
	tableName  struct{} `pg:"inventory"`
	ID         int      `json:"id" pg:"id,pk"`
	LocationId int      `json:"location_id" pg:"location_id"`
	ItemId     int      `json:"item_id" pg:"item_id"`
	Amount     int      `json:"amount" pg:"amount"`
	Note       string   `json:"note" pg:"note"`
}

type Loans struct {
	tableName  struct{}   `pg:"loans"`
	ID         int        `json:"id" pg:"id,pk"`
	PersonID   int        `json:"person_id" pg:"person_id"`
	ItemID     int        `json:"item_id" pg:"item_id"`
	Amount     int        `json:"amount" pg:"amount"`
	Begin      time.Time  `json:"begin" pg:"begin"`
	Until      time.Time  `json:"until,omitempty" pg:"until"`
	Returned   bool       `json:"returned" pg:"returned,use_zero"`
	ReturnedAt *time.Time `json:"returned_at,omitempty" pg:"returned_at"`
}
