package db

import (
	"errors"
	"time"

	"github.com/go-pg/pg/v10"
	"lagertool.com/main/db_models"
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

func CreateBuilding(con *pg.DB, name string, campus string) (*db_models.Building, error) {
	building := &db_models.Building{
		Name:       name,
		Campus:     campus,
		UpdateDate: time.Now(),
	}

	_, err := con.Model(building).Insert()
	return building, err
}

func CreateRoom(con *pg.DB, name string, floor string, number string, buildingID int) (*db_models.Room, error) {
	room := &db_models.Room{
		Name:       name,
		Floor:      floor,
		Number:     number,
		BuildingID: buildingID,
		UpdateDate: time.Now(),
	}
	_, err := con.Model(room).Insert()
	return room, err
}

func CreateShelf(con *pg.DB, id string, name string, ownedBy string, roomID int, columns []ColumnInput) (*db_models.Shelf, error) {
	shelf := &db_models.Shelf{
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
		col := &db_models.Column{
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
			el := &db_models.ShelfUnit{
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

func CreateCartItem(con *pg.DB, itemID int, num_selected int, userID int) (*db_models.ShoppingCartItem, error) {
	cart := &db_models.ShoppingCart{}
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

	shoppingCartItem := &db_models.ShoppingCartItem{
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

func CreateInventoryItem(con *pg.DB, name string, amount int, shelfUnitID string, isConsumable bool, note string) (*db_models.Inventory, error) {
	item := &db_models.Item{}
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
	inv := &db_models.Inventory{
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

func Create_request(con *pg.DB, request *db_models.Request) error {
	_, err := con.Model(request).Insert()
	if err != nil {
		return err
	}
	return nil
}

func Create_request_item(con *pg.DB, request db_models.RequestItems) error {
	_, err := con.Model(&request).Insert()
	if err != nil {
		return err
	}
	return nil
}

func Create_loans(con *pg.DB, loan *db_models.Loans) error {
	_, err := con.Model(loan).Insert()
	return err
}

func Create_consumed(con *pg.DB, consumed *db_models.Consumed) error {
	_, err := con.Model(consumed).Insert()
	return err
}
