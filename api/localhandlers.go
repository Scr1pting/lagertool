package api

import (
	"strings"
	"time"

	"github.com/go-pg/pg/v10"
	"lagertool.com/main/db"
	"lagertool.com/main/util"
)

// ============================================================================
// LOCATION METHODS
// ============================================================================

// GetAllLocations retrieves all locations from the database
func (h *Handler) LocalGetAllLocations() ([]db.Location, error) {
	var locations []db.Location
	err := h.DB.Model(&locations).Select()
	if err != nil {
		return nil, err
	}
	return locations, nil
}

// GetLocationByID retrieves a specific location by its ID
func (h *Handler) LocalGetLocationByID(id int) (*db.Location, error) {
	loc := &db.Location{ID: id}
	err := h.DB.Model(loc).WherePK().Select()
	if err != nil {
		return nil, err
	}
	return loc, nil
}

// CreateLocation creates a new location with the provided details
func (h *Handler) LocalCreateLocation(loc *db.Location) error {
	_, err := h.DB.Model(loc).Insert()
	return err
}

// UpdateLocation updates an existing location by ID
func (h *Handler) LocalUpdateLocation(id int, loc *db.Location) error {
	loc.ID = id
	_, err := h.DB.Model(loc).WherePK().Update()
	return err
}

// DeleteLocation deletes a location by ID
func (h *Handler) LocalDeleteLocation(id int) error {
	loc := &db.Location{ID: id}
	_, err := h.DB.Model(loc).WherePK().Delete()
	return err
}

// ============================================================================
// ITEM METHODS
// ============================================================================

// GetAllItems retrieves all items from the database
func (h *Handler) LocalGetAllItems() ([]db.Item, error) {
	var items []db.Item
	err := h.DB.Model(&items).Select()
	if err != nil {
		return nil, err
	}
	return items, nil
}

// GetItemByID retrieves a specific item by its ID
func (h *Handler) LocalGetItemByID(id int) (*db.Item, error) {
	item := &db.Item{ID: id}
	err := h.DB.Model(item).WherePK().Select()
	if err != nil {
		return nil, err
	}
	return item, nil
}

// SearchItems searches for items with a case-insensitive name query
func (h *Handler) LocalSearchItems(name string) ([]db.Item, error) {
	var items []db.Item
	err := h.DB.Model(&items).
		Where("name ILIKE ?", "%"+name+"%").
		Select()
	if err != nil {
		return nil, err
	}
	return items, nil
}

// CreateItem creates a new item with the provided details
func (h *Handler) LocalCreateItem(item *db.Item) error {
	_, err := h.DB.Model(item).Insert()
	return err
}

// UpdateItem updates an existing item by ID
func (h *Handler) LocalUpdateItem(id int, item *db.Item) error {
	item.ID = id
	_, err := h.DB.Model(item).WherePK().Update()
	return err
}

// DeleteItem deletes an item by ID
func (h *Handler) LocalDeleteItem(id int) error {
	item := &db.Item{ID: id}
	_, err := h.DB.Model(item).WherePK().Delete()
	return err
}

// ============================================================================
// IS_IN METHODS (Inventory Tracking)
// ============================================================================

// GetAllInventory retrieves all inventory records
func (h *Handler) LocalGetAllInventory() ([]db.Inventory, error) {
	var inventory []db.Inventory
	err := h.DB.Model(&inventory).Select()
	if err != nil {
		return nil, err
	}
	return inventory, nil
}

// GetInventoryByID retrieves a specific inventory record by its ID
func (h *Handler) LocalGetInventoryByID(id int) (*db.Inventory, error) {
	inventory := &db.Inventory{ID: id}
	err := h.DB.Model(inventory).WherePK().Select()
	if err != nil {
		return nil, err
	}
	return inventory, nil
}

// GetInventoryByLocation retrieves inventory records by location ID
func (h *Handler) LocalGetInventoryByLocation(locationID int) ([]db.Inventory, error) {
	var inventory []db.Inventory
	err := h.DB.Model(&inventory).
		Where("location_id = ?", locationID).
		Select()
	if err != nil {
		return nil, err
	}
	return inventory, nil
}

// GetInventoryByItem retrieves inventory records by item ID
func (h *Handler) LocalGetInventoryByItem(itemID int) ([]db.Inventory, error) {
	var inventory []db.Inventory
	err := h.DB.Model(&inventory).
		Where("item_id = ?", itemID).
		Select()
	if err != nil {
		return nil, err
	}
	return inventory, nil
}

// CreateInventory creates a new inventory record
func (h *Handler) LocalCreateInventory(inventory *db.Inventory) error {
	_, err := h.DB.Model(inventory).Insert()
	return err
}

// UpdateInventory updates an existing inventory record by ID
func (h *Handler) LocalUpdateInventory(id int, inventory *db.Inventory) error {
	inventory.ID = id
	_, err := h.DB.Model(inventory).WherePK().Update()
	return err
}

// UpdateInventoryAmount updates only the amount of an inventory record
func (h *Handler) LocalUpdateInventoryAmount(id int, amount int) error {
	_, err := h.DB.Model(&db.Inventory{}).
		Set("amount = ?", amount).
		Where("id = ?", id).
		Update()
	return err
}

// DeleteInventory deletes an inventory record by ID
func (h *Handler) LocalDeleteInventory(id int) error {
	inventory := &db.Inventory{ID: id}
	_, err := h.DB.Model(inventory).WherePK().Delete()
	return err
}

// ============================================================================
// PERSON METHODS
// ============================================================================

// GetAllPersons retrieves all persons from the database
func (h *Handler) LocalGetAllPersons() ([]db.Person, error) {
	var persons []db.Person
	err := h.DB.Model(&persons).Select()
	if err != nil {
		return nil, err
	}
	return persons, nil
}

// GetPersonByID retrieves a specific person by its ID
func (h *Handler) LocalGetPersonByID(id int) (*db.Person, error) {
	person := &db.Person{ID: id}
	err := h.DB.Model(person).WherePK().Select()
	if err != nil {
		return nil, err
	}
	return person, nil
}

// SearchPersons searches for persons by email, firstname, or lastname
func (h *Handler) LocalSearchPersons(email, firstname, lastname string) ([]db.Person, error) {
	query := h.DB.Model(&[]db.Person{})

	if email != "" {
		query = query.Where("email ILIKE ?", "%"+email+"%")
	}
	if firstname != "" {
		query = query.Where("firstname ILIKE ?", "%"+firstname+"%")
	}
	if lastname != "" {
		query = query.Where("lastname ILIKE ?", "%"+lastname+"%")
	}

	var persons []db.Person
	err := query.Select(&persons)
	if err != nil {
		return nil, err
	}
	return persons, nil
}

// CreatePerson creates a new person
func (h *Handler) LocalCreatePerson(person *db.Person) error {
	_, err := h.DB.Model(person).Insert()
	return err
}

// UpdatePerson updates an existing person by ID
func (h *Handler) LocalUpdatePerson(id int, person *db.Person) error {
	person.ID = id
	_, err := h.DB.Model(person).WherePK().Update()
	return err
}

// DeletePerson deletes a person by ID
func (h *Handler) LocalDeletePerson(id int) error {
	person := &db.Person{ID: id}
	_, err := h.DB.Model(person).WherePK().Delete()
	return err
}

// ============================================================================
// LOANS METHODS
// ============================================================================

// GetAllLoans retrieves all loans from the database
func (h *Handler) LocalGetAllLoans() ([]db.Loans, error) {
	var loans []db.Loans
	err := h.DB.Model(&loans).Select()
	if err != nil {
		return nil, err
	}
	return loans, nil
}

// GetLoanByID retrieves a specific loan by its ID
func (h *Handler) LocalGetLoanByID(id int) (*db.Loans, error) {
	loan := &db.Loans{ID: id}
	err := h.DB.Model(loan).WherePK().Select()
	if err != nil {
		return nil, err
	}
	return loan, nil
}

// GetLoansByPerson retrieves loans by person ID
func (h *Handler) LocalGetLoansByPerson(personID int) ([]db.Loans, error) {
	var loans []db.Loans
	err := h.DB.Model(&loans).
		Where("person_id = ?", personID).
		Select()
	if err != nil {
		return nil, err
	}
	return loans, nil
}

// GetLoansByPermanent retrieves loans by permanent ID
func (h *Handler) LocalGetLoansByPermanent(permID int) ([]db.Loans, error) {
	var loans []db.Loans
	err := h.DB.Model(&loans).
		Where("perm_id = ?", permID).
		Select()
	if err != nil {
		return nil, err
	}
	return loans, nil
}

// GetOverdueLoans retrieves all overdue loans
func (h *Handler) LocalGetOverdueLoans() ([]db.Loans, error) {
	now := time.Now()
	var loans []db.Loans
	err := h.DB.Model(&loans).
		Where("until < ?", now).
		Select()
	if err != nil {
		return nil, err
	}
	return loans, nil
}

// CreateLoan creates a new loan
func (h *Handler) LocalCreateLoan(loan *db.Loans) error {
	_, err := h.DB.Model(loan).Insert()
	return err
}

// UpdateLoan updates an existing loan by ID
func (h *Handler) LocalUpdateLoan(id int, loan *db.Loans) error {
	loan.ID = id
	_, err := h.DB.Model(loan).WherePK().Update()
	return err
}

// DeleteLoan deletes a loan by ID
func (h *Handler) LocalDeleteLoan(id int) error {
	loan := &db.Loans{ID: id}
	_, err := h.DB.Model(loan).WherePK().Delete()
	return err
}

// ------------------------
// 				EXPERIMENTAL
// ------------------------

func (h *Handler) LocalSearch(search_term string) ([]db.Inventory, error) {
	search_term = strings.ToLower(search_term)
	items, err := h.LocalGetAllItems()
	if err != nil {
		return nil, err
	}

	array_of_matching_items := util.FindItemSearchTermsInDB(items, search_term)

	// Extract IDs from matching items
	var itemIDs []int
	for _, item := range array_of_matching_items {
		itemIDs = append(itemIDs, item.ID)
	}

	if len(itemIDs) == 0 {
		return []db.Inventory{}, nil
	}

	// Perform query with joins to location and item tables
	var results []db.Inventory
	err = h.DB.Model(&results).
		Where("inventory.item_id IN (?)", pg.In(itemIDs)).
		Column("inventory.*").
		Relation("Location").
		Relation("Item").
		Select()
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (h *Handler) LocalGetLoansWithPerson() ([]db.Loans, error) {
	var loans []db.Loans

	err := h.DB.Model(&loans).
		Column("loans.*").
		Relation("Person").
		Select()
	if err != nil {
		return nil, err
	}

	return loans, nil
}

func (h *Handler) LocalGetLoansWithPersonByPersonID(personID int) ([]db.Loans, error) {
	var loans []db.Loans

	err := h.DB.Model(&loans).
		Column("loans.*").
		Relation("Person").
		Where("loans.person_id = ?", personID).
		Select()
	if err != nil {
		return nil, err
	}

	return loans, nil
}

func (h *Handler) LocalGetActiveLoansWithPerson() ([]db.Loans, error) {
	var loans []db.Loans

	err := h.DB.Model(&loans).
		Column("loans.*").
		Relation("Person").
		Select()
	if err != nil {
		return nil, err
	}

	return loans, nil
}
