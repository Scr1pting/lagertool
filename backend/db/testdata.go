package db

import (
	"net"
	"time"
)

func GetDummyData() (
	*Organisation,
	*User,
	*Session,
	*Building,
	*Room,
	*Shelf,
	[]Column,
	[]ShelfUnit,
	*Item,
	*Inventory,
	*ShoppingCart,
	[]ShoppingCartItem,
	*Request,
	[]RequestItems,
	*RequestReview,
	*Loans,
	*Consumed,
) {
	now := time.Now()

	// 1️⃣ Organisation
	org := &Organisation{
		Name: "OpenAI Research Labs",
	}

	// 2️⃣ User
	user := &User{
		ID:           1,
		Subject:      "sub-123",
		Issuer:       "auth0",
		Email:        "user@example.com",
		Name:         "John Doe",
		AccessToken:  "access_token_123",
		RefreshToken: "refresh_token_456",
		CreatedAt:    now.Add(-48 * time.Hour),
		LastLogin:    now.Add(-2 * time.Hour),
	}

	// 3️⃣ Session
	session := &Session{
		ID:        1,
		UserID:    user.ID,
		CreatedAt: now.Add(-2 * time.Hour),
		ExpiresAt: now.Add(24 * time.Hour),
		UserIP:    net.ParseIP("192.168.1.10"),
		User:      user,
	}

	// 4️⃣ Building + Room
	building := &Building{
		ID:         1,
		Name:       "Science Building",
		GPS:        "37.7749,-122.4194",
		Campus:     "Main Campus",
		UpdateDate: now,
	}

	room := &Room{
		ID:         1,
		Number:     "B101",
		Floor:      "1",
		Name:       "Chemistry Lab",
		BuildingID: building.ID,
		UpdateDate: now,
		Building:   building,
	}

	// 5️⃣ Shelf + Columns + ShelfUnits
	shelf := &Shelf{
		ID:           "S-001",
		Name:         "Chemical Storage Shelf",
		OwnedBy:      org.Name,
		RoomID:       room.ID,
		UpdateDate:   now,
		Room:         room,
		Organisation: org,
	}

	columns := []Column{
		{ID: "C-001", ShelfID: shelf.ID, Shelf: shelf},
		{ID: "C-002", ShelfID: shelf.ID, Shelf: shelf},
	}

	shelfUnits := []ShelfUnit{
		{ID: "U-001", Type: 0, PositionInColumn: 1, ColumnID: columns[0].ID, Column: &columns[0], Description: "Small bin for beakers"},
		{ID: "U-002", Type: 1, PositionInColumn: 2, ColumnID: columns[0].ID, Column: &columns[0], Description: "Large bin for glassware"},
	}

	// Link ShelfUnits to Columns
	columns[0].ShelfUnits = []ShelfUnit{shelfUnits[0], shelfUnits[1]}
	columns[1].ShelfUnits = []ShelfUnit{} // empty column
	shelf.Columns = columns

	// 6️⃣ Item
	item := &Item{
		ID:           1,
		Name:         "Beaker Set 500ml",
		IsConsumable: false,
	}

	// 7️⃣ Inventory
	inventory := &Inventory{
		ID:          1,
		ItemID:      item.ID,
		ShelfUnitID: shelfUnits[0].ID,
		Amount:      12,
		UpdateDate:  now,
		Item:        item,
		ShelfUnit:   &shelfUnits[0],
	}

	// 8️⃣ ShoppingCart + Items
	shoppingCart := ShoppingCart{
		ID:     1,
		UserID: user.ID,
	}

	shoppingCartItems := []ShoppingCartItem{
		{
			ID:             1,
			Amount:         2,
			InventoryID:    inventory.ID,
			ShoppingCartID: shoppingCart.ID,
			Inventory:      inventory,
			ShoppingCart:   shoppingCart,
		},
	}
	shoppingCart.ShoppingCartItems = shoppingCartItems

	// 9️⃣ Request + RequestItems + Review
	request := &Request{
		ID:        1,
		UserID:    user.ID,
		StartDate: now,
		EndDate:   now.Add(48 * time.Hour),
		Note:      "Need lab glassware for experiment",
		Status:    "pending",
		User:      user,
	}

	requestItems := []RequestItems{
		{
			ID:          1,
			RequestID:   request.ID,
			InventoryID: inventory.ID,
			Amount:      2,
			Request:     request,
			Inventory:   inventory,
		},
	}

	requestReview := &RequestReview{
		UserID:    user.ID,
		RequestID: request.ID,
		Outcome:   "approved",
		Note:      "Approved by lab manager",
		User:      user,
		Request:   request,
	}

	// 🔟 Loans + Consumed
	loan := &Loans{
		ID:            1,
		RequestItemID: requestItems[0].ID,
		IsReturned:    false,
		RequestItems:  &requestItems[0],
	}

	consumed := &Consumed{
		ID:            1,
		RequestItemID: requestItems[0].ID,
		RequestItems:  &requestItems[0],
	}

	return org, user, session, building, room, shelf, columns, shelfUnits, item, inventory, &shoppingCart, shoppingCartItems, request, requestItems, requestReview, loan, consumed
}
