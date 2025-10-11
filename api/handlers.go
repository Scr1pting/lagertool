package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/db"
	"lagertool.com/main/util"
)

type Handler struct {
	DB *pg.DB
}

func NewHandler(db *pg.DB) *Handler {
	return &Handler{DB: db}
}

// ============================================================================
// LOCATION HANDLERS
// ============================================================================

// GetAllLocations godoc
// @Summary Get all locations
// @Description Retrieve all locations from the database
// @Tags locations
// @Produce json
// @Success 200 {array} db.Location
// @Failure 500 {object} map[string]string
// @Router /locations [get]
func (h *Handler) GetAllLocations(c *gin.Context) {
	var locations []db.Location
	err := h.DB.Model(&locations).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, locations)
}

// GetLocationByID godoc
// @Summary Get location by ID
// @Description Retrieve a specific location by its ID
// @Tags locations
// @Produce json
// @Param id path int true "Location ID"
// @Success 200 {object} db.Location
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /locations/{id} [get]
func (h *Handler) GetLocationByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	loc := &db.Location{ID: id}
	err = h.DB.Model(loc).WherePK().Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "location not found"})
		return
	}

	c.JSON(http.StatusOK, loc)
}

// CreateLocation godoc
// @Summary Create a new location
// @Description Create a new location with the provided details. The ID is auto-generated and should not be included in the request body.
// @Tags locations
// @Accept json
// @Produce json
// @Param location body object{campus=string,building=string,room=string,shelf=string,shelfunit=string} true "Location object (all fields are optional strings)"
// @Success 201 {object} db.Location
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /locations [post]
func (h *Handler) CreateLocation(c *gin.Context) {
	var loc db.Location
	if err := c.ShouldBindJSON(&loc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.DB.Model(&loc).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, loc)
}

// UpdateLocation godoc
// @Summary Update a location
// @Description Update an existing location by ID. The ID in the request body is ignored; use the path parameter.
// @Tags locations
// @Accept json
// @Produce json
// @Param id path int true "Location ID"
// @Param location body object{campus=string,building=string,room=string,shelf=string,shelfunit=string} true "Location object (all fields are optional strings)"
// @Success 200 {object} db.Location
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /locations/{id} [put]
func (h *Handler) UpdateLocation(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var loc db.Location
	if err := c.ShouldBindJSON(&loc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loc.ID = id
	_, err = h.DB.Model(&loc).WherePK().Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loc)
}

// DeleteLocation godoc
// @Summary Delete a location
// @Description Delete a location by ID
// @Tags locations
// @Produce json
// @Param id path int true "Location ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /locations/{id} [delete]
func (h *Handler) DeleteLocation(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	loc := &db.Location{ID: id}
	_, err = h.DB.Model(loc).WherePK().Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "location deleted successfully"})
}

// ============================================================================
// ITEM HANDLERS
// ============================================================================

// GetAllItems godoc
// @Summary Get all items
// @Description Retrieve all items from the database
// @Tags items
// @Produce json
// @Success 200 {array} db.Item
// @Failure 500 {object} map[string]string
// @Router /items [get]
func (h *Handler) GetAllItems(c *gin.Context) {
	var items []db.Item
	err := h.DB.Model(&items).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// GetItemByID godoc
// @Summary Get item by ID
// @Description Retrieve a specific item by its ID
// @Tags items
// @Produce json
// @Param id path int true "Item ID"
// @Success 200 {object} db.Item
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /items/{id} [get]
func (h *Handler) GetItemByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	item := &db.Item{ID: id}
	err = h.DB.Model(item).WherePK().Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// SearchItems godoc
// @Summary Search items by name
// @Description Search for items with a case-insensitive name query
// @Tags items
// @Produce json
// @Param name query string true "Item name to search for"
// @Success 200 {array} db.Item
// @Failure 500 {object} map[string]string
// @Router /items/search [get]
func (h *Handler) SearchItems(c *gin.Context) {
	name := c.Query("name")

	var items []db.Item
	err := h.DB.Model(&items).
		Where("name ILIKE ?", "%"+name+"%").
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, items)
}

// CreateItem godoc
// @Summary Create a new item
// @Description Create a new item with the provided details. The ID is auto-generated and should not be included in the request body.
// @Tags items
// @Accept json
// @Produce json
// @Param item body object{name=string,category=string} true "Item object (name and category are required strings)"
// @Success 201 {object} db.Item
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /items [post]
func (h *Handler) CreateItem(c *gin.Context) {
	var item db.Item
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.DB.Model(&item).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// UpdateItem godoc
// @Summary Update an item
// @Description Update an existing item by ID. The ID in the request body is ignored; use the path parameter.
// @Tags items
// @Accept json
// @Produce json
// @Param id path int true "Item ID"
// @Param item body object{name=string,category=string} true "Item object (name and category are required strings)"
// @Success 200 {object} db.Item
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /items/{id} [put]
func (h *Handler) UpdateItem(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var item db.Item
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item.ID = id
	_, err = h.DB.Model(&item).WherePK().Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

// DeleteItem godoc
// @Summary Delete an item
// @Description Delete an item by ID
// @Tags items
// @Produce json
// @Param id path int true "Item ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /items/{id} [delete]
func (h *Handler) DeleteItem(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	item := &db.Item{ID: id}
	_, err = h.DB.Model(item).WherePK().Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "item deleted successfully"})
}

// ============================================================================
// IS_IN HANDLERS (Inventory Tracking)
// ============================================================================

// GetAllInventory godoc
// @Summary Get all inventory records
// @Description Retrieve all item-location inventory records from the database
// @Tags inventory
// @Produce json
// @Success 200 {array} InventoryResponse
// @Failure 500 {object} map[string]string
// @Router /inventory [get]
func (h *Handler) GetAllInventory(c *gin.Context) {
	type InventoryResponse struct {
		ID           int    `json:"id"`
		Name         string `json:"name"`
		ShelfName    string `json:"shelf_name"`
		RoomName     string `json:"room_name"`
		BuildingName string `json:"building_name"`
		Amount       int    `json:"amount"`
	}

	var result []InventoryResponse

	// Perform a JOIN across inventory, item, and location tables
	err := h.DB.Model((*db.Inventory)(nil)).
		ColumnExpr("inventory.id AS id").
		ColumnExpr("item.name AS name").
		ColumnExpr("location.shelf AS shelf_name").
		ColumnExpr("location.room AS room_name").
		ColumnExpr("location.building AS building_name").
		ColumnExpr("inventory.amount AS amount").
		Join("JOIN item ON item.id = inventory.item_id").
		Join("JOIN location ON location.id = inventory.location_id").
		Order("inventory.id ASC").
		Select(&result)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetInventoryByID godoc
// @Summary Get inventory record by ID
// @Description Retrieve a specific inventory record by its ID
// @Tags inventory
// @Produce json
// @Param id path int true "Inventory Record ID"
// @Success 200 {object} db.Inventory
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /inventory/{id} [get]
func (h *Handler) GetInventoryByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	inventory := &db.Inventory{ID: id}
	err = h.DB.Model(inventory).WherePK().Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "inventory record not found"})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

// GetInventoryByLocation godoc
// @Summary Get inventory records by location ID
// @Description Retrieve all inventory records for a specific location
// @Tags inventory
// @Produce json
// @Param location_id path int true "Location ID"
// @Success 200 {array} db.Inventory
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/location/{location_id} [get]
func (h *Handler) GetInventoryByLocation(c *gin.Context) {
	locationID, err := strconv.Atoi(c.Param("location_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid location_id"})
		return
	}

	var inventory []db.Inventory
	err = h.DB.Model(&inventory).
		Where("location_id = ?", locationID).
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

// GetInventoryByItem godoc
// @Summary Get inventory records by item ID
// @Description Retrieve all inventory records for a specific item
// @Tags inventory
// @Produce json
// @Param item_id path int true "Item ID"
// @Success 200 {array} db.Inventory
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/item/{item_id} [get]
func (h *Handler) GetInventoryByItem(c *gin.Context) {
	itemID, err := strconv.Atoi(c.Param("item_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item_id"})
		return
	}

	var inventory []db.Inventory
	err = h.DB.Model(&inventory).
		Where("item_id = ?", itemID).
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

// CreateInventory godoc
// @Summary Create a new inventory record
// @Description Create a new inventory record (link an item to a location with an amount). The ID is auto-generated and should not be included in the request body.
// @Tags inventory
// @Accept json
// @Produce json
// @Param inventory body object{location_id=int,item_id=int,amount=int,note=string} true "Inventory record object (all fields are required: location_id, item_id, amount as integers, note as string)"
// @Success 201 {object} db.Inventory
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory [post]
func (h *Handler) CreateInventory(c *gin.Context) {
	var inventory db.Inventory
	if err := c.ShouldBindJSON(&inventory); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.DB.Model(&inventory).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, inventory)
}

// UpdateInventory godoc
// @Summary Update an inventory record
// @Description Update an existing inventory record by ID. The ID in the request body is ignored; use the path parameter.
// @Tags inventory
// @Accept json
// @Produce json
// @Param id path int true "Inventory Record ID"
// @Param inventory body object{location_id=int,item_id=int,amount=int,note=string} true "Inventory record object (all fields are required: location_id, item_id, amount as integers, note as string)"
// @Success 200 {object} db.Inventory
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/{id} [put]
func (h *Handler) UpdateInventory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var inventory db.Inventory
	if err := c.ShouldBindJSON(&inventory); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inventory.ID = id
	_, err = h.DB.Model(&inventory).WherePK().Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

// UpdateInventoryAmount godoc
// @Summary Update inventory amount
// @Description Partially update the amount of an inventory record by ID
// @Tags inventory
// @Accept json
// @Produce json
// @Param id path int true "Inventory Record ID"
// @Param request body object{amount=int} true "New amount value"
// @Success 200 {object} db.Inventory
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/{id}/amount [patch]
func (h *Handler) UpdateInventoryAmount(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		Amount int `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inventory := &db.Inventory{ID: id}
	_, err = h.DB.Model(inventory).
		Set("amount = ?", req.Amount).
		WherePK().
		Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err = h.DB.Model(inventory).WherePK().Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

// DeleteInventory godoc
// @Summary Delete an inventory record
// @Description Delete an inventory record by ID
// @Tags inventory
// @Produce json
// @Param id path int true "Inventory Record ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /inventory/{id} [delete]
func (h *Handler) DeleteInventory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	inventory := &db.Inventory{ID: id}
	_, err = h.DB.Model(inventory).WherePK().Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "inventory record deleted successfully"})
}

// ============================================================================
// PERSON HANDLERS
// ============================================================================

// GetAllPersons godoc
// @Summary Get all persons
// @Description Retrieve all persons from the database
// @Tags persons
// @Produce json
// @Success 200 {array} db.Person
// @Failure 500 {object} map[string]string
// @Router /persons [get]
func (h *Handler) GetAllPersons(c *gin.Context) {
	var persons []db.Person
	err := h.DB.Model(&persons).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, persons)
}

// GetPersonByID godoc
// @Summary Get person by ID
// @Description Retrieve a specific person by their ID
// @Tags persons
// @Produce json
// @Param id path int true "Person ID"
// @Success 200 {object} db.Person
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /persons/{id} [get]
func (h *Handler) GetPersonByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	person := &db.Person{ID: id}
	err = h.DB.Model(person).WherePK().Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	c.JSON(http.StatusOK, person)
}

// SearchPersons godoc
// @Summary Search persons
// @Description Search for persons by email, firstname, or lastname (case-insensitive partial match)
// @Tags persons
// @Produce json
// @Param email query string false "Email query for search"
// @Param firstname query string false "First name query for search"
// @Param lastname query string false "Last name query for search"
// @Success 200 {array} db.Person
// @Failure 500 {object} map[string]string
// @Router /persons/search [get]
func (h *Handler) SearchPersons(c *gin.Context) {
	email := c.Query("email")
	firstname := c.Query("firstname")
	lastname := c.Query("lastname")

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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, persons)
}

// CreatePerson godoc
// @Summary Create a new person
// @Description Create a new person with the provided details. The ID is auto-generated and should not be included in the request body.
// @Tags persons
// @Accept json
// @Produce json
// @Param person body object{firstname=string,lastname=string,email=string,telephone=string} true "Person object (all fields are required strings: firstname, lastname, email, telephone)"
// @Success 201 {object} db.Person
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /persons [post]
func (h *Handler) CreatePerson(c *gin.Context) {
	var person db.Person
	if err := c.ShouldBindJSON(&person); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.DB.Model(&person).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, person)
}

// UpdatePerson godoc
// @Summary Update a person
// @Description Update an existing person by ID. The ID in the request body is ignored; use the path parameter.
// @Tags persons
// @Accept json
// @Produce json
// @Param id path int true "Person ID"
// @Param person body object{firstname=string,lastname=string,email=string,telephone=string} true "Person object (all fields are required strings: firstname, lastname, email, telephone)"
// @Success 200 {object} db.Person
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /persons/{id} [put]
func (h *Handler) UpdatePerson(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var person db.Person
	if err := c.ShouldBindJSON(&person); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	person.ID = id
	_, err = h.DB.Model(&person).WherePK().Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, person)
}

// DeletePerson godoc
// @Summary Delete a person
// @Description Delete a person by ID
// @Tags persons
// @Produce json
// @Param id path int true "Person ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /persons/{id} [delete]
func (h *Handler) DeletePerson(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	person := &db.Person{ID: id}
	_, err = h.DB.Model(person).WherePK().Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "person deleted successfully"})
}

// ============================================================================
// LOANS HANDLERS
// ============================================================================

// GetAllLoans godoc
// @Summary Get all loans
// @Description Retrieve all loan records from the database
// @Tags loans
// @Produce json
// @Success 200 {array} db.Loans
// @Failure 500 {object} map[string]string
// @Router /loans [get]
func (h *Handler) GetAllLoans(c *gin.Context) {
	var loans []db.Loans
	err := h.DB.Model(&loans).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, loans)
}

// GetLoanByID godoc
// @Summary Get loan by ID
// @Description Retrieve a specific loan record by its ID
// @Tags loans
// @Produce json
// @Param id path int true "Loan ID"
// @Success 200 {object} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /loans/{id} [get]
func (h *Handler) GetLoanByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	loan := &db.Loans{ID: id}
	err = h.DB.Model(loan).WherePK().Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "loan not found"})
		return
	}

	c.JSON(http.StatusOK, loan)
}

// GetLoansByPerson godoc
// @Summary Get loans by person ID
// @Description Retrieve all loan records associated with a specific person
// @Tags loans
// @Produce json
// @Param person_id path int true "Person ID"
// @Success 200 {array} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans/person/{person_id} [get]
func (h *Handler) GetLoansByPerson(c *gin.Context) {
	personID, err := strconv.Atoi(c.Param("person_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid person_id"})
		return
	}

	var loans []db.Loans
	err = h.DB.Model(&loans).
		Where("person_id = ?", personID).
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// GetLoansByPermanent godoc
// @Summary Get loans by permanent item ID
// @Description Retrieve all loan records associated with a specific permanent item
// @Tags loans
// @Produce json
// @Param perm_id path int true "Permanent Item ID"
// @Success 200 {array} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans/permanent/{perm_id} [get]
func (h *Handler) GetLoansByPermanent(c *gin.Context) {
	permID, err := strconv.Atoi(c.Param("perm_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid perm_id"})
		return
	}

	var loans []db.Loans
	err = h.DB.Model(&loans).
		Where("perm_id = ?", permID).
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// GetOverdueLoans godoc
// @Summary Get all overdue loans
// @Description Retrieve all loan records where the return date (`until`) is in the past
// @Tags loans
// @Produce json
// @Success 200 {array} db.Loans
// @Failure 500 {object} map[string]string
// @Router /loans/overdue [get]
func (h *Handler) GetOverdueLoans(c *gin.Context) {
	now := time.Now()
	var loans []db.Loans
	err := h.DB.Model(&loans).
		Where("until < ?", now).
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// CreateLoan godoc
// @Summary Create a new loan record
// @Description Create a new loan record. The ID is auto-generated and should not be included in the request body. Date fields must be in RFC3339 format (e.g., "2025-10-10T14:30:00Z").
// @Tags loans
// @Accept json
// @Produce json
// @Param loan body object{person_id=int,perm_id=int,amount=int,begin=string,until=string} true "Loan record object (person_id, perm_id, amount are required integers; begin is required RFC3339 timestamp; until is optional RFC3339 timestamp)"
// @Success 201 {object} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans [post]
func (h *Handler) CreateLoan(c *gin.Context) {
	var loan db.Loans
	if err := c.ShouldBindJSON(&loan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.DB.Model(&loan).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, loan)
}

// UpdateLoan godoc
// @Summary Update a loan record
// @Description Update an existing loan record by ID. The ID in the request body is ignored; use the path parameter. Date fields must be in RFC3339 format (e.g., "2025-10-10T14:30:00Z").
// @Tags loans
// @Accept json
// @Produce json
// @Param id path int true "Loan ID"
// @Param loan body object{person_id=int,perm_id=int,amount=int,begin=string,until=string} true "Loan record object (person_id, perm_id, amount are required integers; begin is required RFC3339 timestamp; until is optional RFC3339 timestamp)"
// @Success 200 {object} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans/{id} [put]
func (h *Handler) UpdateLoan(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var loan db.Loans
	if err := c.ShouldBindJSON(&loan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loan.ID = id
	_, err = h.DB.Model(&loan).WherePK().Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loan)
}

// DeleteLoan godoc
// @Summary Delete a loan record
// @Description Delete a loan record by ID
// @Tags loans
// @Produce json
// @Param id path int true "Loan ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans/{id} [delete]
func (h *Handler) DeleteLoan(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	loan := &db.Loans{ID: id}
	_, err = h.DB.Model(loan).WherePK().Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "loan deleted successfully"})
}

func (h *Handler) Search(c *gin.Context) {
	search_term := c.Query("search_term")
	if search_term == "" {
		c.JSON(400, gin.H{"error": "search_term parameter is required"})
		return
	}

	search_term = strings.ToLower(search_term)
	items, err := h.LocalGetAllItems()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to get items: " + err.Error()})
		return
	}

	array_of_matching_items := util.FindItemSearchTermsInDB(items, search_term)

	var itemIDs []int
	for _, item := range array_of_matching_items {
		itemIDs = append(itemIDs, item.ID)
	}

	if len(itemIDs) == 0 {
		c.JSON(200, []gin.H{})
		return
	}

	type Result struct {
		InventoryID int    `json:"inventory_id"`
		Amount      int    `json:"amount"`
		Note        string `json:"note"`
		ItemName    string `json:"item_name"`
		Category    string `json:"category"`
		Campus      string `json:"campus"`
		Building    string `json:"building"`
		Room        string `json:"room"`
		Shelf       string `json:"shelf"`
	}

	var results []Result
	_, err = h.DB.Query(&results, `
		SELECT 
			inv.id as inventory_id,
			inv.amount,
			inv.note,
			it.name as item_name,
			it.category,
			loc.campus,
			loc.building,
			loc.room,
			loc.shelf
		FROM inventory inv
		JOIN item it ON it.id = inv.item_id
		JOIN location loc ON loc.id = inv.location_id
		WHERE inv.item_id IN (?)
	`, pg.In(itemIDs))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to search inventory: " + err.Error()})
		return
	}

	c.JSON(200, results)
}

func (h *Handler) GetLoansWithPerson(c *gin.Context) {
	type LoanResult struct {
		LoanID    int       `json:"loan_id"`
		PersonId  int       `json:"person_id"`
		ItemID    int       `json:"item_id"`
		Amount    int       `json:"amount"`
		Begin     time.Time `json:"begin"`
		Until     time.Time `json:"until,omitempty"`
		Firstname string    `json:"firstname"`
		Lastname  string    `json:"lastname"`
		SlackID   string    `json:"slack_id"`
		ItemName  string    `json:"name"`
	}

	var results []LoanResult
	_, err := h.DB.Query(&results, `
		SELECT 
			l.id as loan_id,
			l.person_id,
			l.item_id,
			l.amount,
			l.begin,
			l.until,
			p.firstname,
			p.lastname,
			p.slack_id,
			i.name as item_name
		FROM loans l
		JOIN person p ON p.id = l.person_id
		JOIN item i ON i.id = l.item_id
	`)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to get loans: " + err.Error()})
		return
	}

	c.JSON(200, results)
}
