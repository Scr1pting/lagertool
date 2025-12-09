package db

import (
	"errors"
	"time"

	"github.com/go-pg/pg/v10"
)

// ShelfElementInput represents a shelf element for creating a shelf
type ShelfElementInput struct {
	ID   string
	Type string
}

// ColumnInput represents a column with elements for creating a shelf
type ColumnInput struct {
	ID       string
	Elements []ShelfElementInput
}

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

func CreateShelf(con *pg.DB, id string, name string, ownedBy string, roomID int, columns []ColumnInput) (*Shelf, error) {
	shelf := &Shelf{
		ID:         id,
		Name:       name,
		OwnedBy:    ownedBy,
		UpdateDate: time.Now(),
		RoomID:     roomID,
	}
	_, err := con.Model(shelf).Insert()
	if err != nil {
		return nil, err
	}

	for _, column := range columns {
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
				ColumnID:         col.ID,
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

func CreateInventoryItem(con *pg.DB, name string, amount int, shelfUnitID string, isConsumable bool, note string) (*Inventory, error) {
	item := &Item{}
	err := con.Model(item).Where("name = ?", name).Where("is_consumable = ?", isConsumable).Select()
	if errors.Is(err, pg.ErrNoRows) {
		item.Name = name
		item.IsConsumable = isConsumable
		_, err = con.Model(item).Insert()
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}
	inv := &Inventory{
		ItemID:      item.ID,
		Amount:      amount,
		ShelfUnitID: shelfUnitID,
		UpdateDate:  time.Now(),
		Note:        note,
	}
	_, err = con.Model(inv).Insert()
	if err != nil {
		return nil, err
	}
	return inv, nil
}
