package api

import (
	"time"

	"lagertool.com/main/api_objects"
	"lagertool.com/main/db"
)

func (h *Handler) GetShelfHelper(id string, orga string) (api_objects.Shelves, error) {
	var shelf db.Shelf
	err := h.DB.Model(&shelf).
		Relation("Room.Building").
		Relation("Columns.ShelfUnits").Where("shelf.id = ?", id).Where("shelf.owned_by = ?", orga).Select()
	if err != nil {
		return api_objects.Shelves{}, err
	}

	var shelfObj api_objects.Shelves
	shelfObj.ID = shelf.ID
	shelfObj.Name = shelf.Name
	shelfObj.Room = *shelf.Room
	shelfObj.Building = *shelf.Room.Building
	var col api_objects.Columns
	for _, c := range shelf.Columns {
		col.ID = c.ID
		var el api_objects.Element
		for _, e := range c.ShelfUnits {
			el.ID = e.ID
			if e.Type == 0 {
				el.Type = "slim"
			} else if e.Type == 1 {
				el.Type = "high"
			}
			col.Elements = append(col.Elements, el)
		}
		shelfObj.Columns = append(shelfObj.Columns, col)
	}
	return shelfObj, nil
}

func (h *Handler) GetAvailable(invId int, start time.Time, end time.Time) (int, error) {
	var dbInv db.Inventory
	err := h.DB.Model(&dbInv).
		Relation("Item").
		Relation("RequestItems.Request").Where("inventory.id = ?", invId).Select()
	if err != nil {
		return 0, err
	}
	if dbInv.Item.IsConsumable {
		return dbInv.Amount, nil
	}
	count := 0
	for _, reqItem := range dbInv.RequestItems {
		if !(reqItem.Request.StartDate.After(end) || start.After(reqItem.Request.EndDate)) {
		}
		count += reqItem.Amount
	}
	return dbInv.Amount - count, nil
}

func (h *Handler) GetInventoryItemHelper(id int, start time.Time, end time.Time) (api_objects.InventoryItem, error) {
	var dbInv db.Inventory
	var res api_objects.InventoryItem
	err := h.DB.Model(&dbInv).
		Relation("Item").
		Relation("ShelfUnit.Column.Shelf.Room.Building").Where("inventory.id = ?", id).Select()
	if err != nil {
		return api_objects.InventoryItem{}, err
	}
	res.ID = id
	res.Name = dbInv.Item.Name
	res.Amount = dbInv.Amount
	res.Available, err = h.GetAvailable(id, start, end)
	if err != nil {
		return res, err
	}
	res.Room = *dbInv.ShelfUnit.Column.Shelf.Room
	res.Building = *dbInv.ShelfUnit.Column.Shelf.Room.Building
	res.ShelfID = dbInv.ShelfUnit.Column.Shelf.ID
	return res, nil
}

func (h *Handler) GetCartItemHelper(id int, start time.Time, end time.Time) (map[string][]api_objects.CartItem, error) {
	var shoppingCart db.ShoppingCart
	err := h.DB.Model(&shoppingCart).
		Relation("ShoppingCartItems.Inventory.Item").
		Relation("ShoppingCartItems.Inventory.ShelfUnit.Column.Shelf.Room").
		Relation("ShoppingCartItems.Inventory.ShelfUnit.Column.Shelf.Organisation").
		Where("user_id = ?", id).
		Select()

	if err != nil {
		return nil, err
	}

	m := make(map[string][]api_objects.CartItem)
	for _, item := range shoppingCart.ShoppingCartItems {
		if item.Inventory.ShelfUnit.Column.Shelf.Room.Building == nil {
			var building db.Building
			err = h.DB.Model(&building).
				Where("id = ?", item.Inventory.ShelfUnit.Column.Shelf.Room.BuildingID).
				Select()
			if err != nil {
				return nil, err
			}
			item.Inventory.ShelfUnit.Column.Shelf.Room.Building = &building
		}

		var ci api_objects.CartItem
		ci.ID = item.Inventory.ItemID
		ci.Name = item.Inventory.Item.Name
		ci.Amount = item.Inventory.Amount
		ci.Available, err = h.GetAvailable(item.Inventory.ItemID, start, end)
		if err != nil {
			return nil, err
		}
		ci.Room = *item.Inventory.ShelfUnit.Column.Shelf.Room
		ci.Building = *item.Inventory.ShelfUnit.Column.Shelf.Room.Building
		ci.ShelfID = item.Inventory.ShelfUnit.Column.Shelf.ID
		ci.AmountSelected = item.Amount
		m[item.Inventory.ShelfUnit.Column.Shelf.Organisation.Name] = append(m[item.Inventory.ShelfUnit.Column.Shelf.Organisation.Name], ci)
	}
	return m, nil
}
