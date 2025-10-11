package api

import (
	"context"
	"crypto/tls"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"github.com/sashabaranov/go-openai"
	"github.com/slack-go/slack"
	"lagertool.com/main/chatbot"
	"lagertool.com/main/config"
	"lagertool.com/main/db"
	"lagertool.com/main/slack1"
	"lagertool.com/main/util"
)

type Handler struct {
	DB  *pg.DB
	Cfg *config.Config
	Ai  struct {
		Client    *openai.Client
		SysPrompt string
	}
}

func NewHandler(db *pg.DB, cfg *config.Config, Ai chatbot.ChatBot) *Handler {
	return &Handler{DB: db, Cfg: cfg, Ai: Ai}
}

// ============================================================================
// SHELF HANDLERS
// ============================================================================

// ShelfRequest represents the JSON structure for creating/updating shelves
type ShelfRequest struct {
	ID       string `json:"id" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Building string `json:"building" binding:"required"`
	Room     string `json:"room" binding:"required"`
	Columns  []struct {
		ID       string `json:"id" binding:"required"`
		Elements []struct {
			ID   string `json:"id" binding:"required"`
			Type string `json:"type" binding:"required"`
		} `json:"elements" binding:"required"`
	} `json:"columns" binding:"required"`
}

// ShelfResponse represents the JSON structure for returning shelves
type ShelfResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Building string `json:"building"`
	Room     string `json:"room"`
	NumItems int    `json:"numItems"`
	Columns  []struct {
		ID       string `json:"id"`
		NumItems int    `json:"numItems"`
		Elements []struct {
			ID       string `json:"id"`
			Type     string `json:"type"`
			NumItems int    `json:"numItems"`
		} `json:"elements"`
	} `json:"columns"`
}

// CreateShelf godoc
// @Summary Create a new shelf layout
// @Description Parse the JSON shelf definition and create the corresponding Shelf and ShelfUnit entries in the database
// @Tags shelves
// @Accept json
// @Produce json
// @Param shelf body ShelfRequest true "Shelf layout object"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /shelves [post]
func (h *Handler) CreateShelf(c *gin.Context) {
	var req ShelfRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Begin transaction
	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Close()

	// Create Shelf record
	shelf := &db.Shelf{
		ID:       req.ID,
		Name:     req.Name,
		Building: req.Building,
		Room:     req.Room,
	}

	_, err = tx.Model(shelf).Insert()
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shelf: " + err.Error()})
		return
	}

	// Create Column and ShelfUnit records
	for _, column := range req.Columns {
		// Create Column record
		col := &db.Column{
			ID:      column.ID,
			ShelfID: shelf.ID,
		}
		_, err = tx.Model(col).Insert()
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create column: " + err.Error()})
			return
		}

		for _, element := range column.Elements {
			unit := &db.ShelfUnit{
				ID:       element.ID,
				ColumnID: column.ID,
				Type:     element.Type,
			}

			_, err = tx.Model(unit).Insert()
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shelf unit: " + err.Error()})
				return
			}

			// Create Location record for inventory compatibility
			location := &db.Location{
				ShelfUnitID: element.ID,
			}
			_, err = tx.Model(location).Insert()
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create location: " + err.Error()})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Shelf created successfully", "shelf_id": shelf.ID})
}

// GetShelvesByBuilding godoc
// @Summary Get all shelves in a building
// @Description Retrieve all shelves for a specific building with their layout
// @Tags shelves
// @Produce json
// @Param building path string true "Building name"
// @Success 200 {array} ShelfResponse
// @Failure 500 {object} map[string]string
// @Router /shelves/building/{building} [get]
func (h *Handler) GetShelvesByBuilding(c *gin.Context) {
	building := c.Param("building")

	var shelves []db.Shelf
	err := h.DB.Model(&shelves).Where("building = ?", building).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build responses with units
	responses := make([]ShelfResponse, 0)
	for _, shelf := range shelves {
		resp := h.buildShelfResponse(shelf)
		responses = append(responses, resp)
	}

	c.JSON(http.StatusOK, responses)
}

// GetShelvesByRoom godoc
// @Summary Get all shelves in a room
// @Description Retrieve all shelves for a specific building and room with their layout
// @Tags shelves
// @Produce json
// @Param building path string true "Building name"
// @Param room path string true "Room name"
// @Success 200 {array} ShelfResponse
// @Failure 500 {object} map[string]string
// @Router /shelves/building/{building}/room/{room} [get]
func (h *Handler) GetShelvesByRoom(c *gin.Context) {
	building := c.Param("building")
	room := c.Param("room")

	var shelves []db.Shelf
	err := h.DB.Model(&shelves).Where("building = ? AND room = ?", building, room).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build responses with units
	responses := make([]ShelfResponse, 0)
	for _, shelf := range shelves {
		resp := h.buildShelfResponse(shelf)
		responses = append(responses, resp)
	}

	c.JSON(http.StatusOK, responses)
}

// GetAllShelves godoc
// @Summary Get all shelves
// @Description Retrieve all shelves from the database with their layouts
// @Tags shelves
// @Produce json
// @Success 200 {array} ShelfResponse
// @Failure 500 {object} map[string]string
// @Router /shelves [get]
func (h *Handler) GetAllShelves(c *gin.Context) {
	var shelves []db.Shelf
	err := h.DB.Model(&shelves).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build responses with units
	responses := make([]ShelfResponse, 0)
	for _, shelf := range shelves {
		resp := h.buildShelfResponse(shelf)
		responses = append(responses, resp)
	}

	c.JSON(http.StatusOK, responses)
}

// GetShelfByID godoc
// @Summary Get shelf by ID
// @Description Retrieve a specific shelf by its ID with full layout
// @Tags shelves
// @Produce json
// @Param id path string true "Shelf ID"
// @Success 200 {object} ShelfResponse
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /shelves/{id} [get]
func (h *Handler) GetShelfByID(c *gin.Context) {
	shelfID := c.Param("id")

	var shelf db.Shelf
	err := h.DB.Model(&shelf).Where("id = ?", shelfID).Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shelf not found"})
		return
	}

	resp := h.buildShelfResponse(shelf)
	c.JSON(http.StatusOK, resp)
}

// SearchShelfUnit godoc
// @Summary Search for a shelf unit by its ID
// @Description Find a shelf unit by its unique 5-letter ID (case-insensitive) and return its location details
// @Tags shelves
// @Produce json
// @Param id path string true "Shelf Unit ID (5-letter code, case-insensitive)"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /shelves/unit/{id} [get]
func (h *Handler) SearchShelfUnit(c *gin.Context) {
	unitID := c.Param("id")

	var unit db.ShelfUnit
	err := h.DB.Model(&unit).Where("UPPER(id) = UPPER(?)", unitID).Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shelf unit not found"})
		return
	}

	// Get the column details
	var column db.Column
	err = h.DB.Model(&column).Where("id = ?", unit.ColumnID).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get column details"})
		return
	}

	// Get the shelf details
	var shelf db.Shelf
	err = h.DB.Model(&shelf).Where("id = ?", column.ShelfID).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get shelf details"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"unit_id":    unit.ID,
		"type":       unit.Type,
		"column_id":  column.ID,
		"shelf_id":   shelf.ID,
		"shelf_name": shelf.Name,
		"building":   shelf.Building,
		"room":       shelf.Room,
	})
}

// ShelfUnitInventoryItem represents an inventory item in a shelf unit with borrow status
type ShelfUnitInventoryItem struct {
	InventoryID int        `json:"inventory_id"`
	ItemID      int        `json:"item_id"`
	ItemName    string     `json:"item_name"`
	Category    string     `json:"category"`
	Amount      int        `json:"amount"`
	Note        string     `json:"note"`
	Borrowed    int        `json:"borrowed"`     // Amount currently borrowed
	Available   int        `json:"available"`    // Amount available (not borrowed)
	ActiveLoans []LoanInfo `json:"active_loans"` // Active loans for this item
}

// LoanInfo represents loan details for an item
type LoanInfo struct {
	LoanID     int       `json:"loan_id"`
	PersonID   int       `json:"person_id"`
	PersonName string    `json:"person_name"`
	Amount     int       `json:"amount"`
	Begin      time.Time `json:"begin"`
	Until      time.Time `json:"until"`
	IsOverdue  bool      `json:"is_overdue"`
}

// GetShelfUnitInventory godoc
// @Summary Get inventory in a shelf unit
// @Description Retrieve all inventory items in a specific shelf unit by its 5-letter ID (case-insensitive), including borrow status and active loans
// @Tags shelves
// @Produce json
// @Param id path string true "Shelf Unit ID (5-letter code, case-insensitive)"
// @Success 200 {array} ShelfUnitInventoryItem
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /shelves/unit/{id}/inventory [get]
func (h *Handler) GetShelfUnitInventory(c *gin.Context) {
	unitID := c.Param("id")

	// Verify shelf unit exists (case-insensitive)
	var unit db.ShelfUnit
	err := h.DB.Model(&unit).Where("UPPER(id) = UPPER(?)", unitID).Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shelf unit not found"})
		return
	}

	// Find location for this shelf unit (use actual unit.ID from DB for exact match)
	var location db.Location
	err = h.DB.Model(&location).Where("shelf_unit_id = ?", unit.ID).Select()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Location not found for shelf unit"})
		return
	}

	// Get all inventory items in this location
	var inventoryRecords []db.Inventory
	err = h.DB.Model(&inventoryRecords).
		Where("location_id = ?", location.ID).
		Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build response with borrow status
	var results []ShelfUnitInventoryItem
	now := time.Now()

	for _, inv := range inventoryRecords {
		// Get item details
		var item db.Item
		err = h.DB.Model(&item).Where("id = ?", inv.ItemId).Select()
		if err != nil {
			continue
		}

		// Get active loans for this item
		var loans []db.Loans
		err = h.DB.Model(&loans).
			Where("item_id = ? AND returned = ?", inv.ItemId, false).
			Select()
		if err != nil {
			loans = []db.Loans{}
		}

		// Calculate borrowed amount and build loan info
		totalBorrowed := 0
		var activeLoanInfos []LoanInfo

		for _, loan := range loans {
			totalBorrowed += loan.Amount

			// Get person details
			var person db.Person
			err = h.DB.Model(&person).Where("id = ?", loan.PersonID).Select()
			personName := "Unknown"
			if err == nil {
				personName = person.Firstname + " " + person.Lastname
			}

			isOverdue := loan.Until.Before(now)

			activeLoanInfos = append(activeLoanInfos, LoanInfo{
				LoanID:     loan.ID,
				PersonID:   loan.PersonID,
				PersonName: personName,
				Amount:     loan.Amount,
				Begin:      loan.Begin,
				Until:      loan.Until,
				IsOverdue:  isOverdue,
			})
		}

		available := inv.Amount - totalBorrowed
		if available < 0 {
			available = 0
		}

		results = append(results, ShelfUnitInventoryItem{
			InventoryID: inv.ID,
			ItemID:      item.ID,
			ItemName:    item.Name,
			Category:    item.Category,
			Amount:      inv.Amount,
			Note:        inv.Note,
			Borrowed:    totalBorrowed,
			Available:   available,
			ActiveLoans: activeLoanInfos,
		})
	}

	c.JSON(http.StatusOK, results)
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
		Category    string `json:"category"`
		Name        string `json:"name"`
		Amount      int    `json:"amount"`
		ShelfUnitID string `json:"shelf_unit_id"` // 5-letter shelf unit ID
	}
	in := Input{}
	err := c.ShouldBindJSON(&in)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Verify shelf unit exists
	var shelfUnit db.ShelfUnit
	err = h.DB.Model(&shelfUnit).Where("id = ?", in.ShelfUnitID).Select()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Shelf unit not found"})
		return
	}

	// Create item
	item := &db.Item{
		Name:     in.Name,
		Category: in.Category,
	}
	_, err = h.DB.Model(&item).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert item: " + err.Error()})
		return
	}

	// Find location for this shelf unit
	var location db.Location
	err = h.DB.Model(&location).Where("shelf_unit_id = ?", in.ShelfUnitID).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Location not found for shelf unit"})
		return
	}

	// Create inventory record
	invent := &db.Inventory{
		LocationId: location.ID,
		ItemId:     item.ID,
		Amount:     in.Amount,
	}

	_, err = h.DB.Model(&invent).Insert()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert inventory: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":       "Item created successfully",
		"item_id":       item.ID,
		"location_id":   location.ID,
		"inventory_id":  invent.ID,
		"shelf_unit_id": in.ShelfUnitID,
	})
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

// GetDownloadICS godoc
// @Summary Download calendar file for a specific loan
// @Description Downloads an iCalendar (.ics) file for a specific loan containing a reminder to return the item
// @Tags calendar
// @Produce text/calendar
// @Param id path int true "Loan ID"
// @Success 200 {string} string "ICS file content"
// @Failure 400 {string} string "Invalid loan ID"
// @Router /calendar/{id} [get]
func (h *Handler) GetDownloadICS(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.String(http.StatusBadRequest, "invalid loan id")
	}
	loan, err := h.LocalGetLoanByID(id)
	if err != nil {
		return
	}
	item, err := h.LocalGetItemByID(loan.ItemID)
	if err != nil {
		return
	}
	end := loan.Until
	if loan.Returned {
		end = *loan.ReturnedAt
	}
	icsContent := util.GenerateICSContent(item.Name, "Return item", loan.Begin, end)

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.ics", strings.ReplaceAll(item.Name, " ", "_")))
	c.Header("Content-Type", "text/calendar; charset=utf-8")

	// Write ICS content
	c.String(http.StatusOK, icsContent)
}

// GetDownloadICSALL godoc
// @Summary Download calendar file for all loans
// @Description Downloads an iCalendar (.ics) file containing all loan records with reminders to return items
// @Tags calendar
// @Produce text/calendar
// @Success 200 {string} string "ICS file content with all loan events"
// @Router /calendar/all [get]
func (h *Handler) GetDownloadICSALL(c *gin.Context) {

	loans, err := h.LocalGetAllLoans()
	if err != nil {
		return
	}
	var events []util.Events
	for _, loan := range loans {
		item, err := h.LocalGetItemByID(loan.ItemID)
		if err != nil {
			return
		}
		end := loan.Until
		if loan.Returned {
			end = *loan.ReturnedAt
		}

		events = append(events, util.Events{loan.Begin, end, "Return Item", item.Name})
	}
	icsContent := util.GenerateICSForDates(events)

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.ics", strings.ReplaceAll(events[0].Description, " ", "_")))
	c.Header("Content-Type", "text/calendar; charset=utf-8")

	// Write ICS content
	c.String(http.StatusOK, icsContent)
}

type RoomData struct {
	Name     string  `json:"name"`
	Campus   string  `json:"campus"`
	Building string  `json:"building"`
	Room     string  `json:"room"`
	Amount   float64 `json:"amount"`
}

func (h *Handler) BulkAddCSV(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file not provided"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot open file"})
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	rows, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid CSV"})
		return
	}

	inserted := 0
	for i, row := range rows {
		if i == 0 {
			continue // skip header
		}
		if len(row) < 5 {
			continue
		}

		name := row[0]
		campus := row[1]
		building := row[2]
		room := row[3]
		amount, _ := strconv.Atoi(row[4])

		// 1. Ensure Item exists
		item := &db.Item{}
		err := h.DB.Model(item).Where("name = ?", name).Select()
		if err != nil { // if not found, create
			item = &db.Item{Name: name, Category: "Uncategorized"}
			_, err = h.DB.Model(item).Insert()
			if err != nil {
				fmt.Println("Error inserting item:", err)
				continue
			}
		}

		// 2. Ensure Shelf exists (use Name+Building+Room as unique ID)
		shelfID := fmt.Sprintf("%s-%s-%s", building, room, name)
		shelf := &db.Shelf{}
		err = h.DB.Model(db.Location{}).Where("building = ", building).Where("campus = ", campus).Where("room = ", room).Where("shelf_id = ?", shelfID).Select()
		if err != nil { // create if not exists
			shelf = &db.Shelf{ID: shelfID, Name: name, Building: building, Room: room}
			_, err = h.DB.Model(shelf).Insert()
			if err != nil {
				fmt.Println("Error inserting shelf:", err)
				continue
			}
		}

		// 3. Ensure a Column exists for Shelf (simplify: single column "C1")
		columnID := shelfID + "-C1"
		column := &db.Column{}
		err = h.DB.Model(column).Where("id = ?", columnID).Select()
		if err != nil {
			column = &db.Column{ID: columnID, ShelfID: shelfID}
			h.DB.Model(column).Insert()
		}

		// 4. Ensure a ShelfUnit exists (simplify: single unit "U1" type "high")
		unitID := columnID + "-U1"
		unit := &db.ShelfUnit{}
		err = h.DB.Model(unit).Where("id = ?", unitID).Select()
		if err != nil {
			unit = &db.ShelfUnit{ID: unitID, ColumnID: columnID, Type: "high"}
			h.DB.Model(unit).Insert()
		}

		// 5. Ensure Location exists
		location := &db.Location{}
		err = h.DB.Model(location).Where("shelf_unit_id = ?", unitID).Select()
		if err != nil {
			location = &db.Location{ShelfUnitID: unitID}
			h.DB.Model(location).Insert()
		}

		// 6. Insert Inventory
		inv := &db.Inventory{
			LocationId: location.ID,
			ItemId:     item.ID,
			Amount:     amount,
			Note:       "",
		}
		_, err = h.DB.Model(inv).Insert()
		if err != nil {
			fmt.Println("Error inserting inventory:", err)
			continue
		}

		inserted++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "CSV processed",
		"inserted": inserted,
	})
}

func callAPIhelper(client *http.Client, url string) (string, error) {
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(body), nil

}

func callInternalAPI(action string, params map[string]string) (string, error) {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
	}
	client := &http.Client{Transport: tr}

	switch action {
	case "get_items":

		return callAPIhelper(client, "https://05.hackathon.ethz.ch/api/items")
	case "get_inventory":
		return callAPIhelper(client, "https://05.hackathon.ethz.ch/api/inventory")
	case "get_locations":
		return callAPIhelper(client, "https://05.hackathon.ethz.ch/api/locations")
	case "get_loans":
		return callAPIhelper(client, "https://05.hackathon.ethz.ch/api/loans")
	case "get_shelves":
		return callAPIhelper(client, "https://05.hackathon.ethz.ch/api/shelves")
	case "get_persons":
		return callAPIhelper(client, "https://05.hackathon.ethz.ch/api/persons")
	case "none":
		return "", nil
	default:
		return "", fmt.Errorf("unknown action: %s", action)
	}
}

// Refactored ChatHandler to perform a second AI call to interpret API data.
func (h *Handler) ChatHandler(c *gin.Context) {
	var req struct {
		Message string `json:"message"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx := context.Background()

	// --- Step 1: Call AI to determine action (Tool Call) ---
	firstResp, err := h.Ai.Client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: openai.GPT4oMini,
			Messages: []openai.ChatCompletionMessage{
				{Role: "system", Content: h.Ai.SysPrompt},
				{Role: "user", Content: req.Message},
			},
			ResponseFormat: &openai.ChatCompletionResponseFormat{
				Type: openai.ChatCompletionResponseFormatTypeJSONObject,
			},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI decision error: %v", err)})
		return
	}

	var tool chatbot.ToolCall
	if err := json.Unmarshal([]byte(firstResp.Choices[0].Message.Content), &tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "bad AI JSON for tool decision"})
		return
	}

	// Default reply is the initial reply from the AI
	finalReply := tool.Reply

	// --- Step 2: Perform API call if needed ---
	if tool.Action != "none" {
		data, err := callInternalAPI(tool.Action, tool.Params)

		if err != nil {
			// If API call fails, just append an error message to the AI's initial reply
			finalReply += fmt.Sprintf("\n\n(I tried calling your API but got an error: %v)", err)
		} else {
			// If API call succeeds, perform the second AI call for interpretation

			// --- Step 3: Call AI again to interpret the data (Natural Language Generation) ---

			// Construct messages for the interpretation call
			messages := []openai.ChatCompletionMessage{
				// System prompt is kept general, focusing on role
				{Role: "system", Content: "You are an assistant. The user asked a question, and a tool was called. Your job now is to analyze the tool's raw output (provided below) and generate a single, final, user-friendly, natural language response based on it. Do not use JSON."},

				// The raw data is provided as a system message to the model
				{Role: "system", Content: fmt.Sprintf("Tool %s completed. Raw Data:\n%s", tool.Action, data)},

				// Add the original user message for context
				{Role: "user", Content: req.Message},
			}

			secondResp, interpretErr := h.Ai.Client.CreateChatCompletion(
				ctx,
				openai.ChatCompletionRequest{
					Model:    openai.GPT4oMini,
					Messages: messages,
					// No ResponseFormat is specified, defaulting to natural text
				},
			)

			if interpretErr != nil {
				log.Printf("AI interpretation error: %v", interpretErr)
				// Fallback: If the interpretation call fails, return the raw data with an explanation
				finalReply = fmt.Sprintf("I retrieved the data, but the AI failed to format it (Error: %v). Here is the raw data:\n%s", interpretErr, data)
			} else {
				// Success! Use the natural language reply from the second call
				finalReply = secondResp.Choices[0].Message.Content
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"reply": finalReply})
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
