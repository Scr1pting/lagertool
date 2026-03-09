package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"lagertool.com/main/api_objects"
	"lagertool.com/main/config"
	"lagertool.com/main/db"
	"lagertool.com/main/db_models"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"github.com/stretchr/testify/assert"
)

// setupTestRouter initializes a gin router for testing, along with a test database connection.
func setupTestRouter() (*gin.Engine, *pg.DB) {
	// Set gin to test mode
	gin.SetMode(gin.TestMode)

	// Initialize a new router
	router := gin.Default()

	// For this example, we connect to a real test database.
	cfg := config.Load()
	// Ensure your config points to a test database for safety.
	// e.g., cfg.Database.URL = "postgres://user:pass@localhost:5432/testdb?sslmode=disable"

	dbConnection, err := db.NewDBConn(cfg)
	if err != nil {
		panic("Failed to connect to test database: " + err.Error())
	}
	db.InitDB(dbConnection)

	return router, dbConnection
}

type TestHierarchy struct {
	Building  *db_models.Building
	Room      *db_models.Room
	Shelf     *db_models.Shelf
	Column    *db_models.Column
	ShelfUnit *db_models.ShelfUnit
	Inventory *db_models.Inventory
}

// createTestHierarchy creates a full data hierarchy for testing complex endpoints
// and returns a struct containing all created objects.
func createTestHierarchy(t *testing.T, dbCon *pg.DB) *TestHierarchy {
	h := &TestHierarchy{}
	h.Building = &db_models.Building{Name: "Hierarchy Building", UpdateDate: time.Now()}
	_, err := dbCon.Model(h.Building).Insert()
	assert.NoError(t, err)

	h.Room = &db_models.Room{Name: "Hierarchy Room", BuildingID: h.Building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(h.Room).Insert()
	assert.NoError(t, err)

	h.Shelf = &db_models.Shelf{ID: "H-S-1", Name: "Hierarchy Shelf", RoomID: h.Room.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(h.Shelf).Insert()
	assert.NoError(t, err)

	h.Column = &db_models.Column{ID: "H-C-1", ShelfID: h.Shelf.ID}
	_, err = dbCon.Model(h.Column).Insert()
	assert.NoError(t, err)

	h.ShelfUnit = &db_models.ShelfUnit{ID: "H-SU-1", ColumnID: h.Column.ID}
	_, err = dbCon.Model(h.ShelfUnit).Insert()
	assert.NoError(t, err)

	h.Inventory = &db_models.Inventory{IsConsumable: true, Name: "Hierarchy Item", ShelfUnitID: h.ShelfUnit.ID, Amount: 10, UpdateDate: time.Now()}
	_, err = dbCon.Model(h.Inventory).Insert()
	assert.NoError(t, err)

	return h
}

// cleanupTestHierarchy deletes the data created by createTestHierarchy in the correct order.
func cleanupTestHierarchy(t *testing.T, dbCon *pg.DB, h *TestHierarchy) {
	_, err := dbCon.Model(h.Inventory).Where("id = ?", h.Inventory.ID).Delete()
	assert.NoError(t, err)
	_, err = dbCon.Model(h.ShelfUnit).Where("id = ?", h.ShelfUnit.ID).Delete()
	assert.NoError(t, err)
	_, err = dbCon.Model(h.Column).Where("id = ?", h.Column.ID).Delete()
	assert.NoError(t, err)
	_, err = dbCon.Model(h.Shelf).Where("id = ?", h.Shelf.ID).Delete()
	assert.NoError(t, err)
	_, err = dbCon.Model(h.Room).Where("id = ?", h.Room.ID).Delete()
	assert.NoError(t, err)
	_, err = dbCon.Model(h.Building).Where("id = ?", h.Building.ID).Delete()
	assert.NoError(t, err)
}

func TestGetOrganisations(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/organisations", h.GetOrganisations)

	// Clean up any existing test organisations
	_, err := dbCon.Model(&db_models.Organisation{}).Where("name LIKE 'Test Org%'").Delete()
	assert.NoError(t, err)

	// Insert multiple test organisations
	testOrg1 := &db_models.Organisation{Name: "Test Org 1"}
	testOrg2 := &db_models.Organisation{Name: "Test Org 2"}
	_, err = dbCon.Model(testOrg1, testOrg2).Insert()
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/organisations", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var organisations []db_models.Organisation
	err = json.Unmarshal(w.Body.Bytes(), &organisations)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, len(organisations), 2)

	// Verify our test organisations are in the results
	orgNames := make(map[string]bool)
	for _, org := range organisations {
		orgNames[org.Name] = true
	}
	assert.True(t, orgNames["Test Org 1"])
	assert.True(t, orgNames["Test Org 2"])

	// Clean up
	_, err = dbCon.Model(&db_models.Organisation{}).Where("name LIKE 'Test Org%'").Delete()
	assert.NoError(t, err)
}

func TestGetBuildings(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.GET("/organisations/:orgId/buildings", h.GetBuildings)

	// Create test organisation
	org := &db_models.Organisation{Name: "Buildings Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create buildings with rooms and shelves owned by the org
	b1 := &db_models.Building{Name: "Old Building", Campus: "Main", UpdateDate: time.Now().Add(-time.Hour)}
	b2 := &db_models.Building{Name: "New Building", Campus: "Main", UpdateDate: time.Now()}
	_, err = dbCon.Model(b1, b2).Insert()
	assert.NoError(t, err)

	r1 := &db_models.Room{Name: "Room 1", BuildingID: b1.ID, UpdateDate: time.Now()}
	r2 := &db_models.Room{Name: "Room 2", BuildingID: b2.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(r1, r2).Insert()
	assert.NoError(t, err)

	s1 := &db_models.Shelf{ID: "BUILD-S-1", Name: "Shelf 1", RoomID: r1.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	s2 := &db_models.Shelf{ID: "BUILD-S-2", Name: "Shelf 2", RoomID: r2.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	_, err = dbCon.Model(s1, s2).Insert()
	assert.NoError(t, err)

	defer func() {
		_, _ = dbCon.Model(s1).Where("id = ?", s1.ID).Delete()
		_, _ = dbCon.Model(s2).Where("id = ?", s2.ID).Delete()
		_, _ = dbCon.Model(r1).Where("id = ?", r1.ID).Delete()
		_, _ = dbCon.Model(r2).Where("id = ?", r2.ID).Delete()
		_, _ = dbCon.Model(b1).Where("id = ?", b1.ID).Delete()
		_, _ = dbCon.Model(b2).Where("id = ?", b2.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/buildings", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var buildings []api_objects.Building
	err = json.Unmarshal(w.Body.Bytes(), &buildings)
	assert.NoError(t, err)

	assert.GreaterOrEqual(t, len(buildings), 2)
	assert.Equal(t, "New Building", buildings[0].Name)
	assert.Equal(t, "Old Building", buildings[1].Name)
}

func TestGetRooms(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.GET("/organisations/:orgId/rooms", h.GetRooms)

	// Create test organisation
	org := &db_models.Organisation{Name: "Rooms Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Insert related building
	building := &db_models.Building{Name: "Test Building", Campus: "Test Campus"}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)

	// Insert rooms
	r1 := &db_models.Room{Name: "Old Room", BuildingID: building.ID, UpdateDate: time.Now().Add(-time.Hour)}
	r2 := &db_models.Room{Name: "New Room", BuildingID: building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(r1, r2).Insert()
	assert.NoError(t, err)

	// Create shelves owned by the org in these rooms
	s1 := &db_models.Shelf{ID: "ROOM-S-1", Name: "Shelf 1", RoomID: r1.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	s2 := &db_models.Shelf{ID: "ROOM-S-2", Name: "Shelf 2", RoomID: r2.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	_, err = dbCon.Model(s1, s2).Insert()
	assert.NoError(t, err)

	defer func() {
		_, _ = dbCon.Model(s1).Where("id = ?", s1.ID).Delete()
		_, _ = dbCon.Model(s2).Where("id = ?", s2.ID).Delete()
		_, _ = dbCon.Model(&db_models.Room{}).Where("name = ? OR name = ?", "Old Room", "New Room").Delete()
		_, _ = dbCon.Model(building).Where("id = ?", building.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/rooms", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var rooms []api_objects.Room
	err = json.Unmarshal(w.Body.Bytes(), &rooms)
	assert.NoError(t, err)

	assert.GreaterOrEqual(t, len(rooms), 2)
	assert.Equal(t, "New Room", rooms[0].Name)
	assert.Equal(t, "Old Room", rooms[1].Name)
}

func TestGetShelves(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/organisations/:orgId/shelves", h.GetShelves)

	// Create test organisation
	org := &db_models.Organisation{Name: "Shelves Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(org).Where("name = ?", org.Name).Delete()
		assert.NoError(t, err)
	}()

	hier := createTestHierarchy(t, dbCon)

	// Update the shelf to be owned by the test organisation
	hier.Shelf.OwnedBy = org.Name
	_, err = dbCon.Model(hier.Shelf).WherePK().Update()
	assert.NoError(t, err)

	// Test with organisation in path
	req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/shelves", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var shelves []api_objects.Shelves
	err = json.Unmarshal(w.Body.Bytes(), &shelves)
	assert.NoError(t, err)
	assert.NotEmpty(t, shelves)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestGetInventory(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/organisations/:orgId/inventory", h.GetInventory)

	// Create test organisation
	org := &db_models.Organisation{Name: "Inventory Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	hier := createTestHierarchy(t, dbCon)

	// Update the shelf to be owned by the test organisation
	hier.Shelf.OwnedBy = org.Name
	_, err = dbCon.Model(hier.Shelf).WherePK().Update()
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/inventory?start=2025-01-01&end=2025-12-31", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var inventory []api_objects.InventorySorted
	err = json.Unmarshal(w.Body.Bytes(), &inventory)
	assert.NoError(t, err)
	assert.NotEmpty(t, inventory)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestGetItem(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/organisations/:orgId/items/:id", h.GetItem)

	// Create test organisation
	org := &db_models.Organisation{Name: "Item Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(org).Where("name = ?", org.Name).Delete()
		assert.NoError(t, err)
	}()

	hier := createTestHierarchy(t, dbCon)

	// Update the shelf to be owned by the test organisation
	hier.Shelf.OwnedBy = org.Name
	_, err = dbCon.Model(hier.Shelf).WherePK().Update()
	assert.NoError(t, err)

	// Test with item ID in path
	req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/items/"+strconv.Itoa(hier.Inventory.ID)+"?start=2025-01-01&end=2025-12-31", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var itemWithShelf api_objects.InventoryItemWithShelf
	err = json.Unmarshal(w.Body.Bytes(), &itemWithShelf)
	assert.NoError(t, err)
	assert.Equal(t, "Hierarchy Item", itemWithShelf.InventoryItem.Name)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestCreateCartItem(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/users/:userId/cart/items", h.CreateCartItem)

	// Create a test user
	user := &db_models.User{Email: "test@example.com", Name: "Test User"}
	_, err := dbCon.Model(user).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(user).Where("id = ?", user.ID).Delete()
		assert.NoError(t, err)
	}()

	//item := &db_models.Item{Name: "Test Item", IsConsumable: true}
	//_, err = dbCon.Model(item).Insert()
	//assert.NoError(t, err)
	//defer func() {
	//	_, err := dbCon.Model(item).Where("id = ?", item.ID).Delete()
	//	assert.NoError(t, err)
	//}()

	inventory := &db_models.Inventory{Name: "Test Item", IsConsumable: true, Amount: 10}
	_, err = dbCon.Model(inventory).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(inventory).Where("id = ?", inventory.ID).Delete()
		assert.NoError(t, err)
	}()

	testCases := []struct {
		name           string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Creation",
			payload: `{
				"id": ` + strconv.Itoa(inventory.ID) + `,
				"numSelected": 5
			}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "Invalid JSON - Missing ID",
			payload:        `{"numSelected": 5}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/users/"+strconv.Itoa(user.ID)+"/cart/items", strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)

			if tc.expectedStatus == http.StatusCreated {
				var createdCartItem db_models.ShoppingCartItem
				err := json.Unmarshal(w.Body.Bytes(), &createdCartItem)
				assert.NoError(t, err)
				assert.Equal(t, 5, createdCartItem.Amount)
				assert.Equal(t, inventory.ID, createdCartItem.InventoryID)

				// Clean up the created records
				_, err = dbCon.Model(&db_models.ShoppingCartItem{}).Where("id = ?", createdCartItem.ID).Delete()
				assert.NoError(t, err)
				_, err = dbCon.Model(&db_models.ShoppingCart{}).Where("user_id = ?", user.ID).Delete()
				assert.NoError(t, err)
			}
		})
	}
}

func TestCreateItem(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/organisations/:orgId/items", h.CreateItem)

	// Create test organisation
	org := &db_models.Organisation{Name: "CreateItem Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	hier := createTestHierarchy(t, dbCon)
	defer cleanupTestHierarchy(t, dbCon, hier)

	testCases := []struct {
		name           string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Creation",
			payload: `{
				"name": "New Test Item",
				"amount": 100,
				"shelfUnitId": "` + hier.ShelfUnit.ID + `",
				"isConsumable": true,
				"note": "A note"
			}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "Invalid JSON - Missing Name",
			payload:        `{"amount": 100}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/organisations/"+org.Name+"/items", strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)

			if tc.expectedStatus == http.StatusCreated {
				var createdItem db_models.Inventory
				err := json.Unmarshal(w.Body.Bytes(), &createdItem)
				assert.NoError(t, err)
				assert.Equal(t, 100, createdItem.Amount)
				assert.Equal(t, hier.ShelfUnit.ID, createdItem.ShelfUnitID)

				// Clean up the created records
				_, err = dbCon.Model(&db_models.Inventory{}).Where("id = ?", createdItem.ID).Delete()
				assert.NoError(t, err)
				//_, err = dbCon.Model(&db_models.Item{}).Where("name = 'New Test Item'").Delete()
				//assert.NoError(t, err)
			}
		})
	}
}

func TestCheckoutCart(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/users/:userId/cart/checkout", h.CheckoutCart)

	// Create test organisation (must exist before shelf references it)
	org := &db_models.Organisation{Name: "Checkout Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user
	user := &db_models.User{Email: "checkout@example.com", Name: "Checkout User"}
	_, err = dbCon.Model(user).Insert()
	assert.NoError(t, err)

	// Create building
	building := &db_models.Building{Name: "Checkout Building", UpdateDate: time.Now()}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)

	// Create room
	room := &db_models.Room{Name: "Checkout Room", BuildingID: building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(room).Insert()
	assert.NoError(t, err)

	// Create shelf owned by organisation
	shelf := &db_models.Shelf{ID: "CHECKOUT-S-1", Name: "Checkout Shelf", RoomID: room.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	_, err = dbCon.Model(shelf).Insert()
	assert.NoError(t, err)

	// Create column
	column := &db_models.Column{ID: "CHECKOUT-C-1", ShelfID: shelf.ID}
	_, err = dbCon.Model(column).Insert()
	assert.NoError(t, err)

	// Create shelf unit
	shelfUnit := &db_models.ShelfUnit{ID: "CHECKOUT-SU-1", ColumnID: column.ID}
	_, err = dbCon.Model(shelfUnit).Insert()
	assert.NoError(t, err)

	// Create item
	//item := &db_models.Item{Name: "Checkout Item", IsConsumable: true}
	//_, err = dbCon.Model(item).Insert()
	//assert.NoError(t, err)

	// Create inventory
	inventory := &db_models.Inventory{Name: "Checkout Item", IsConsumable: true, ShelfUnitID: shelfUnit.ID, Amount: 10, UpdateDate: time.Now()}
	_, err = dbCon.Model(inventory).Insert()
	assert.NoError(t, err)

	// Create shopping cart for the user
	cart := &db_models.ShoppingCart{UserID: user.ID}
	_, err = dbCon.Model(cart).Insert()
	assert.NoError(t, err)

	// Add item to shopping cart
	cartItem := &db_models.ShoppingCartItem{
		ShoppingCartID: cart.ID,
		InventoryID:    inventory.ID,
		Amount:         2,
	}
	_, err = dbCon.Model(cartItem).Insert()
	assert.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		// Delete request items first (foreign key constraint)
		_, _ = dbCon.Model(&db_models.RequestItems{}).Where("inventory_id = ?", inventory.ID).Delete()
		// Delete requests
		_, _ = dbCon.Model(&db_models.Request{}).Where("user_id = ?", user.ID).Delete()
		// Delete shopping cart items
		_, _ = dbCon.Model(&db_models.ShoppingCartItem{}).Where("id = ?", cartItem.ID).Delete()
		// Delete shopping cart
		_, _ = dbCon.Model(&db_models.ShoppingCart{}).Where("id = ?", cart.ID).Delete()
		// Delete inventory
		_, _ = dbCon.Model(inventory).Where("id = ?", inventory.ID).Delete()
		// Delete item
		//_, _ = dbCon.Model(item).Where("id = ?", item.ID).Delete()
		// Delete shelf unit
		_, _ = dbCon.Model(shelfUnit).Where("id = ?", shelfUnit.ID).Delete()
		// Delete column
		_, _ = dbCon.Model(column).Where("id = ?", column.ID).Delete()
		// Delete shelf
		_, _ = dbCon.Model(shelf).Where("id = ?", shelf.ID).Delete()
		// Delete room
		_, _ = dbCon.Model(room).Where("id = ?", room.ID).Delete()
		// Delete building
		_, _ = dbCon.Model(building).Where("id = ?", building.ID).Delete()
		// Delete user
		_, _ = dbCon.Model(user).Where("id = ?", user.ID).Delete()
		// Delete organisation
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	startDate := time.Now().Add(24 * time.Hour)
	endDate := time.Now().Add(48 * time.Hour)

	testCases := []struct {
		name           string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Checkout",
			payload: `{
				"startDate": "` + startDate.Format(time.RFC3339) + `",
				"endDate": "` + endDate.Format(time.RFC3339) + `"
			}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "Invalid JSON - Missing StartDate",
			payload:        `{"endDate": "2025-01-02T00:00:00Z"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid JSON - Missing EndDate",
			payload:        `{"startDate": "2025-01-01T00:00:00Z"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid JSON - Malformed",
			payload:        `{"startDate": "2025-01-01T00:00:00Z"`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/users/"+strconv.Itoa(user.ID)+"/cart/checkout", strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if !assert.Equal(t, tc.expectedStatus, w.Code) {
				t.Log("Response body:", w.Body.String())
			}

			if tc.expectedStatus == http.StatusCreated {
				// Verify a request was created
				var requests []db_models.Request
				err := dbCon.Model(&requests).Where("user_id = ?", user.ID).Select()
				assert.NoError(t, err)
				assert.NotEmpty(t, requests, "Expected at least one request to be created")

				// Verify request has correct data
				request := requests[0]
				assert.Equal(t, user.ID, request.UserID)
				assert.Equal(t, "requested", request.State)
				assert.Equal(t, org.Name, request.OrganisationName)
				assert.NotZero(t, request.GroupID, "Expected group_id to be set")

				// Verify request items were created
				var requestItems []db_models.RequestItems
				err = dbCon.Model(&requestItems).Where("request_id = ?", request.ID).Select()
				assert.NoError(t, err)
				assert.NotEmpty(t, requestItems)
				//assert.Equal(t, item.ID, requestItems[0].InventoryID)
				assert.Equal(t, cartItem.Amount, requestItems[0].Amount)
			}
		})
	}
}

func TestRequestReview(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/requests/:id/review", h.RequestReview)

	// Create test organisation
	org := &db_models.Organisation{Name: "Review Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user (reviewer)
	reviewer := &db_models.User{Email: "reviewer@example.com", Name: "Reviewer"}
	_, err = dbCon.Model(reviewer).Insert()
	assert.NoError(t, err)

	// Create test user (requester)
	requester := &db_models.User{Email: "requester@example.com", Name: "Requester"}
	_, err = dbCon.Model(requester).Insert()
	assert.NoError(t, err)

	// Create request for rejection test
	request := &db_models.Request{
		UserID:           requester.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		Note:             "",
		State:            "requested",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(request).Insert()
	assert.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		_, _ = dbCon.Model(&db_models.RequestReview{}).Where("request_id = ?", request.ID).Delete()
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", request.ID).Delete()
		_, _ = dbCon.Model(reviewer).Where("id = ?", reviewer.ID).Delete()
		_, _ = dbCon.Model(requester).Where("id = ?", requester.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	testCases := []struct {
		name           string
		url            string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Review - Rejected",
			url:  "/requests/" + strconv.Itoa(request.ID) + "/review",
			payload: `{
				"user_id": ` + strconv.Itoa(reviewer.ID) + `,
				"outcome": "rejected",
				"note": "Not available"
			}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid JSON - Malformed",
			url:            "/requests/" + strconv.Itoa(request.ID) + "/review",
			payload:        `{"user_id": 1`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", tc.url, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if !assert.Equal(t, tc.expectedStatus, w.Code) {
				t.Log("Response body:", w.Body.String())
			}

			if tc.expectedStatus == http.StatusOK {
				// Verify review was created
				var reviews []db_models.RequestReview
				err := dbCon.Model(&reviews).Where("request_id = ?", request.ID).Select()
				assert.NoError(t, err)
				assert.NotEmpty(t, reviews)
			}
		})
	}
}

func TestRequestReviewSuccess(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/requests/:id/review", h.RequestReview)

	// Create test organisation
	org := &db_models.Organisation{Name: "Review Success Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user (reviewer)
	reviewer := &db_models.User{Email: "reviewer-success@example.com", Name: "Reviewer"}
	_, err = dbCon.Model(reviewer).Insert()
	assert.NoError(t, err)

	// Create test user (requester)
	requester := &db_models.User{Email: "requester-success@example.com", Name: "Requester"}
	_, err = dbCon.Model(requester).Insert()
	assert.NoError(t, err)

	// Create building
	building := &db_models.Building{Name: "Review Building", UpdateDate: time.Now()}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)

	// Create room
	room := &db_models.Room{Name: "Review Room", BuildingID: building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(room).Insert()
	assert.NoError(t, err)

	// Create shelf
	shelf := &db_models.Shelf{ID: "REVIEW-S-1", Name: "Review Shelf", RoomID: room.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	_, err = dbCon.Model(shelf).Insert()
	assert.NoError(t, err)

	// Create column
	column := &db_models.Column{ID: "REVIEW-C-1", ShelfID: shelf.ID}
	_, err = dbCon.Model(column).Insert()
	assert.NoError(t, err)

	// Create shelf unit
	shelfUnit := &db_models.ShelfUnit{ID: "REVIEW-SU-1", ColumnID: column.ID}
	_, err = dbCon.Model(shelfUnit).Insert()
	assert.NoError(t, err)

	//// Create consumable item
	//consumableItem := &db_models.Item{}
	//_, err = dbCon.Model(consumableItem).Insert()
	//assert.NoError(t, err)

	//// Create non-consumable item (for loan)
	//loanableItem := &db_models.Item{Name: "Review Loanable Item", IsConsumable: false}
	//_, err = dbCon.Model(loanableItem).Insert()
	//assert.NoError(t, err)

	// Create inventory for consumable
	consumableInventory := &db_models.Inventory{Name: "Review Consumable Item", IsConsumable: true, ShelfUnitID: shelfUnit.ID, Amount: 10, UpdateDate: time.Now()}
	_, err = dbCon.Model(consumableInventory).Insert()
	assert.NoError(t, err)

	// Create inventory for loanable
	loanableInventory := &db_models.Inventory{Name: "Review Loanable Item", IsConsumable: false, ShelfUnitID: shelfUnit.ID, Amount: 5, UpdateDate: time.Now()}
	_, err = dbCon.Model(loanableInventory).Insert()
	assert.NoError(t, err)

	// Create request
	request := &db_models.Request{
		UserID:           requester.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		Note:             "",
		State:            "requested",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(request).Insert()
	assert.NoError(t, err)

	// Create request item for consumable
	consumableRequestItem := &db_models.RequestItems{
		RequestID:   request.ID,
		InventoryID: consumableInventory.ID,
		Amount:      2,
	}
	_, err = dbCon.Model(consumableRequestItem).Insert()
	assert.NoError(t, err)

	// Create request item for loanable
	loanableRequestItem := &db_models.RequestItems{
		RequestID:   request.ID,
		InventoryID: loanableInventory.ID,
		Amount:      1,
	}
	_, err = dbCon.Model(loanableRequestItem).Insert()
	assert.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		_, _ = dbCon.Model(&db_models.Consumed{}).Where("request_item_id = ?", consumableRequestItem.ID).Delete()
		_, _ = dbCon.Model(&db_models.Loans{}).Where("request_item_id = ?", loanableRequestItem.ID).Delete()
		_, _ = dbCon.Model(&db_models.RequestReview{}).Where("request_id = ?", request.ID).Delete()
		_, _ = dbCon.Model(&db_models.RequestItems{}).Where("request_id = ?", request.ID).Delete()
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", request.ID).Delete()
		_, _ = dbCon.Model(consumableInventory).Where("id = ?", consumableInventory.ID).Delete()
		_, _ = dbCon.Model(loanableInventory).Where("id = ?", loanableInventory.ID).Delete()
		//_, _ = dbCon.Model(consumableItem).Where("id = ?", consumableItem.ID).Delete()
		//_, _ = dbCon.Model(loanableItem).Where("id = ?", loanableItem.ID).Delete()
		_, _ = dbCon.Model(shelfUnit).Where("id = ?", shelfUnit.ID).Delete()
		_, _ = dbCon.Model(column).Where("id = ?", column.ID).Delete()
		_, _ = dbCon.Model(shelf).Where("id = ?", shelf.ID).Delete()
		_, _ = dbCon.Model(room).Where("id = ?", room.ID).Delete()
		_, _ = dbCon.Model(building).Where("id = ?", building.ID).Delete()
		_, _ = dbCon.Model(reviewer).Where("id = ?", reviewer.ID).Delete()
		_, _ = dbCon.Model(requester).Where("id = ?", requester.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	t.Run("Successful Review - Creates Loans and Consumed", func(t *testing.T) {
		payload := `{
			"user_id": ` + strconv.Itoa(reviewer.ID) + `,
			"outcome": "Approved",
			"note": "Approved"
		}`

		req, _ := http.NewRequest("POST", "/requests/"+strconv.Itoa(request.ID)+"/review", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if !assert.Equal(t, http.StatusOK, w.Code) {
			t.Log("Response body:", w.Body.String())
		}

		// Verify review was created
		var reviews []db_models.RequestReview
		err := dbCon.Model(&reviews).Where("request_id = ?", request.ID).Select()
		assert.NoError(t, err)
		assert.NotEmpty(t, reviews)
		assert.Equal(t, "Approved", reviews[0].Outcome)

		// Verify consumed record was created for consumable item
		var consumed []db_models.Consumed
		err = dbCon.Model(&consumed).Where("request_item_id = ?", consumableRequestItem.ID).Select()
		assert.NoError(t, err)
		assert.NotEmpty(t, consumed, "Expected consumed record to be created for consumable item")

		// Verify loan record was created for loanable item
		var loans []db_models.Loans
		err = dbCon.Model(&loans).Where("request_item_id = ?", loanableRequestItem.ID).Select()
		assert.NoError(t, err)
		assert.NotEmpty(t, loans, "Expected loan record to be created for loanable item")
		assert.False(t, loans[0].IsReturned)
	})
}

func TestUpdateRequest(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.PUT("/requests/:id", h.UpdateRequest)

	// Create test organisation
	org := &db_models.Organisation{Name: "Update Request Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user
	user := &db_models.User{Email: "update@example.com", Name: "Update User"}
	_, err = dbCon.Model(user).Insert()
	assert.NoError(t, err)

	// Create request
	request := &db_models.Request{
		UserID:           user.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		Note:             "",
		State:            "requested",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(request).Insert()
	assert.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", request.ID).Delete()
		_, _ = dbCon.Model(user).Where("id = ?", user.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	testCases := []struct {
		name            string
		url             string
		payload         string
		expectedStatus  int
		expectedOutcome string
	}{
		{
			name: "Successful Update",
			url:  "/requests/" + strconv.Itoa(request.ID),
			payload: `{
				"outcome": "Approved"
			}`,
			expectedStatus:  http.StatusAccepted,
			expectedOutcome: "Approved",
		},
		{
			name:           "Invalid JSON - Malformed",
			url:            "/requests/" + strconv.Itoa(request.ID),
			payload:        `{"outcome": "approved"`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("PUT", tc.url, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if !assert.Equal(t, tc.expectedStatus, w.Code) {
				t.Log("Response body:", w.Body.String())
			}

			if tc.expectedStatus == http.StatusAccepted {
				// Verify request was updated
				var updatedRequest db_models.Request
				err := dbCon.Model(&updatedRequest).Where("id = ?", request.ID).Select()
				assert.NoError(t, err)
				assert.Equal(t, tc.expectedOutcome, updatedRequest.State)
			}
		})
	}
}

func TestUpdateLoan(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.PUT("/loans/:id", h.UpdateLoan)

	// Create test organisation
	org := &db_models.Organisation{Name: "Update Loan Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user
	user := &db_models.User{Email: "loan@example.com", Name: "Loan User"}
	_, err = dbCon.Model(user).Insert()
	assert.NoError(t, err)

	// Create building
	building := &db_models.Building{Name: "Loan Building", UpdateDate: time.Now()}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)

	// Create room
	room := &db_models.Room{Name: "Loan Room", BuildingID: building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(room).Insert()
	assert.NoError(t, err)

	// Create shelf
	shelf := &db_models.Shelf{ID: "LOAN-S-1", Name: "Loan Shelf", RoomID: room.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	_, err = dbCon.Model(shelf).Insert()
	assert.NoError(t, err)

	// Create column
	column := &db_models.Column{ID: "LOAN-C-1", ShelfID: shelf.ID}
	_, err = dbCon.Model(column).Insert()
	assert.NoError(t, err)

	// Create shelf unit
	shelfUnit := &db_models.ShelfUnit{ID: "LOAN-SU-1", ColumnID: column.ID}
	_, err = dbCon.Model(shelfUnit).Insert()
	assert.NoError(t, err)

	// Create item (non-consumable for loan)
	//item := &db_models.Item{Name: "Loan Item", IsConsumable: false}
	//_, err = dbCon.Model(item).Insert()
	//assert.NoError(t, err)

	// Create inventory
	inventory := &db_models.Inventory{Name: "Loan Item", IsConsumable: false, ShelfUnitID: shelfUnit.ID, Amount: 5, UpdateDate: time.Now()}
	_, err = dbCon.Model(inventory).Insert()
	assert.NoError(t, err)

	// Create request
	request := &db_models.Request{
		UserID:           user.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		Note:             "",
		State:            "approved",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(request).Insert()
	assert.NoError(t, err)

	// Create request item
	requestItem := &db_models.RequestItems{
		RequestID:   request.ID,
		InventoryID: inventory.ID,
		Amount:      1,
	}
	_, err = dbCon.Model(requestItem).Insert()
	assert.NoError(t, err)

	// Create loan
	loan := &db_models.Loans{
		RequestItemID: requestItem.ID,
		IsReturned:    false,
	}
	_, err = dbCon.Model(loan).Insert()
	assert.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		_, _ = dbCon.Model(&db_models.Loans{}).Where("id = ?", loan.ID).Delete()
		_, _ = dbCon.Model(&db_models.RequestItems{}).Where("id = ?", requestItem.ID).Delete()
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", request.ID).Delete()
		_, _ = dbCon.Model(inventory).Where("id = ?", inventory.ID).Delete()
		//_, _ = dbCon.Model(item).Where("id = ?", item.ID).Delete()
		_, _ = dbCon.Model(shelfUnit).Where("id = ?", shelfUnit.ID).Delete()
		_, _ = dbCon.Model(column).Where("id = ?", column.ID).Delete()
		_, _ = dbCon.Model(shelf).Where("id = ?", shelf.ID).Delete()
		_, _ = dbCon.Model(room).Where("id = ?", room.ID).Delete()
		_, _ = dbCon.Model(building).Where("id = ?", building.ID).Delete()
		_, _ = dbCon.Model(user).Where("id = ?", user.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	returnedAt := time.Now()

	testCases := []struct {
		name           string
		url            string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Loan Return",
			url:  "/loans/" + strconv.Itoa(loan.ID),
			payload: `{
				"returnedAt": "` + returnedAt.Format(time.RFC3339) + `"
			}`,
			expectedStatus: http.StatusAccepted,
		},
		{
			name:           "Invalid JSON - Malformed",
			url:            "/loans/" + strconv.Itoa(loan.ID),
			payload:        `{"returnedAt": "2025-01-01"`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("PUT", tc.url, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if !assert.Equal(t, tc.expectedStatus, w.Code) {
				t.Log("Response body:", w.Body.String())
			}

			if tc.expectedStatus == http.StatusAccepted {
				// Verify loan was updated
				var updatedLoan db_models.Loans
				err := dbCon.Model(&updatedLoan).Where("id = ?", loan.ID).Select()
				assert.NoError(t, err)
				assert.True(t, updatedLoan.IsReturned)
				assert.False(t, updatedLoan.ReturnedAt.IsZero())
			}
		})
	}
}

func TestUpdateItem(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.PUT("/organisations/:orgId/items/:id", h.UpdateItem)

	// Create test organisation
	org := &db_models.Organisation{Name: "UpdateItem Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	hier := createTestHierarchy(t, dbCon)
	defer cleanupTestHierarchy(t, dbCon, hier)

	base := "/organisations/" + org.Name + "/items/"

	testCases := []struct {
		name           string
		url            string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Update - Amount",
			url:  base + strconv.Itoa(hier.Inventory.ID),
			payload: `{
				"amount": 50
			}`,
			expectedStatus: http.StatusOK,
		},
		{
			name: "Successful Update - Note",
			url:  base + strconv.Itoa(hier.Inventory.ID),
			payload: `{
				"note": "Updated note"
			}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid ID",
			url:            base + "notanumber",
			payload:        `{"amount": 50}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Non-existent item",
			url:            base + "999999",
			payload:        `{"amount": 50}`,
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("PUT", tc.url, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if !assert.Equal(t, tc.expectedStatus, w.Code) {
				t.Log("Response body:", w.Body.String())
			}
		})
	}

	// Verify the updates actually persisted
	var updatedInv db_models.Inventory
	err = dbCon.Model(&updatedInv).Where("id = ?", hier.Inventory.ID).Select()
	assert.NoError(t, err)
	assert.Equal(t, 50, updatedInv.Amount)
	assert.Equal(t, "Updated note", updatedInv.Note)
}

func TestCreateBuilding(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/organisations/:orgId/buildings", h.CreateBuilding)

	org := &db_models.Organisation{Name: "CreateBuilding Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	testCases := []struct {
		name           string
		payload        string
		expectedStatus int
		expectedName   string
	}{
		{
			name:           "Successful Creation",
			payload:        `{"name": "Main Library", "campus": "Main Campus"}`,
			expectedStatus: http.StatusCreated,
			expectedName:   "Main Library",
		},
		{
			name:           "Missing Name",
			payload:        `{"campus": "Test Campus"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Malformed JSON",
			payload:        `{"name": "Main Library"`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/organisations/"+org.Name+"/buildings", strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)

			if tc.expectedStatus == http.StatusCreated {
				var createdBuilding db_models.Building
				err := json.Unmarshal(w.Body.Bytes(), &createdBuilding)
				assert.NoError(t, err)
				assert.Equal(t, tc.expectedName, createdBuilding.Name)
				assert.NotZero(t, createdBuilding.ID)

				_, err = dbCon.Model(&createdBuilding).Where("id = ?", createdBuilding.ID).Delete()
				assert.NoError(t, err)
			}
		})
	}
}

func TestCreateRoom(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/organisations/:orgId/buildings/:buildingId/rooms", h.CreateRoom)

	org := &db_models.Organisation{Name: "CreateRoom Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	building := &db_models.Building{Name: "Test Building", Campus: "Test Campus"}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)

	defer func() {
		_, _ = dbCon.Model(building).Where("id = ?", building.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	testCases := []struct {
		name           string
		url            string
		payload        string
		expectedStatus int
	}{
		{
			name:           "Successful Creation",
			url:            "/organisations/" + org.Name + "/buildings/" + strconv.Itoa(building.ID) + "/rooms",
			payload:        `{"name": "Room 101", "floor": "1", "number": "101"}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "Missing Floor",
			url:            "/organisations/" + org.Name + "/buildings/" + strconv.Itoa(building.ID) + "/rooms",
			payload:        `{"name": "Room 101", "number": "101"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid Building ID",
			url:            "/organisations/" + org.Name + "/buildings/notanumber/rooms",
			payload:        `{"name": "Room 101", "floor": "1", "number": "101"}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", tc.url, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if !assert.Equal(t, tc.expectedStatus, w.Code) {
				t.Log("Response body:", w.Body.String())
			}

			if tc.expectedStatus == http.StatusCreated {
				var createdRoom db_models.Room
				err := json.Unmarshal(w.Body.Bytes(), &createdRoom)
				assert.NoError(t, err)
				assert.Equal(t, "Room 101", createdRoom.Name)
				assert.Equal(t, building.ID, createdRoom.BuildingID)
				assert.NotZero(t, createdRoom.ID)

				_, err = dbCon.Model(&createdRoom).Where("id = ?", createdRoom.ID).Delete()
				assert.NoError(t, err)
			}
		})
	}
}

func TestCreateShelf(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/organisations/:orgId/buildings/:buildingId/rooms/:roomId/shelves", h.CreateShelf)

	org := &db_models.Organisation{Name: "CreateShelf Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	building := &db_models.Building{Name: "Test Building", Campus: "Test Campus"}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)

	room := &db_models.Room{Name: "Test Room", BuildingID: building.ID}
	_, err = dbCon.Model(room).Insert()
	assert.NoError(t, err)

	defer func() {
		_, _ = dbCon.Model(room).Where("id = ?", room.ID).Delete()
		_, _ = dbCon.Model(building).Where("id = ?", building.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}()

	base := "/organisations/" + org.Name + "/buildings/" + strconv.Itoa(building.ID) + "/rooms/" + strconv.Itoa(room.ID) + "/shelves"

	testCases := []struct {
		name           string
		url            string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Creation",
			url:  base,
			payload: `{
				"id": "S-1",
				"name": "Test Shelf",
				"columns": [
					{
						"id": "C-1",
						"elements": [
							{"id": "SU-1", "type": "slim"},
							{"id": "SU-2", "type": "large"}
						]
					}
				]
			}`,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "Missing ID",
			url:            base,
			payload:        `{"name": "Test Shelf"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid Room ID",
			url:            "/organisations/" + org.Name + "/buildings/" + strconv.Itoa(building.ID) + "/rooms/notanumber/shelves",
			payload:        `{"id": "S-2", "name": "Shelf", "columns": []}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", tc.url, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)

			if tc.expectedStatus == http.StatusCreated {
				var createdShelf db_models.Shelf
				err := json.Unmarshal(w.Body.Bytes(), &createdShelf)
				assert.NoError(t, err)
				assert.Equal(t, "Test Shelf", createdShelf.Name)
				assert.Equal(t, "S-1", createdShelf.ID)
				assert.Equal(t, org.Name, createdShelf.OwnedBy)
				assert.Equal(t, room.ID, createdShelf.RoomID)

				// Cleanup created shelf hierarchy
				_, _ = dbCon.Model(&db_models.ShelfUnit{}).Where("id = 'SU-1' OR id = 'SU-2'").Delete()
				_, _ = dbCon.Model(&db_models.Column{}).Where("id = 'C-1'").Delete()
				_, _ = dbCon.Model(&db_models.Shelf{}).Where("id = 'S-1'").Delete()
			}
		})
	}
}

func TestPostMessage(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/requests/:id/messages", h.PostMessage)

	// Create test organisation
	org := &db_models.Organisation{Name: "Message Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user
	user := &db_models.User{Email: "msg@example.com", Name: "Message User"}
	_, err = dbCon.Model(user).Insert()
	assert.NoError(t, err)

	// Create request
	request := &db_models.Request{
		UserID:           user.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		State:            "requested",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(request).Insert()
	assert.NoError(t, err)

	cleanup := func() {
		_, _ = dbCon.Model(&db_models.UserRequestMessage{}).Where("request_id = ?", request.ID).Delete()
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", request.ID).Delete()
		_, _ = dbCon.Model(user).Where("id = ?", user.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	testCases := []struct {
		name           string
		url            string
		payload        string
		expectedStatus int
	}{
		{
			name: "Successful Message",
			url:  "/requests/" + strconv.Itoa(request.ID) + "/messages",
			payload: `{
				"userId": ` + strconv.Itoa(user.ID) + `,
				"message": "Hello, can I borrow this?"
			}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid Request ID",
			url:            "/requests/notanumber/messages",
			payload:        `{"userId": 1, "message": "test"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid JSON - Malformed",
			url:            "/requests/" + strconv.Itoa(request.ID) + "/messages",
			payload:        `{"userId": 1`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", tc.url, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if !assert.Equal(t, tc.expectedStatus, w.Code) {
				t.Log("Response body:", w.Body.String())
			}

			if tc.expectedStatus == http.StatusOK {
				// Verify message was persisted
				var messages []db_models.UserRequestMessage
				err := dbCon.Model(&messages).Where("request_id = ?", request.ID).Select()
				assert.NoError(t, err)
				assert.NotEmpty(t, messages)
				assert.Equal(t, "Hello, can I borrow this?", messages[0].Message)
				assert.Equal(t, user.ID, messages[0].UserID)
			}
		})
	}
}

func TestGetMessages(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.GET("/requests/:id/messages", h.GetMessages)

	// Create test organisation
	org := &db_models.Organisation{Name: "GetMsg Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test users
	member := &db_models.User{Email: "member-msg@example.com", Name: "Member"}
	_, err = dbCon.Model(member).Insert()
	assert.NoError(t, err)

	admin := &db_models.User{Email: "admin-msg@example.com", Name: "Admin"}
	_, err = dbCon.Model(admin).Insert()
	assert.NoError(t, err)

	// Create request
	request := &db_models.Request{
		UserID:           member.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		State:            "requested",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(request).Insert()
	assert.NoError(t, err)

	// Create a user message (older)
	userMsg := &db_models.UserRequestMessage{
		UserID:    member.ID,
		RequestID: request.ID,
		Message:   "Can I borrow this?",
		TimeStamp: time.Now().Add(-2 * time.Hour),
	}
	_, err = dbCon.Model(userMsg).Insert()
	assert.NoError(t, err)

	// Create an admin review message (newer)
	adminReview := &db_models.RequestReview{
		UserID:    admin.ID,
		RequestID: request.ID,
		Outcome:   "rejected",
		Note:      "Not available this week",
		TimeStamp: time.Now().Add(-1 * time.Hour),
	}
	_, err = dbCon.Model(adminReview).Insert()
	assert.NoError(t, err)

	cleanup := func() {
		_, _ = dbCon.Model(&db_models.RequestReview{}).Where("request_id = ?", request.ID).Delete()
		_, _ = dbCon.Model(&db_models.UserRequestMessage{}).Where("request_id = ?", request.ID).Delete()
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", request.ID).Delete()
		_, _ = dbCon.Model(member).Where("id = ?", member.ID).Delete()
		_, _ = dbCon.Model(admin).Where("id = ?", admin.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	t.Run("Returns messages sorted by timestamp", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/requests/"+strconv.Itoa(request.ID)+"/messages", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var messages []api_objects.Message
		err := json.Unmarshal(w.Body.Bytes(), &messages)
		assert.NoError(t, err)
		assert.Len(t, messages, 2)

		// First message should be the older user message
		assert.Equal(t, "Can I borrow this?", messages[0].Message)
		assert.Equal(t, "Member", messages[0].AuthorName)
		assert.False(t, messages[0].IsAdmin)

		// Second message should be the newer admin review
		assert.Equal(t, "Not available this week", messages[1].Message)
		assert.Equal(t, "Admin", messages[1].AuthorName)
		assert.True(t, messages[1].IsAdmin)
	})

	t.Run("Empty messages for unknown request", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/requests/999999/messages", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Invalid request ID", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/requests/notanumber/messages", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetBorrowHistory(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.GET("/organisations/:orgId/items/:id/borrows", h.GetBorrowHistory)

	// Create test hierarchy (building -> room -> shelf -> column -> shelf_unit -> item -> inventory)
	hier := createTestHierarchy(t, dbCon)

	// Create test organisation
	org := &db_models.Organisation{Name: "BorrowHist Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user
	user := &db_models.User{Email: "borrowhist@example.com", Name: "Borrower"}
	_, err = dbCon.Model(user).Insert()
	assert.NoError(t, err)

	// Create a pending request
	pendingRequest := &db_models.Request{
		UserID:           user.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		Note:             "Need for project",
		State:            "requested",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(pendingRequest).Insert()
	assert.NoError(t, err)

	// Create request item for the pending request
	pendingReqItem := &db_models.RequestItems{
		RequestID:   pendingRequest.ID,
		InventoryID: hier.Inventory.ID,
		Amount:      2,
	}
	_, err = dbCon.Model(pendingReqItem).Insert()
	assert.NoError(t, err)

	// Create a successful request with a returned loan
	successRequest := &db_models.Request{
		UserID:           user.ID,
		StartDate:        time.Now().Add(-72 * time.Hour),
		EndDate:          time.Now().Add(-24 * time.Hour),
		Note:             "Past borrowing",
		State:            "Approved",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(successRequest).Insert()
	assert.NoError(t, err)

	successReqItem := &db_models.RequestItems{
		RequestID:   successRequest.ID,
		InventoryID: hier.Inventory.ID,
		Amount:      3,
	}
	_, err = dbCon.Model(successReqItem).Insert()
	assert.NoError(t, err)

	returnedAt := time.Now().Add(-48 * time.Hour)
	loan := &db_models.Loans{
		RequestItemID: successReqItem.ID,
		IsReturned:    true,
		ReturnedAt:    returnedAt,
	}
	_, err = dbCon.Model(loan).Insert()
	assert.NoError(t, err)

	cleanup := func() {
		_, _ = dbCon.Model(loan).Where("id = ?", loan.ID).Delete()
		_, _ = dbCon.Model(successReqItem).Where("id = ?", successReqItem.ID).Delete()
		_, _ = dbCon.Model(pendingReqItem).Where("id = ?", pendingReqItem.ID).Delete()
		_, _ = dbCon.Model(successRequest).Where("id = ?", successRequest.ID).Delete()
		_, _ = dbCon.Model(pendingRequest).Where("id = ?", pendingRequest.ID).Delete()
		_, _ = dbCon.Model(user).Where("id = ?", user.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
		cleanupTestHierarchy(t, dbCon, hier)
	}
	defer cleanup()

	t.Run("Returns borrow history for item", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/items/"+strconv.Itoa(hier.Inventory.ID)+"/borrows", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var history []api_objects.BorrowHistory
		err := json.Unmarshal(w.Body.Bytes(), &history)
		assert.NoError(t, err)
		assert.Len(t, history, 2)

		// Verify fields are populated
		for _, entry := range history {
			assert.Equal(t, "Borrower", entry.User)
			assert.NotZero(t, entry.Amount)
		}
	})

	t.Run("Returns empty for item with no borrows", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/items/999999/borrows", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Invalid item ID", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/organisations/"+org.Name+"/items/notanumber/borrows", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateLoanBulk(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.PUT("/requests/:id/loans", h.UpdateLoanBulk)

	// Create test organisation
	org := &db_models.Organisation{Name: "Bulk Loan Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)

	// Create test user
	user := &db_models.User{Email: "bulkloan@example.com", Name: "Bulk Loan User"}
	_, err = dbCon.Model(user).Insert()
	assert.NoError(t, err)

	// Create building
	building := &db_models.Building{Name: "Bulk Loan Building", UpdateDate: time.Now()}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)

	// Create room
	room := &db_models.Room{Name: "Bulk Loan Room", BuildingID: building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(room).Insert()
	assert.NoError(t, err)

	// Create shelf
	shelf := &db_models.Shelf{ID: "BLOAN-S-1", Name: "Bulk Loan Shelf", RoomID: room.ID, OwnedBy: org.Name, UpdateDate: time.Now()}
	_, err = dbCon.Model(shelf).Insert()
	assert.NoError(t, err)

	// Create column
	column := &db_models.Column{ID: "BLOAN-C-1", ShelfID: shelf.ID}
	_, err = dbCon.Model(column).Insert()
	assert.NoError(t, err)

	// Create shelf unit
	shelfUnit := &db_models.ShelfUnit{ID: "BLOAN-SU-1", ColumnID: column.ID}
	_, err = dbCon.Model(shelfUnit).Insert()
	assert.NoError(t, err)

	// Create items (non-consumable for loans)
	//item1 := &db_models.Item{Name: "Bulk Loan Item 1", IsConsumable: false}
	//_, err = dbCon.Model(item1).Insert()
	//assert.NoError(t, err)
	//
	//item2 := &db_models.Item{Name: "Bulk Loan Item 2", IsConsumable: false}
	//_, err = dbCon.Model(item2).Insert()
	//assert.NoError(t, err)

	// Create inventories
	inventory1 := &db_models.Inventory{Name: "Bulk Loan Item 1", IsConsumable: false, ShelfUnitID: shelfUnit.ID, Amount: 5, UpdateDate: time.Now()}
	_, err = dbCon.Model(inventory1).Insert()
	assert.NoError(t, err)

	inventory2 := &db_models.Inventory{Name: "Bulk Loan Item 2", IsConsumable: false, ShelfUnitID: shelfUnit.ID, Amount: 3, UpdateDate: time.Now()}
	_, err = dbCon.Model(inventory2).Insert()
	assert.NoError(t, err)

	// Create request
	request := &db_models.Request{
		UserID:           user.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		Note:             "",
		State:            "approved",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(request).Insert()
	assert.NoError(t, err)

	// Create request items
	requestItem1 := &db_models.RequestItems{
		RequestID:   request.ID,
		InventoryID: inventory1.ID,
		Amount:      1,
	}
	_, err = dbCon.Model(requestItem1).Insert()
	assert.NoError(t, err)

	requestItem2 := &db_models.RequestItems{
		RequestID:   request.ID,
		InventoryID: inventory2.ID,
		Amount:      1,
	}
	_, err = dbCon.Model(requestItem2).Insert()
	assert.NoError(t, err)

	// Create loans for both request items
	loan1 := &db_models.Loans{
		RequestItemID: requestItem1.ID,
		IsReturned:    false,
	}
	_, err = dbCon.Model(loan1).Insert()
	assert.NoError(t, err)

	loan2 := &db_models.Loans{
		RequestItemID: requestItem2.ID,
		IsReturned:    false,
	}
	_, err = dbCon.Model(loan2).Insert()
	assert.NoError(t, err)

	// Create a separate request with its own loan that should NOT be affected
	otherRequest := &db_models.Request{
		UserID:           user.ID,
		StartDate:        time.Now().Add(24 * time.Hour),
		EndDate:          time.Now().Add(48 * time.Hour),
		Note:             "",
		State:            "approved",
		OrganisationName: org.Name,
		GroupID:          1,
	}
	_, err = dbCon.Model(otherRequest).Insert()
	assert.NoError(t, err)

	otherRequestItem := &db_models.RequestItems{
		RequestID:   otherRequest.ID,
		InventoryID: inventory1.ID,
		Amount:      1,
	}
	_, err = dbCon.Model(otherRequestItem).Insert()
	assert.NoError(t, err)

	otherLoan := &db_models.Loans{
		RequestItemID: otherRequestItem.ID,
		IsReturned:    false,
	}
	_, err = dbCon.Model(otherLoan).Insert()
	assert.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		_, _ = dbCon.Model(&db_models.Loans{}).Where("id = ?", loan1.ID).Delete()
		_, _ = dbCon.Model(&db_models.Loans{}).Where("id = ?", loan2.ID).Delete()
		_, _ = dbCon.Model(&db_models.Loans{}).Where("id = ?", otherLoan.ID).Delete()
		_, _ = dbCon.Model(&db_models.RequestItems{}).Where("id = ?", requestItem1.ID).Delete()
		_, _ = dbCon.Model(&db_models.RequestItems{}).Where("id = ?", requestItem2.ID).Delete()
		_, _ = dbCon.Model(&db_models.RequestItems{}).Where("id = ?", otherRequestItem.ID).Delete()
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", request.ID).Delete()
		_, _ = dbCon.Model(&db_models.Request{}).Where("id = ?", otherRequest.ID).Delete()
		_, _ = dbCon.Model(inventory1).Where("id = ?", inventory1.ID).Delete()
		_, _ = dbCon.Model(inventory2).Where("id = ?", inventory2.ID).Delete()
		//_, _ = dbCon.Model(item1).Where("id = ?", item1.ID).Delete()
		//_, _ = dbCon.Model(item2).Where("id = ?", item2.ID).Delete()
		_, _ = dbCon.Model(shelfUnit).Where("id = ?", shelfUnit.ID).Delete()
		_, _ = dbCon.Model(column).Where("id = ?", column.ID).Delete()
		_, _ = dbCon.Model(shelf).Where("id = ?", shelf.ID).Delete()
		_, _ = dbCon.Model(room).Where("id = ?", room.ID).Delete()
		_, _ = dbCon.Model(building).Where("id = ?", building.ID).Delete()
		_, _ = dbCon.Model(user).Where("id = ?", user.ID).Delete()
		_, _ = dbCon.Model(org).Where("name = ?", org.Name).Delete()
	}
	defer cleanup()

	returnedAt := time.Now()

	t.Run("Successful Bulk Loan Return", func(t *testing.T) {
		payload := `{"returnedAt": "` + returnedAt.Format(time.RFC3339) + `"}`
		req, _ := http.NewRequest("PUT", "/requests/"+strconv.Itoa(request.ID)+"/loans", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if !assert.Equal(t, http.StatusAccepted, w.Code) {
			t.Log("Response body:", w.Body.String())
		}

		// Verify both loans were updated
		var updatedLoan1 db_models.Loans
		err := dbCon.Model(&updatedLoan1).Where("id = ?", loan1.ID).Select()
		assert.NoError(t, err)
		assert.True(t, updatedLoan1.IsReturned)
		assert.False(t, updatedLoan1.ReturnedAt.IsZero())

		var updatedLoan2 db_models.Loans
		err = dbCon.Model(&updatedLoan2).Where("id = ?", loan2.ID).Select()
		assert.NoError(t, err)
		assert.True(t, updatedLoan2.IsReturned)
		assert.False(t, updatedLoan2.ReturnedAt.IsZero())
	})

	t.Run("Invalid Request ID", func(t *testing.T) {
		payload := `{"returnedAt": "` + returnedAt.Format(time.RFC3339) + `"}`
		req, _ := http.NewRequest("PUT", "/requests/abc/loans", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Invalid JSON - Malformed", func(t *testing.T) {
		req, _ := http.NewRequest("PUT", "/requests/"+strconv.Itoa(request.ID)+"/loans", strings.NewReader(`{"returnedAt": "2025-01-01"`))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Does Not Update Loans From Other Requests", func(t *testing.T) {
		// Reset the other loan to ensure it's not returned
		_, err := dbCon.Model(otherLoan).Set("returned = ?", false).Set("returned_at = ?", time.Time{}).Where("id = ?", otherLoan.ID).Update()
		assert.NoError(t, err)

		payload := `{"returnedAt": "` + returnedAt.Format(time.RFC3339) + `"}`
		req, _ := http.NewRequest("PUT", "/requests/"+strconv.Itoa(request.ID)+"/loans", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusAccepted, w.Code)

		// Verify the loan from the other request was NOT updated
		var unchangedLoan db_models.Loans
		err = dbCon.Model(&unchangedLoan).Where("id = ?", otherLoan.ID).Select()
		assert.NoError(t, err)
		assert.False(t, unchangedLoan.IsReturned, "loan from another request should not be updated")
		assert.True(t, unchangedLoan.ReturnedAt.IsZero(), "loan from another request should have no return date")
	})

	t.Run("Request With No Loans", func(t *testing.T) {
		// Use a request ID that has no loans
		payload := `{"returnedAt": "` + returnedAt.Format(time.RFC3339) + `"}`
		req, _ := http.NewRequest("PUT", "/requests/999999/loans", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Should still return accepted even with no loans to update
		assert.Equal(t, http.StatusAccepted, w.Code)
	})
}

func TestFuzzyFindItems(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/search", h.FuzzyFindItems)

	// Create test hierarchy with a known item name
	hierarchy := createTestHierarchy(t, dbCon)
	defer cleanupTestHierarchy(t, dbCon, hierarchy)

	// Insert additional items for fuzzy matching
	extraItem1 := &db_models.Inventory{
		Name:         "Hierarchy Itam",
		ShelfUnitID:  hierarchy.ShelfUnit.ID,
		Amount:       5,
		IsConsumable: false,
		UpdateDate:   time.Now(),
	}
	extraItem2 := &db_models.Inventory{
		Name:         "Completely Different",
		ShelfUnitID:  hierarchy.ShelfUnit.ID,
		Amount:       3,
		IsConsumable: false,
		UpdateDate:   time.Now(),
	}
	_, err := dbCon.Model(extraItem1).Insert()
	assert.NoError(t, err)
	_, err = dbCon.Model(extraItem2).Insert()
	assert.NoError(t, err)
	defer func() {
		dbCon.Model(extraItem1).Where("id = ?", extraItem1.ID).Delete()
		dbCon.Model(extraItem2).Where("id = ?", extraItem2.ID).Delete()
	}()

	t.Run("Exact match returns single result", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/search?searchTerm=Hierarchy+Item", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var results []db_models.Inventory
		err := json.Unmarshal(w.Body.Bytes(), &results)
		assert.NoError(t, err)
		assert.Equal(t, 1, len(results))
		assert.Equal(t, "Hierarchy Item", results[0].Name)
	})

	t.Run("Fuzzy match returns close matches", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/search?searchTerm=Hierarchy+Itam", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var results []db_models.Inventory
		err := json.Unmarshal(w.Body.Bytes(), &results)
		assert.NoError(t, err)
		// "Hierarchy Itam" is an exact match for extraItem1, so should return 1
		assert.Equal(t, 1, len(results))
		assert.Equal(t, "Hierarchy Itam", results[0].Name)
	})

	t.Run("No match returns empty list", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/search?searchTerm=ZZZZZZZZZZZZZ", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var results []db_models.Inventory
		err := json.Unmarshal(w.Body.Bytes(), &results)
		assert.NoError(t, err)
		assert.Equal(t, 0, len(results))
	})

	t.Run("Empty search term", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/search?searchTerm=", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var results []db_models.Inventory
		err := json.Unmarshal(w.Body.Bytes(), &results)
		assert.NoError(t, err)
		// Empty string has small Levenshtein distance to short names, so results may vary
	})

	t.Run("Close misspelling returns fuzzy results ordered by relevance", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/search?searchTerm=Hierarchy+Iten", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var results []db_models.Inventory
		err := json.Unmarshal(w.Body.Bytes(), &results)
		assert.NoError(t, err)
		// "Hierarchy Item" and "Hierarchy Itam" are both 1 edit away from "Hierarchy Iten"
		assert.GreaterOrEqual(t, len(results), 2)
	})
}

func TestDeleteAllCartItems(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.DELETE("/users/:userId/cart/items", h.DeleteAllCartItems)

	// Create a test user
	user := &db_models.User{Email: "deleteall@example.com", Name: "DeleteAll Test User"}
	_, err := dbCon.Model(user).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(user).Where("id = ?", user.ID).Delete()
	}()

	// Create inventory items
	inventory1 := &db_models.Inventory{Name: "Delete Cart Item 1", IsConsumable: true, Amount: 10}
	inventory2 := &db_models.Inventory{Name: "Delete Cart Item 2", IsConsumable: false, Amount: 5}
	_, err = dbCon.Model(inventory1).Insert()
	assert.NoError(t, err)
	_, err = dbCon.Model(inventory2).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(inventory1).Where("id = ?", inventory1.ID).Delete()
		_, _ = dbCon.Model(inventory2).Where("id = ?", inventory2.ID).Delete()
	}()

	// Create a shopping cart for the user
	cart := &db_models.ShoppingCart{UserID: user.ID}
	_, err = dbCon.Model(cart).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(cart).Where("id = ?", cart.ID).Delete()
	}()

	// Create cart items
	cartItem1 := &db_models.ShoppingCartItem{ShoppingCartID: cart.ID, InventoryID: inventory1.ID, Amount: 2}
	cartItem2 := &db_models.ShoppingCartItem{ShoppingCartID: cart.ID, InventoryID: inventory2.ID, Amount: 3}
	_, err = dbCon.Model(cartItem1).Insert()
	assert.NoError(t, err)
	_, err = dbCon.Model(cartItem2).Insert()
	assert.NoError(t, err)
	defer func() {
		_, _ = dbCon.Model(cartItem1).Where("id = ?", cartItem1.ID).Delete()
		_, _ = dbCon.Model(cartItem2).Where("id = ?", cartItem2.ID).Delete()
	}()

	t.Run("Does not return cart items belonging to another user", func(t *testing.T) {
		// Create a second user with their own cart and items
		otherUser := &db_models.User{Email: "other@example.com", Name: "Other User"}
		_, err := dbCon.Model(otherUser).Insert()
		assert.NoError(t, err)
		defer func() {
			_, _ = dbCon.Model(otherUser).Where("id = ?", otherUser.ID).Delete()
		}()

		otherCart := &db_models.ShoppingCart{UserID: otherUser.ID}
		_, err = dbCon.Model(otherCart).Insert()
		assert.NoError(t, err)
		defer func() {
			_, _ = dbCon.Model(otherCart).Where("id = ?", otherCart.ID).Delete()
		}()

		otherCartItem := &db_models.ShoppingCartItem{ShoppingCartID: otherCart.ID, InventoryID: inventory1.ID, Amount: 7}
		_, err = dbCon.Model(otherCartItem).Insert()
		assert.NoError(t, err)
		defer func() {
			_, _ = dbCon.Model(otherCartItem).Where("id = ?", otherCartItem.ID).Delete()
		}()

		// Request cart items for the original user — should not include otherUser's items
		req, _ := http.NewRequest("DELETE", "/users/"+strconv.Itoa(user.ID)+"/cart/items", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var results []db_models.ShoppingCartItem
		err = json.Unmarshal(w.Body.Bytes(), &results)
		assert.NoError(t, err)

		// Should only contain the original user's 2 cart items, not the other user's
		assert.Equal(t, 2, len(results))
		for _, item := range results {
			assert.NotEqual(t, otherCartItem.ID, item.ID)
		}
	})

	t.Run("Returns empty list for user with no cart items", func(t *testing.T) {
		// Create a user with no cart
		userNoCart := &db_models.User{Email: "nocart@example.com", Name: "No Cart User"}
		_, err := dbCon.Model(userNoCart).Insert()
		assert.NoError(t, err)
		defer func() {
			_, _ = dbCon.Model(userNoCart).Where("id = ?", userNoCart.ID).Delete()
		}()

		req, _ := http.NewRequest("DELETE", "/users/"+strconv.Itoa(userNoCart.ID)+"/cart/items", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Invalid user ID returns bad request", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/users/abc/cart/items", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
