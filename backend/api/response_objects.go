package api

type Shelves struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	BuildingName string    `json:"buildingName"`
	RoomName     string    `json:"roomName"`
	Columns      []Columns `json:"columns"`
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
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Amount       int    `json:"amount"`
	Available    int    `json:"available"`
	BuildingName string `json:"buildingName"`
	RoomName     string `json:"roomName"`
	ShelfID      string `json:"shelfId"`
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
	AmountSelected int `json:"amount_selected"`
}
