package api_objects

type BuildingRequest struct {
	Name   string `json:"name" binding:"required"`
	Campus string `json:"campus"`
}

type RoomRequest struct {
	Name       string `json:"name"`
	Floor      string `json:"floor" binding:"required"`
	Number     string `json:"number" binding:"required"`
	BuildingID int    `json:"building"  binding:"required"`
}

type ShelfElementRequest struct {
	ID   string `json:"id" binding:"required"`
	Type string `json:"type" binding:"required"`
}

type ColumnElementRequest struct {
	ID       string                `json:"id" binding:"required"`
	Elements []ShelfElementRequest `json:"elements" binding:"required"`
}

type ShelfRequest struct {
	ID         string                 `json:"id" binding:"required"`
	Name       string                 `json:"name" binding:"required"`
	BuildingID int                    `json:"buildingId" binding:"required"`
	RoomID     int                    `json:"roomId" binding:"required"`
	Columns    []ColumnElementRequest `json:"columns" binding:"required"`
	OwnedBy    int                    `json:"ownedBy" binding:"required"`
}

type CartRequest struct {
	InvItemID   int `json:"id" binding:"required"`
	NumSelected int `json:"numSelected" binding:"required"`
}

type InventoryItemRequest struct {
	Name         string `json:"name" binding:"required"`
	Amount       int    `json:"amount" binding:"required"`
	ShelfUnitID  string `json:"shelfUnitId" binding:"required"`
	IsConsumable bool   `json:"isConsumable" binding:"required"`
	Note         string `json:"note" binding:"required"`
}
