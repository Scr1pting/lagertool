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
	Item      *db_models.Item
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

	h.Item = &db_models.Item{Name: "Hierarchy Item", IsConsumable: true}
	_, err = dbCon.Model(h.Item).Insert()
	assert.NoError(t, err)

	h.Inventory = &db_models.Inventory{ItemID: h.Item.ID, ShelfUnitID: h.ShelfUnit.ID, Amount: 10, UpdateDate: time.Now()}
	_, err = dbCon.Model(h.Inventory).Insert()
	assert.NoError(t, err)

	return h
}

// cleanupTestHierarchy deletes the data created by createTestHierarchy in the correct order.
func cleanupTestHierarchy(t *testing.T, dbCon *pg.DB, h *TestHierarchy) {
	_, err := dbCon.Model(h.Inventory).Where("id = ?", h.Inventory.ID).Delete()
	assert.NoError(t, err)
	_, err = dbCon.Model(h.Item).Where("id = ?", h.Item.ID).Delete()
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

func TestCreateBuilding(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/create_building", h.CreateBuilding)

	testCases := []struct {
		name           string
		payload        string
		expectedStatus int
		expectedName   string
	}{
		{
			name:           "Successful Creation",
			payload:        `{"name": "Main Library", "campus": "Main Campus"}`,
			expectedStatus: http.StatusCreated, // Expect 201 Created
			expectedName:   "Main Library",
		},
		{
			name:           "Invalid JSON - Missing Name",
			payload:        `{"campus": "Test Campus"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid JSON - Malformed",
			payload:        `{"name": "Main Library", "campus": "Main Campus"`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/create_building", strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)

			if tc.expectedStatus == http.StatusCreated {
				var createdBuilding db_models.Building
				err := json.Unmarshal(w.Body.Bytes(), &createdBuilding)
				assert.NoError(t, err)
				assert.Equal(t, tc.expectedName, createdBuilding.Name)
				assert.NotZero(t, createdBuilding.ID) // Verify an ID was assigned

				// Clean up the created record
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
	router.POST("/create_room", h.CreateRoom)

	// Pre-insert a building for the foreign key constraint
	building := &db_models.Building{ID: 1, Name: "Test Building", Campus: "Test Campus"}
	_, err := dbCon.Model(building).Insert()
	assert.NoError(t, err)
	// Defer cleanup to ensure it runs even if the test fails
	defer func() {
		_, err := dbCon.Model(building).Where("id = ?", building.ID).Delete()
		assert.NoError(t, err)
	}()

	// Define test case
	payload := `{"name": "Room 101", "floor": "1", "number": "101", "building": 1}`
	req, _ := http.NewRequest("POST", "/create_room", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert the status code, and print body on failure
	if !assert.Equal(t, http.StatusCreated, w.Code) {
		t.Log("Response body:", w.Body.String())
	}

	// Assert the response body
	var createdRoom db_models.Room
	err = json.Unmarshal(w.Body.Bytes(), &createdRoom)
	assert.NoError(t, err)
	assert.Equal(t, "Room 101", createdRoom.Name)
	assert.NotZero(t, createdRoom.ID)

	// Clean up the created room record
	_, err = dbCon.Model(&createdRoom).Where("id = ?", createdRoom.ID).Delete()
	assert.NoError(t, err)
}

func TestGetBuildingsS(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.GET("/buildings_sorted", h.GetBuildingsS)

	// Clean up any previous runs of this test
	_, err := dbCon.Model(&db_models.Building{}).Where("name = ? OR name = ?", "Old Building", "New Building").Delete()
	assert.NoError(t, err)

	// Insert test data with different update dates
	b1 := &db_models.Building{Name: "Old Building", Campus: "Main", UpdateDate: time.Now().Add(-time.Hour)}
	b2 := &db_models.Building{Name: "New Building", Campus: "Main", UpdateDate: time.Now()}
	_, err = dbCon.Model(b1, b2).Insert()
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/buildings_sorted", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var buildings []api_objects.Building
	err = json.Unmarshal(w.Body.Bytes(), &buildings)
	assert.NoError(t, err)

	// Assert that we got at least 2 buildings and they are in the correct order (newest first)
	assert.GreaterOrEqual(t, len(buildings), 2)
	assert.Equal(t, "New Building", buildings[0].Name)
	assert.Equal(t, "Old Building", buildings[1].Name)

	// Cleanup
	_, err = dbCon.Model(&db_models.Building{}).Where("name = ? OR name = ?", "Old Building", "New Building").Delete()
	assert.NoError(t, err)
}

func TestGetRoomsS(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.GET("/rooms_sorted", h.GetRoomsS)

	// Insert related building
	building := &db_models.Building{Name: "Test Building", Campus: "Test Campus"}
	_, err := dbCon.Model(building).Insert()
	assert.NoError(t, err)

	// Insert test data with different update dates
	r1 := &db_models.Room{Name: "Old Room", BuildingID: building.ID, UpdateDate: time.Now().Add(-time.Hour)}
	r2 := &db_models.Room{Name: "New Room", BuildingID: building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(r1, r2).Insert()
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/rooms_sorted", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var rooms []api_objects.Room
	err = json.Unmarshal(w.Body.Bytes(), &rooms)
	assert.NoError(t, err)

	assert.GreaterOrEqual(t, len(rooms), 2)
	assert.Equal(t, "New Room", rooms[0].Name)
	assert.Equal(t, "Old Room", rooms[1].Name)

	// Cleanup
	_, err = dbCon.Model(&db_models.Room{}).Where("name = ? OR name = ?", "Old Room", "New Room").Delete()
	assert.NoError(t, err)
	_, err = dbCon.Model(building).Where("id = ?", building.ID).Delete()
	assert.NoError(t, err)
}

func TestGetShelvesS(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/shelves_sorted", h.GetShelvesS)

	hier := createTestHierarchy(t, dbCon)

	req, _ := http.NewRequest("GET", "/shelves_sorted", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var shelves []api_objects.ShelfSorted
	err := json.Unmarshal(w.Body.Bytes(), &shelves)
	assert.NoError(t, err)
	assert.NotEmpty(t, shelves)
	assert.Equal(t, "Hierarchy Shelf", shelves[0].Name)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestGetShelves(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/shelves", h.GetShelves)

	// Create test organisation
	org := &db_models.Organisation{Name: "Test Org"}
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

	// Test without organisation parameter (should fail)
	req, _ := http.NewRequest("GET", "/shelves", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Test with organisation parameter
	req, _ = http.NewRequest("GET", "/shelves?organisation="+org.Name, nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var shelves []api_objects.Shelves
	err = json.Unmarshal(w.Body.Bytes(), &shelves)
	assert.NoError(t, err)
	assert.NotEmpty(t, shelves)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestGetInventoryS(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/inventory_sorted", h.GetInventoryS)

	hier := createTestHierarchy(t, dbCon)

	req, _ := http.NewRequest("GET", "/inventory_sorted?start=2025-01-01&end=2025-12-31", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var inventory []api_objects.InventorySorted
	err := json.Unmarshal(w.Body.Bytes(), &inventory)
	assert.NoError(t, err)
	assert.NotEmpty(t, inventory)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestGetItem(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/item", h.GetItem)

	// Create test organisation
	org := &db_models.Organisation{Name: "Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(org).Where("name = ?", org.Name).Delete()
		assert.NoError(t, err)
	}()

	hier := createTestHierarchy(t, dbCon)

	// Test without organisation parameter (should fail)
	req, _ := http.NewRequest("GET", "/item?id="+strconv.Itoa(hier.Inventory.ID)+"&start=2025-01-01&end=2025-12-31", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Test with organisation parameter
	req, _ = http.NewRequest("GET", "/item?organisation="+org.Name+"&id="+strconv.Itoa(hier.Inventory.ID)+"&start=2025-01-01&end=2025-12-31", nil)
	w = httptest.NewRecorder()
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
	router.POST("/add_item_to_cart", h.CreateCartItem)

	// The user ID is hardcoded to 1 in the handler, so we create a user with ID 1.
	user := &db_models.User{ID: 1, Email: "test@example.com", Name: "Test User"}
	_, err := dbCon.Model(user).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(user).Where("id = ?", user.ID).Delete()
		assert.NoError(t, err)
	}()

	item := &db_models.Item{Name: "Test Item", IsConsumable: true}
	_, err = dbCon.Model(item).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(item).Where("id = ?", item.ID).Delete()
		assert.NoError(t, err)
	}()

	inventory := &db_models.Inventory{ItemID: item.ID, Amount: 10}
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
			req, _ := http.NewRequest("POST", "/add_item_to_cart", strings.NewReader(tc.payload))
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

func TestCreateShelf(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/create_shelf", h.CreateShelf)

	// Pre-insert an organisation, a building and a room for the foreign key constraint
	org := &db_models.Organisation{Name: "Test Org"}
	_, err := dbCon.Model(org).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(org).Where("name = ?", org.Name).Delete()
		assert.NoError(t, err)
	}()

	building := &db_models.Building{Name: "Test Building", Campus: "Test Campus"}
	_, err = dbCon.Model(building).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(building).Where("id = ?", building.ID).Delete()
		assert.NoError(t, err)
	}()

	room := &db_models.Room{Name: "Test Room", BuildingID: building.ID}
	_, err = dbCon.Model(room).Insert()
	assert.NoError(t, err)
	defer func() {
		_, err := dbCon.Model(room).Where("id = ?", room.ID).Delete()
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
                "id": "S-1",
                "name": "Test Shelf",
                "buildingId": ` + strconv.Itoa(building.ID) + `,
                "roomId": ` + strconv.Itoa(room.ID) + `,
                "ownedBy": "` + org.Name + `",
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
			name:           "Invalid JSON - Missing ID",
			payload:        `{"name": "Test Shelf"}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/create_shelf", strings.NewReader(tc.payload))
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

				// Clean up the created records
				_, err = dbCon.Model(&db_models.ShelfUnit{}).Where("id = 'SU-1' OR id = 'SU-2'").Delete()
				assert.NoError(t, err)
				_, err = dbCon.Model(&db_models.Column{}).Where("id = 'C-1'").Delete()
				assert.NoError(t, err)
				_, err = dbCon.Model(&db_models.Shelf{}).Where("id = 'S-1'").Delete()
				assert.NoError(t, err)
			}
		})
	}
}

func TestCreateItem(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.POST("/create_item", h.CreateItem)

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
			req, _ := http.NewRequest("POST", "/create_item", strings.NewReader(tc.payload))
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
				_, err = dbCon.Model(&db_models.Item{}).Where("name = 'New Test Item'").Delete()
				assert.NoError(t, err)
			}
		})
	}
}
