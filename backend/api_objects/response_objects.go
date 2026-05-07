package api_objects

import "time"

type Shelf struct {
	ID       string        `json:"id"`
	Name     string        `json:"name"`
	Building Building      `json:"building"`
	Room     Room          `json:"room"`
	Columns  []ShelfColumn `json:"columns"`
}

type ShelfColumn struct {
	ID       string         `json:"id"`
	Elements []ShelfElement `json:"elements"`
}

type ShelfElement struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

type InventoryItem struct {
	ID             int      `json:"id"`
	Name           string   `json:"name"`
	Amount         int      `json:"amount"`
	Available      int      `json:"available"`
	Building       Building `json:"building"`
	Room           Room     `json:"room"`
	ShelfID        string   `json:"shelfId"`
	ShelfElementID string   `json:"shelfElementId"`
}

type InventoryItemWithShelf struct {
	InventoryItem
	Shelf Shelf `json:"shelf"`
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
	ID         int      `json:"id"`
	Number     string   `json:"number"`
	Floor      string   `json:"floor"`
	Name       string   `json:"name"`
	Building   Building `json:"building"`
	UpdateDate string   `json:"updateDate"`
}

type Building struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Campus     string `json:"campus"`
	UpdateDate string `json:"updateDate"`
}

type ShelfSorted struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Room     Room     `json:"room"`
	Building Building `json:"building"`
}

type InventorySorted struct {
	ID             int      `json:"id"`
	Name           string   `json:"name"`
	Amount         int      `json:"amount"`
	Available      int      `json:"available"`
	Room           Room     `json:"room"`
	Building       Building `json:"building"`
	ShelfElementID string   `json:"shelfElementId"`
}

type Message struct {
	ID         int       `json:"id"`
	AuthorName string    `json:"authorName"`
	Message    string    `json:"message"`
	IsAdmin    bool      `json:"isAdmin"`
	State      string    `json:"state"`
	TimeStamp  time.Time `json:"timeStamp"`
}

type BorrowHistory struct {
	User       string    `json:"authorName"`
	Event      string    `json:"title"`
	StartedAt  time.Time `json:"startDate"`
	DueAt      time.Time `json:"endDate"`
	ReturnedAt time.Time `json:"returnedDate"`
	State      string    `json:"approvalState"`
	TimeState  string    `json:"timeState"`
	Amount     int       `json:"amount"`
}
