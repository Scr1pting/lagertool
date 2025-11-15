package db

import (
	"errors"
	"time"

	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
)

func CreateBuilding(con *pg.DB, name string, campus string) (*Building, error) {
	building := &Building{
		Name:       name,
		Campus:     campus,
		UpdateDate: time.Now(),
	}

	_, err := con.Model(building).Insert()
	return building, err
}

func CreateRoom(con *pg.DB, name string, floor string, number string, buildingID int) (*Room, error) {
	room := &Room{
		Name:       name,
		Floor:      floor,
		Number:     number,
		BuildingID: buildingID,
		UpdateDate: time.Now(),
	}
	_, err := con.Model(room).Insert()
	return room, err
}

func CreateShelf(con *pg.DB, request api_objects.ShelfRequest) (*Shelf, error) {
	shelf := &Shelf{
		ID:         request.ID,
		Name:       request.Name,
		OwnedBy:    request.OwnedBy,
		UpdateDate: time.Now(),
		RoomID:     request.RoomID,
	}
	_, err := con.Model(shelf).Insert()
	if err != nil {
		return nil, err
	}

	for _, column := range request.Columns {
		col := &Column{
			ID:      column.ID,
			ShelfID: shelf.ID,
		}
		_, err := con.Model(col).Insert()
		if err != nil {
			return nil, err
		}
		shelf.Columns = append(shelf.Columns, *col) //is this necessary?

		for pos, element := range column.Elements {
			suType := 0
			if element.Type != "slim" {
				suType = 1
			}
			el := &ShelfUnit{
				ID:               element.ID,
				Type:             suType,
				PositionInColumn: pos,
			}
			_, err := con.Model(el).Insert()
			if err != nil {
				return nil, err
			}
			col.ShelfUnits = append(col.ShelfUnits, *el)
		}
	}
	return shelf, nil
}

func CreateCartItem(con *pg.DB, itemID int, num_selected int, userID int) (*ShoppingCartItem, error) {
	cart := &ShoppingCart{}
	err := con.Model(cart).Where("user_id = ?", userID).Select()
	if errors.Is(err, pg.ErrNoRows) {
		cart.UserID = userID
		_, err = con.Model(cart).Insert()
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	shoppingCartItem := &ShoppingCartItem{
		Amount:         num_selected,
		InventoryID:    itemID,
		ShoppingCartID: cart.ID,
	}
	_, err = con.Model(shoppingCartItem).Insert()
	if err != nil {
		return nil, err
	}
	return shoppingCartItem, nil
}

func CreateInventoryItem(con *pg.DB, request api_objects.InventoryItemRequest) (*Inventory, error) {
	item := &Item{}
	err := con.Model(item).Where("name = ?", request.Name).Where("isConsumable = ?", request.IsConsumable).Select()
	if errors.Is(err, pg.ErrNoRows) {
		item.Name = request.Name
		item.IsConsumable = request.IsConsumable
		_, err = con.Model(item).Insert()
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}
	inv := &Inventory{
		ItemID:      item.ID,
		Amount:      request.Amount,
		ShelfUnitID: request.ShelfUnitID,
		UpdateDate:  time.Now(),
		Note:        request.Note,
	}
	_, err = con.Model(inv).Insert()
	if err != nil {
		return nil, err
	}
	return inv, nil
}
