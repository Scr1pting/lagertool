package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"github.com/slack-go/slack"
	"lagertool.com/main/config"
	"lagertool.com/main/db"
	"lagertool.com/main/slack1"
	"lagertool.com/main/util"
)

type Handler struct {
	DB  *pg.DB
	Cfg *config.Config
}

func NewHandler(db *pg.DB, cfg *config.Config) *Handler {
	return &Handler{DB: db, Cfg: cfg}
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
// @Param location body db.Location true "Location object"
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
// @Param location body db.Location true "Location object"
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
// @Param item body db.Item true "Item object"
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
// @Param item body db.Item true "Item object"
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
// @Success 200 {array} db.Inventory
// @Failure 500 {object} map[string]string
// @Router /inventory [get]
func (h *Handler) GetAllInventory(c *gin.Context) {
	var inventory []db.Inventory
	err := h.DB.Model(&inventory).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, inventory)
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
// @Param inventory body db.Inventory true "Inventory record object"
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
// @Param inventory body db.Inventory true "Inventory record object"
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
// @Description Search for persons by firstname or lastname (case-insensitive partial match)
// @Tags persons
// @Produce json
// @Param firstname query string false "First name query for search"
// @Param lastname query string false "Last name query for search"
// @Success 200 {array} db.Person
// @Failure 500 {object} map[string]string
// @Router /persons/search [get]
func (h *Handler) SearchPersons(c *gin.Context) {
	firstname := c.Query("firstname")
	lastname := c.Query("lastname")

	query := h.DB.Model(&[]db.Person{})

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
// @Param person body db.Person true "Person object"
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
// @Param person body db.Person true "Person object"
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
// @Description Retrieve all loan records from the database. Optionally filter by returned status using the 'returned' query parameter (true/false).
// @Tags loans
// @Produce json
// @Param returned query string false "Filter by returned status (true/false)"
// @Success 200 {array} db.Loans
// @Failure 500 {object} map[string]string
// @Router /loans [get]
func (h *Handler) GetAllLoans(c *gin.Context) {
	returnedParam := c.Query("returned")

	query := h.DB.Model(&[]db.Loans{})

	// Filter by returned status if parameter is provided
	if returnedParam == "true" {
		query = query.Where("returned = ?", true)
	} else if returnedParam == "false" {
		query = query.Where("returned = ?", false)
	}

	var loans []db.Loans
	err := query.Select(&loans)
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
// @Description Retrieve all non-returned loan records where the return date (`until`) is in the past
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
		Where("returned = ?", false).
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
// @Param loan body db.Loans true "Loan record object"
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
// @Param loan body db.Loans true "Loan record object"
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

// ReturnLoan godoc
// @Summary Mark a loan as returned
// @Description Mark a loan as returned by setting the returned flag to true and recording the return timestamp
// @Tags loans
// @Produce json
// @Param id path int true "Loan ID"
// @Success 200 {object} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans/{id}/return [patch]
func (h *Handler) ReturnLoan(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Check if loan exists
	loan := &db.Loans{ID: id}
	err = h.DB.Model(loan).WherePK().Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "loan not found"})
		return
	}

	// Check if already returned
	if loan.Returned {
		c.JSON(http.StatusBadRequest, gin.H{"error": "loan already returned"})
		return
	}

	// Mark as returned
	now := time.Now()
	loan.Returned = true
	loan.ReturnedAt = &now

	_, err = h.DB.Model(loan).
		Set("returned = ?", true).
		Set("returned_at = ?", now).
		WherePK().
		Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loan)
}

// GetLoanHistoryByItem godoc
// @Summary Get borrow history for an item
// @Description Retrieve all loan records (both active and returned) for a specific item
// @Tags loans
// @Produce json
// @Param item_id path int true "Item ID"
// @Success 200 {array} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans/item/{item_id}/history [get]
func (h *Handler) GetLoanHistoryByItem(c *gin.Context) {
	itemID, err := strconv.Atoi(c.Param("item_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item_id"})
		return
	}

	var loans []db.Loans
	err = h.DB.Model(&loans).
		Where("item_id = ?", itemID).
		Order("begin DESC").
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// GetLoanHistoryByPerson godoc
// @Summary Get borrow history for a person
// @Description Retrieve all loan records (both active and returned) for a specific person
// @Tags loans
// @Produce json
// @Param person_id path int true "Person ID"
// @Success 200 {array} db.Loans
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /loans/person/{person_id}/history [get]
func (h *Handler) GetLoanHistoryByPerson(c *gin.Context) {
	personID, err := strconv.Atoi(c.Param("person_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid person_id"})
		return
	}

	var loans []db.Loans
	err = h.DB.Model(&loans).
		Where("person_id = ?", personID).
		Order("begin DESC").
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// ============================== Scripts
// searches for similar strings in DB.Model([]db.Item)
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
		PersonID  int       `json:"person_id"`
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

func (h *Handler) BorrowCounter(c *gin.Context) {
	result, err := h.DB.Model(&db.Loans{}).Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count loans: " + err.Error()})
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) InsertNewItem(c *gin.Context) {
	type Input struct {
		Category  string `json:"category"`
		Name      string `json:"name"`
		Amount    int    `json:"amount"`
		Campus    string `json:"campus"`
		Building  string `json:"building"`
		Room      string `json:"room"`
		Shelf     string `json:"shelf"`
		ShelfUnit string `json:"shelf_unit"`
	}
	in := Input{}
	err := c.ShouldBindJSON(&in)
	if err != nil {
		log.Println(err)
	}

	item := &db.Item{
		Name:     in.Name,
		Category: in.Category,
	}

	h.DB.Model(&item).Insert()

	local := &db.Location{
		Campus:    in.Campus,
		Building:  in.Building,
		Room:      in.Room,
		Shelf:     in.Shelf,
		ShelfUnit: in.ShelfUnit,
	}

	h.DB.Model(&local).Insert()

	invent := &db.Inventory{
		LocationId: local.ID,
		ItemId:     item.ID,
		Amount:     in.Amount,
	}

	_, err = h.DB.Model(&invent).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert inventory: " + err.Error()})
	}
}

func (h *Handler) Events(c *gin.Context) {
	api, botID := slack1.SetupSlack(h.Cfg)
	var body slack1.Slackevents
	if err := c.ShouldBindJSON(&body); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	// Respond to URL verification challenge
	if body.Type == "url_verification" {
		c.JSON(http.StatusOK, gin.H{"challenge": body.Challenge})
		return
	}

	// Handle messages
	if body.Event.Type == "message" {
		// Ignore messages from bots (including itself)
		if body.Event.User == "" || botID == body.Event.User {
			c.Status(http.StatusOK)
			return
		}

		user := body.Event.User
		channel := body.Event.Channel
		text := body.Event.Text

		userInfo, err := api.GetUserInfo(user)
		if err != nil {
			log.Println("Error getting user info:", err)
		} else {
			fmt.Println("User ID:", userInfo.ID)
			fmt.Println("Username:", userInfo.Name)                    // e.g., "john_doe"
			fmt.Println("Display Name:", userInfo.Profile.DisplayName) // e.g., "John"
		}

		session, exists := slack1.Sessions[user]
		if !exists {
			session = &slack1.BorrowSession{Stage: "start"}
			slack1.Sessions[user] = session
		}

		handleMessage(h, api, channel, session, text, userInfo)
	}

	c.Status(http.StatusOK)
}

func (h *Handler) Interactivity(c *gin.Context) {
	// Slack sends the interaction payload as form data under the key "payload"
	api, _ := slack1.SetupSlack(h.Cfg)
	payload := c.PostForm("payload")
	if payload == "" {
		log.Println("Error: Missing 'payload' in form data.")
		c.Status(http.StatusBadRequest)
		return
	}

	var callback slack.InteractionCallback
	// Unmarshal the payload string into the struct
	if err := json.Unmarshal([]byte(payload), &callback); err != nil {
		log.Println("Error unmarshaling Slack payload:", err)
		c.Status(http.StatusBadRequest)
		return
	}

	// Reuse the api client from outer scope (already initialized with config)

	user := callback.User.ID
	session, exists := slack1.Sessions[user]
	userInfo, err := api.GetUserInfo(user)
	if err != nil {
		log.Println("Error getting user info:", err)
	} else {
		fmt.Println("User ID:", userInfo.ID)
		fmt.Println("Username:", userInfo.Name)
		fmt.Println("Display Name:", userInfo.Profile.DisplayName)
	}

	// Corrected stage check: slack1.go sets "awaiting_due_date"
	if !exists || session.Stage != "awaiting_due_date" {
		c.Status(http.StatusOK)
		return
	}

	for _, action := range callback.ActionCallback.BlockActions {
		if action.ActionID == "due_date_selected" {
			dueDate, err := time.Parse("2006-01-02", action.SelectedDate)
			if err != nil {
				api.PostMessage(callback.Channel.ID,
					slack.MsgOptionText("Invalid date. Please try again.", false))
				return
			}

			session.DueDate = dueDate

			// Confirm to user
			api.PostMessage(callback.Channel.ID,
				slack.MsgOptionText(
					fmt.Sprintf("✅ Got it! You want %d %s(s) from %s until %s. I’ll check and confirm!",
						session.Quantity, session.Item, session.Source, session.DueDate.Format("Jan 2, 2006")),
					false))

			// Save to DB
			db.SlackBorrow(h.Cfg, db.Borrow{
				Item:     session.Item,
				Amount:   session.Quantity,
				Location: session.Source,
				DueDate:  session.DueDate,
				UserID:   user,
				UserName: userInfo.Name,
			})

			_, _, err = api.PostMessage(
				session.GroupChannel,
				slack.MsgOptionText(
					fmt.Sprintf(
						"<@%s> borrowed *%d %s* (due %s).",
						userInfo.ID,
						session.Quantity,
						session.Item,
						session.DueDate.Format("Jan 2"),
					),
					false,
				),
			)
			if err != nil {
				log.Println("Error posting to group:", err)
			}

			session.Stage = "awaiting_item"
		}
	}

	c.Status(http.StatusOK)
}

func (h *Handler) BorrowHandler(c *gin.Context) {
	// Parse the slash command payload
	slackClient, _ := slack1.SetupSlack(h.Cfg)

	s, err := slack.SlashCommandParse(c.Request)
	if err != nil {
		c.String(http.StatusInternalServerError, "parse error")
		return
	}
	userID := s.UserID
	channelID := s.ChannelID

	session := &slack1.BorrowSession{
		Stage:        "start",
		GroupChannel: channelID, // e.g., from SlashCommand or event.Channel
	}
	slack1.Sessions[userID] = session

	// 1️⃣ Respond ephemerally in the group
	response := slack.Msg{
		ResponseType: "ephemeral",
		Text:         "Got it! I’ll DM you to finish your borrow request.",
	}
	c.JSON(http.StatusOK, response)

	// 2️⃣ Open DM channel
	im, _, _, err := slackClient.OpenConversation(&slack.OpenConversationParameters{
		Users: []string{userID},
	})
	if err != nil {
		log.Println("open DM error:", err)
		return
	}

	dmID := im.ID

	// 3️⃣ Send DM to user
	_, _, err = slackClient.PostMessage(dmID, slack.MsgOptionText(
		fmt.Sprintf("Hey <@%s>! Let’s set up your borrow. What item do you need?", userID), false))
	if err != nil {
		log.Println("DM send error:", err)
	}
}

func handleMessage(h *Handler, api *slack.Client, channel string, session *slack1.BorrowSession, text string, user *slack.User) {
	switch session.Stage {
	//case "start":
	//api.PostMessage(channel, slack.MsgOptionText("Hi! What would you like to borrow? (just the item name)", false))
	//session.Stage = "awaiting_item"

	case "awaiting_item":
		session.Item = text
		res, err := h.LocalSearchInventory(text)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Internal Error", false))
			return
		} else if len(res) == 0 {
			api.PostMessage(channel, slack.MsgOptionText("No item with this name found", false))
			return
		} else if res[0].ItemName != text {
			api.PostMessage(channel, slack.MsgOptionText(fmt.Sprintf("Did you meant %s? Then please correct it", res[0].ItemName), false))
			return
		}
		api.PostMessage(channel, slack.MsgOptionText("How many do you need?", false))
		session.Stage = "awaiting_quantity"

	case "awaiting_quantity":
		qty, err := strconv.Atoi(text)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Please enter a valid number.", false))
			return
		}
		res, err := h.LocalSearchItems(session.Item)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Internal Error", false))
			return
		}
		id := res[0].ID
		res2, err := h.LocalGetInventoryByItem(id)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Internal Error", false))
			return
		}
		count := 0
		for _, inv := range res2 {
			count += inv.Amount
		}
		if count < qty {
			api.PostMessage(channel, slack.MsgOptionText("Not enough of that items in storage. Please enter a smaller amount", false))
			return
		}
		session.Quantity = qty
		api.PostMessage(channel, slack.MsgOptionText("From where do you want to borrow it? (Campus;Building;Room)", false))
		session.Stage = "awaiting_source"

	case "awaiting_source":
		session.Source = text
		// Create the datepicker element
		datePicker := slack.NewDatePickerBlockElement("due_date_selected")
		datePicker.InitialDate = time.Now().Format("2006-01-02")

		// Text section explaining what to do
		textSection := slack.NewSectionBlock(
			slack.NewTextBlockObject("mrkdwn", "Please pick a due date:", false, false),
			nil,
			nil,
		)
		// Action block with the datepicker
		actionBlock := slack.NewActionBlock(
			"due_date_action",
			datePicker,
		)

		// Send the message
		api.PostMessage(channel,
			slack.MsgOptionBlocks(
				textSection,
				actionBlock,
			),
		)
		session.Stage = "awaiting_due_date"

	case "awaiting_due_date":
		layout := "2006-01-02"
		dueDate, err := time.Parse(layout, text)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Please enter the date in YYYY-MM-DD format.", false))
			return
		}
		if dueDate.Before(time.Now()) {
			api.PostMessage(channel, slack.MsgOptionText("Please enter a date later than today", false))
			return
		}
		session.DueDate = dueDate
		api.PostMessage(channel, slack.MsgOptionText(
			fmt.Sprintf("✅ Got it! You want %d %s(s) from %s until %s. I’ll check and confirm!",
				session.Quantity, session.Item, session.Source, session.DueDate.Format("Jan 2, 2006")),
			false))
		api.PostMessage(channel, slack.MsgOptionText("Type 'confirm' to finalize.", false))
		session.Stage = "confirm"
	case "confirm":
		if strings.ToLower(text) == "confirm" {
			db.SlackBorrow(h.Cfg, db.Borrow{
				Item:     session.Item,
				Amount:   session.Quantity,
				Location: session.Source,
				DueDate:  session.DueDate,
				UserID:   user.ID,
				UserName: user.Name,
			})
			_, _, err := api.PostMessage(
				session.GroupChannel,
				slack.MsgOptionText(
					fmt.Sprintf(
						"<@%s> borrowed *%d %s* (due %s).",
						user.ID,
						session.Quantity,
						session.Item,
						session.DueDate.Format("Jan 2"),
					),
					false,
				),
			)
			if err != nil {
				log.Println("Error posting to group:", err)
			}

		}
		session.Stage = "awaiting_item"

	}
}
