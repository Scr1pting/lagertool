package db

import (
	"net"
	"time"

	"lagertool.com/main/db_models"
)

func GetDummyData() (
	*db_models.Organisation,
	*db_models.User,
	*db_models.Session,
	*db_models.Building,
	*db_models.Room,
	*db_models.Shelf,
	[]db_models.Column,
	[]db_models.ShelfUnit,
	*db_models.Item,
	*db_models.Inventory,
	*db_models.ShoppingCart,
	[]db_models.ShoppingCartItem,
	*db_models.Request,
	[]db_models.RequestItems,
	*db_models.RequestReview,
	*db_models.Loans,
	*db_models.Consumed,
) {
	now := time.Now()

	// 1️⃣ Organisation
	org := &db_models.Organisation{
		Name: "VIS",
	}

	// 2️⃣ User
	user := &db_models.User{
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
	session := &db_models.Session{
		ID:        1,
		UserID:    user.ID,
		CreatedAt: now.Add(-2 * time.Hour),
		ExpiresAt: now.Add(24 * time.Hour),
		UserIP:    net.ParseIP("192.168.1.10"),
		User:      user,
	}

	// 4️⃣ Building + Room
	building := &db_models.Building{
		ID:         1,
		Name:       "Science Building",
		GPS:        "37.7749,-122.4194",
		Campus:     "Main Campus",
		UpdateDate: now,
	}

	room := &db_models.Room{
		ID:         1,
		Number:     "B101",
		Floor:      "1",
		Name:       "Chemistry Lab",
		BuildingID: building.ID,
		UpdateDate: now,
		Building:   building,
	}

	// 5️⃣ Shelf + Columns + ShelfUnits
	shelf := &db_models.Shelf{
		ID:           "S-001",
		Name:         "Chemical Storage Shelf",
		OwnedBy:      org.Name,
		RoomID:       room.ID,
		UpdateDate:   now,
		Room:         room,
		Organisation: org,
	}

	columns := []db_models.Column{
		{ID: "C-001", ShelfID: shelf.ID, Shelf: shelf},
		{ID: "C-002", ShelfID: shelf.ID, Shelf: shelf},
	}

	shelfUnits := []db_models.ShelfUnit{
		{ID: "U-001A", Type: 0, PositionInColumn: 1, ColumnID: columns[0].ID, Column: &columns[0], Description: "Small bin for beakers"},
		{ID: "U-002B", Type: 1, PositionInColumn: 1, ColumnID: columns[1].ID, Column: &columns[1], Description: "Tall slot for equipment cases"},
	}

	// Link ShelfUnits to Columns
	columns[0].ShelfUnits = []db_models.ShelfUnit{shelfUnits[0]}
	columns[1].ShelfUnits = []db_models.ShelfUnit{shelfUnits[1]}
	shelf.Columns = columns

	// 6️⃣ Item
	item := &db_models.Item{
		ID:           1,
		Name:         "Beaker Set 500ml",
		IsConsumable: false,
	}

	// 7️⃣ Inventory
	inventory := &db_models.Inventory{
		ID:          1,
		ItemID:      item.ID,
		ShelfUnitID: shelfUnits[0].ID,
		Amount:      12,
		UpdateDate:  now,
		Item:        item,
		ShelfUnit:   &shelfUnits[0],
	}

	// 8️⃣ ShoppingCart + Items
	shoppingCart := db_models.ShoppingCart{
		ID:     1,
		UserID: user.ID,
	}

	shoppingCartItems := []db_models.ShoppingCartItem{
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
	request := &db_models.Request{
		ID:        1,
		UserID:    user.ID,
		StartDate: now,
		EndDate:   now.Add(48 * time.Hour),
		Note:      "Need lab glassware for experiment",
		Status:    "pending",
		User:      user,
	}

	requestItems := []db_models.RequestItems{
		{
			ID:          1,
			RequestID:   request.ID,
			InventoryID: inventory.ID,
			Amount:      2,
			Request:     request,
			Inventory:   inventory,
		},
	}

	requestReview := &db_models.RequestReview{
		UserID:    user.ID,
		RequestID: request.ID,
		Outcome:   "approved",
		Note:      "Approved by lab manager",
		User:      user,
		Request:   request,
	}

	// 🔟 Loans + Consumed
	loan := &db_models.Loans{
		ID:            1,
		RequestItemID: requestItems[0].ID,
		IsReturned:    false,
		RequestItems:  &requestItems[0],
	}

	consumed := &db_models.Consumed{
		ID:            1,
		RequestItemID: requestItems[0].ID,
		RequestItems:  &requestItems[0],
	}

	return org, user, session, building, room, shelf, columns, shelfUnits, item, inventory, &shoppingCart, shoppingCartItems, request, requestItems, requestReview, loan, consumed
}
