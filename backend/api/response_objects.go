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

type Room struct {
	ID           int    `json:"id"`
	Number       string `json:"number"`
	Floor        string `json:"floor"`
	Name         string `json:"name"`
	BuildingName string `json:"building_name"`
	UpdateDate   string `json:"update_date"`
}

type Building struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	//GPS        string   `json:"gps"`
	Campus     string `json:"campus"`
	UpdateDate string `json:"update_date"`
}

type ShelfSorted struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	RoomName     string `json:"room_name"`
	BuildingName string `json:"building_name"`
}

type InventorySorted struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Amount       int    `json:"amount"`
	Available    int    `json:"available"`
	RoomName     string `json:"room_name"`
	BuildingName string `json:"building_name"`
}
