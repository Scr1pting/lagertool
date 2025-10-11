package db

import (
	"time"
)

type Location struct {
	tableName struct{} `pg:"location"`
	ID        int      `json:"id" pg:"id,pk"`
	Campus    string   `json:"campus,omitempty" pg:"campus"`
	Building  string   `json:"building,omitempty" pg:"building"`
	Room      string   `json:"room,omitempty" pg:"room"`
	Shelf     string   `json:"shelf,omitempty" pg:"shelf"`
	ShelfUnit string   `json:"shelfunit,omitempty" pg:"shelfunit"`
}

type Item struct {
	tableName struct{} `pg:"item"`
	ID        int      `json:"id" pg:"id,pk"`
	Name      string   `json:"name" pg:"name"`
	Category  string   `json:"category" pg:"category"`
}

type IsIn struct {
	tableName  struct{} `pg:"is_in"`
	ID         int      `json:"id" pg:"id,pk"`
	LocationId int      `json:"location_id" pg:"location_id,fk"`
	ItemId     int      `json:"item_id" pg:"item_id,fk"`
	Amount     int      `json:"amount" pg:"amount"`
	Note       string   `json:"note" pg:"note"`
}

type Person struct {
	tableName struct{} `pg:"person"`
	ID        int      `json:"id" pg:"id,pk"`
	Firstname string   `json:"firstname" pg:"firstname"`
	Lastname  string   `json:"lastname" pg:"lastname"`
	SlackID   string   `json:"slack_id" pg:"slack_id"`
	// Slack Information missing
}

type Loans struct {
	tableName struct{}  `pg:"loans"`
	ID        int       `json:"id" pg:"id,pk"`
	PersonId  int       `json:"person_id" pg:"person_id,fk"`
	ItemID    int       `json:"item_id" pg:"item_id,fk"`
	Amount    int       `json:"amount" pg:"amount"`
	Begin     time.Time `json:"begin" pg:"begin"`
	Until     time.Time `json:"until,omitempty" pg:"until"`
	// Permanent items should never have an undefined due date.
	// Consumables without a due date should periodically be subject to deletion.
}
