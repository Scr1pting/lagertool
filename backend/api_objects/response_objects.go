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
	ID          string  `json:"id"`
	Type        string  `json:"type"`
	Description *string `json:"description"` // null while the category is being generated
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
	IsConsumable   bool     `json:"isConsumable"`
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
	RequestID  int       `json:"requestId"`
	User       string    `json:"authorName"`
	Event      string    `json:"title"`
	StartedAt  time.Time `json:"startDate"`
	DueAt      time.Time `json:"endDate"`
	ReturnedAt time.Time `json:"returnedDate"`
	State      string    `json:"approvalState"`
	TimeState  string    `json:"timeState"`
	Amount     int       `json:"amount"`
}

type BorrowItem struct {
	InventoryItem
	Borrowed int `json:"borrowed"`
}

type BorrowMessage struct {
	ID      int    `json:"id"`
	Text    string `json:"text"`
	Author  string `json:"author"`
	IsAdmin bool   `json:"admin"`
}

type BorrowRequest struct {
	ID            int             `json:"id"`
	ApprovalState string          `json:"approvalState"`
	TimeState     string          `json:"timeState,omitempty"`
	Title         string          `json:"title"`
	Author        string          `json:"author"`
	Description   string          `json:"description,omitempty"`
	CreationDate  time.Time       `json:"creationDate"`
	StartDate     time.Time       `json:"startDate"`
	EndDate       time.Time       `json:"endDate"`
	PickedUpDate  *time.Time      `json:"pickedUpDate,omitempty"`
	ReturnedDate  *time.Time      `json:"returnedDate,omitempty"`
	Items         []BorrowItem    `json:"items"`
	Messages      []BorrowMessage `json:"messages"`
}

type Me struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	IsAdmin bool   `json:"isAdmin"`
}

// AmountConflict is returned (409) when an item's amount would drop below
// what requests hold at once; Affected are the requests holding it then.
type AmountConflict struct {
	Error     string            `json:"error"`
	Committed int               `json:"committed"`
	Affected  []AffectedRequest `json:"affected"`
}

type AffectedRequest struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Author    string    `json:"author"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	Amount    int       `json:"amount"`
}
