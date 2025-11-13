package db

import (
	"net"
	"time"
)

type Organisation struct {
	ID   int    `json:"id" pg:"id,pk"`
	Name string `json:"name" pg:"name"`
}

type User struct {
	tableName    struct{}  `pg:"user"`
	ID           int       `json:"id" pg:"id,pk"`
	Subject      string    `json:"subject" pg:"subject"`
	Issuer       string    `json:"issuer" pg:"issuer"`
	Email        string    `json:"email" pg:"email"`
	Name         string    `json:"name" pg:"name"`
	AccessToken  string    `json:"access_token" pg:"access_token"`
	RefreshToken string    `json:"refresh_token" pg:"refresh_token"`
	CreatedAt    time.Time `json:"created_at" pg:"created_at"`
	LastLogin    time.Time `json:"last_login" pg:"last_login"`

	//ShoppingCart *ShoppingCart `json:"shopping_cart" pg:"rel:has-one"`
}

type Session struct {
	tableName struct{}  `pg:"session"`
	ID        int       `json:"session_id" pg:"session_id"`
	UserID    int       `json:"user_id" pg:"user_id"`
	CreatedAt time.Time `json:"created_at" pg:"created_at"`
	ExpiresAt time.Time `json:"expires_at" pg:"expires_at"`
	UserIP    net.IP    `json:"user_ip" pg:"user_ip"`

	User *User `json:"user" pg:"rel:has-one,fk:user_id"`
}

type HasSpecialRightsFor struct {
	tableName      struct{} `pg:"has_special_rights_for"`
	OrganisationID int      `json:"organisation-id" pg:"organisation_id, pk"`
	UserID         int      `json:"user_id" pg:"user_id, pk"`

	Organisation *Organisation `json:"organisation" pg:"rel:has-one,fk:organisation_id"`
	User         *User         `json:"user" pg:"rel:has-one,fk:user_id"`
}

type Building struct {
	tableName  struct{}  `pg:"building"`
	ID         int       `json:"id" pg:"id,pk"`
	Name       string    `json:"name" pg:"name"`
	GPS        string    `json:"gps" pg:"gps"`
	Campus     string    `json:"campus" pg:"campus"`
	UpdateDate time.Time `json:"update_date" pg:"update_date"`
}

type Room struct {
	tableName  struct{}  `pg:"room"`
	ID         int       `json:"id" pg:"id,pk"`
	Number     string    `json:"number" pg:"number"`
	Floor      string    `json:"floor" pg:"floor"`
	Name       string    `json:"name" pg:"name"`
	BuildingID int       `json:"building_id" pg:"building_id"`
	UpdateDate time.Time `json:"update_date" pg:"update_date"`

	Building *Building `json:"building" pg:"rel:has-one,fk:building_id"`
}

type Shelf struct {
	tableName  struct{}  `pg:"shelf"`
	ID         string    `json:"id" pg:"id,pk"`
	Name       string    `json:"name" pg:"name"`
	OwnedBy    int       `json:"owned_by" pg:"owned_by"`
	RoomID     int       `json:"room_id" pg:"room_id"`
	UpdateDate time.Time `json:"update_date" pg:"update_date"`

	Room         *Room         `json:"room" pg:"rel:has-one,fk:room_id"`
	Organisation *Organisation `json:"organisation" pg:"rel:has-one,fk:owned_by"`
	Columns      []Column      `json:"columns" pg:"rel:has-many"`
}

type Column struct {
	tableName struct{} `pg:"column"`
	ID        string   `json:"id" pg:"id,pk"`
	ShelfID   string   `json:"shelf_id" pg:"shelf_id"`

	Shelf      *Shelf      `json:"shelf" pg:"rel:has-one,fk:shelf_id"`
	ShelfUnits []ShelfUnit `json:"shelf_units" pg:"rel:has-many,fk:column_id"`
}
type ShelfUnit struct { //it is also the new LOCATION
	tableName        struct{} `pg:"shelf_unit"`
	ID               string   `json:"id" pg:"id,pk"`
	Type             int      `json:"type" pg:"type"`                             //0 is small, 1 is big
	PositionInColumn int      `json:"position_in_column" pg:"position_in_column"` //to change the order of the units in the column later
	ColumnID         string   `json:"column_id" pg:"column_id"`
	Description      string   `json:"description" pg:"description"`

	Column *Column `json:"column" pg:"rel:has-one,fk:column_id"`
}

type Item struct {
	tableName struct{} `pg:"item"`
	ID        int      `json:"id" pg:"id,pk"`
	Name      string   `json:"name" pg:"name"`
	//Description  string   `json:"description" pg:"description"`
	//Category     string   `json:"category" pg:"category"`
	IsConsumable bool `json:"is_consumable" pg:"is_consumable"`
}

//type NonConsumable struct { //This should be implemented into the logic not in the database
//	tableName struct{} `pg:"non_consumable"`
//	ID        int      `json:"id" pg:"id,pk"`
//	ItemID    int      `json:"item_id" pg:"item_id"`
//
//	Item *Item `json:"item" pg:"rel:has-one,fk:item_id"`
//}
//
//type Consumable struct {
//	tableName struct{} `pg:"consumable"`
//	ID        int      `json:"id" pg:"id,pk"`
//	ItemID    int      `json:"item_id" pg:"item_id"`
//
//	Item *Item `json:"item" pg:"rel:has-one,fk:item_id"`
//}

type ShoppingCart struct {
	tableName struct{} `pg:"shopping_cart"`
	UserID    int      `json:"user_id" pg:"user_id"`
	ID        int      `json:"id" pg:"id,pk"`

	ShoppingCartItems []ShoppingCartItem `json:"shopping_cart_items" pg:"rel:has-many,fk:shopping_cart_id"`
}

type ShoppingCartItem struct {
	ID             int `json:"id" pg:"id,pk"`
	Amount         int `json:"amount" pg:"amount"`
	InventoryID    int `json:"inventory_id" pg:"inventory_id"`
	ShoppingCartID int `json:"shopping_cart_id" pg:"shopping_cart_id"`

	Inventory    *Inventory   `json:"inventory" pg:"rel:has-one,fk:inventory_id"`
	ShoppingCart ShoppingCart `json:"shopping_cart" pg:"rel:has-one,fk:shopping_cart_id"`
}

type Inventory struct {
	tableName   struct{}  `pg:"Inventory"`
	ID          int       `json:"id" pg:"id,pk"`
	ItemID      int       `json:"item_id" pg:"item_id"`
	ShelfUnitID string    `json:"shelf_unit_id" pg:"shelf_unit_id"`
	Amount      int       `json:"amount" pg:"amount"`
	UpdateDate  time.Time `json:"update_date" pg:"update_date"`

	Item         *Item          `json:"item" pg:"rel:has-one,fk:item_id"`
	ShelfUnit    *ShelfUnit     `json:"shelf_unit" pg:"rel:has-one,fk:shelf_unit_id"`
	RequestItems []RequestItems `json:"request_item" pg:"rel:has-many,fk:inventory_id"`
}

type Request struct {
	tableName struct{}  `pg:"request"`
	ID        int       `json:"id" pg:"id,pk"`
	UserID    int       `json:"user_id" pg:"user_id"`
	StartDate time.Time `json:"start_date" pg:"start_date"`
	EndDate   time.Time `json:"end_date" pg:"end_date"`
	Note      string    `json:"note" pg:"note"`
	Status    string    `json:"status" pg:"status"`

	User *User `json:"user" pg:"rel:has-one,fk:user_id"`
}

type RequestItems struct {
	tableName   struct{} `pg:"request_items"`
	ID          int      `json:"id" pg:"id,pk"`
	RequestID   int      `json:"request_id" pg:"request_id"`
	InventoryID int      `json:"inventory_id" pg:"inventory_id"`
	Amount      int      `json:"amount" pg:"amount"`

	Request   *Request   `json:"request" pg:"rel:has-one,fk:request_id"`
	Inventory *Inventory `json:"inventory" pg:"rel:has-one,fk:inventory_id"`
}
type RequestReview struct {
	tableName struct{} `pg:"request_review"`
	UserID    int      `json:"user_id" pg:"user_id"`
	RequestID int      `json:"request_id" pg:"request_id"`
	Outcome   string   `json:"outcome" pg:"outcome"`
	Note      string   `json:"note" pg:"note"`

	User    *User    `json:"user" pg:"rel:has-one,fk:user_id"`
	Request *Request `json:"request" pg:"rel:has-one,fk:request_id"`
}

type Loans struct {
	tableName     struct{}  `pg:"loans"`
	ID            int       `json:"id" pg:"id,pk"`
	RequestItemID int       `json:"request_item_id" pg:"request_item_id"`
	IsReturned    bool      `json:"returned" pg:"returned,use_zero"`
	ReturnedAt    time.Time `json:"returned_at,omitempty" pg:"returned_at"`

	RequestItems *RequestItems `pg:"rel:belongs-to,fk:request_item_id"`
}

type Consumed struct {
	tableName     struct{} `pg:"consumed"`
	ID            int      `json:"id" pg:"id,pk"`
	RequestItemID int      `json:"request_item_id" pg:"request_item_id"`

	RequestItems *RequestItems `json:"request_items" pg:"rel:belongs-to,fk:request_item_id"`
}
