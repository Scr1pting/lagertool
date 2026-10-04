package api_objects

import "time"

type BuildingRequest struct {
	Name   string `json:"name" binding:"required"`
	Campus string `json:"campus"`
}

type RoomRequest struct {
	Name   string `json:"name"`
	Floor  string `json:"floor" binding:"required"`
	Number string `json:"number" binding:"required"`
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
	ID      string                 `json:"id" binding:"required"`
	Name    string                 `json:"name" binding:"required"`
	Columns []ColumnElementRequest `json:"columns" binding:"required"`
}

type CartRequest struct {
	InvItemID   int `json:"id" binding:"required"`
	NumSelected int `json:"numSelected" binding:"required"`
}

type InventoryItemRequest struct {
	Name         string `json:"name" binding:"required"`
	Amount       int    `json:"amount" binding:"required"`
	ShelfUnitID  string `json:"shelfUnitId" binding:"required"`
	ShelfID      string `json:"shelfId" binding:"required"`
	IsConsumable bool   `json:"isConsumable"`
	Note         string `json:"note"`
}

type CheckoutRequest struct {
	StartDate   time.Time `json:"startDate" binding:"required"`
	EndDate     time.Time `json:"endDate" binding:"required"`
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
}

type RequestReview struct {
	UserID  int    `json:"user_id"` // Ignored when logged in: the reviewer is the session user.
	Outcome string `json:"outcome"`
	Note    string `json:"note"`
}

type RevertRequest struct {
	// The stage the request is expected to be in: "notPickedUp", "borrowed", "returned" or "rejected".
	From string `json:"from" binding:"required"`
}

type UpdateRequest struct {
	Outcome string `json:"outcome"`
}

type UpdateLoan struct {
	ReturnedAt time.Time `json:"returnedAt"`
}

type UpdateItemRequest struct {
	Name         *string `json:"name"`
	IsConsumable *bool   `json:"isConsumable"`
	Amount       *int    `json:"amount"`
	Note         *string `json:"note"`
	ShelfUnitID  *string `json:"shelfUnitId"`
	// Save even if the amount drops below what requests hold.
	Force bool `json:"force"`
}

type UserMessage struct {
	UserID  int    `json:"userId"` // Ignored when logged in: the author is the session user.
	Message string `json:"message"`
	// AsAdmin marks a message sent from the admin borrow requests page
	// rather than by the requester. Only admins may set it.
	AsAdmin bool `json:"asAdmin"`
}

type UpdateCartItem struct {
	Amount int `json:"amount"`
}

type InstantCheckoutRequest struct {
	InvItemID   int       `json:"id" binding:"required"`
	NumSelected int       `json:"numSelected" binding:"required,min=1"`
	StartDate   time.Time `json:"startDate" binding:"required"`
	EndDate     time.Time `json:"endDate" binding:"required"`
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
}
