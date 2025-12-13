package api_objects

import (
	"lagertool.com/main/db_models"
)

type Shelves struct {
	ID       string             `json:"id"`
	Name     string             `json:"name"`
	Building db_models.Building `json:"building"`
	Room     db_models.Room     `json:"room"`
	Columns  []Columns          `json:"columns"`
}

type Columns struct {
	ID       string    `json:"id"`
	Elements []Element `json:"elements"`
}

type Element struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

type InventoryItem struct {
	ID        int                `json:"id"`
	Name      string             `json:"name"`
	Amount    int                `json:"amount"`
	Available int                `json:"available"`
	Building  db_models.Building `json:"building"`
	Room      db_models.Room     `json:"room"`
	ShelfID   string             `json:"shelfId"`
}

type InventoryItemWithShelf struct {
	InventoryItem
	Shelf Shelves `json:"shelf"`
}

type ShoppingCart struct {
	Organisation string     `json:"organisation"`
	Items        []CartItem `json:"items"`
}

type CartItem struct {
	InventoryItem
	AmountSelected int `json:"amountSelected"`
}

type Room struct {
	ID         int                `json:"id"`
	Number     string             `json:"number"`
	Floor      string             `json:"floor"`
	Name       string             `json:"name"`
	Building   db_models.Building `json:"building"`
	UpdateDate string             `json:"updateDate"`
}

type Building struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	//GPS        string   `json:"gps"`
	Campus     string `json:"campus"`
	UpdateDate string `json:"updateDate"`
}

type ShelfSorted struct {
	ID       string             `json:"id"`
	Name     string             `json:"name"`
	Room     db_models.Room     `json:"room"`
	Building db_models.Building `json:"building"`
}

type InventorySorted struct {
	ID           int                `json:"id"`
	Name         string             `json:"name"`
	Amount       int                `json:"amount"`
	Available    int                `json:"available"`
	RoomName     db_models.Room     `json:"room"`
	BuildingName db_models.Building `json:"building"`
}
