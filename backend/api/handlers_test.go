package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"lagertool.com/main/config"
	"lagertool.com/main/db"

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
	Building  *db.Building
	Room      *db.Room
	Shelf     *db.Shelf
	Column    *db.Column
	ShelfUnit *db.ShelfUnit
	Item      *db.Item
	Inventory *db.Inventory
}

// createTestHierarchy creates a full data hierarchy for testing complex endpoints
// and returns a struct containing all created objects.
func createTestHierarchy(t *testing.T, dbCon *pg.DB) *TestHierarchy {
	h := &TestHierarchy{}
	h.Building = &db.Building{Name: "Hierarchy Building", UpdateDate: time.Now()}
	_, err := dbCon.Model(h.Building).Insert()
	assert.NoError(t, err)

	h.Room = &db.Room{Name: "Hierarchy Room", BuildingID: h.Building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(h.Room).Insert()
	assert.NoError(t, err)

	h.Shelf = &db.Shelf{ID: "H-S-1", Name: "Hierarchy Shelf", RoomID: h.Room.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(h.Shelf).Insert()
	assert.NoError(t, err)

	h.Column = &db.Column{ID: "H-C-1", ShelfID: h.Shelf.ID}
	_, err = dbCon.Model(h.Column).Insert()
	assert.NoError(t, err)

	h.ShelfUnit = &db.ShelfUnit{ID: "H-SU-1", ColumnID: h.Column.ID}
	_, err = dbCon.Model(h.ShelfUnit).Insert()
	assert.NoError(t, err)

	h.Item = &db.Item{Name: "Hierarchy Item", IsConsumable: true}
	_, err = dbCon.Model(h.Item).Insert()
	assert.NoError(t, err)

	h.Inventory = &db.Inventory{ItemID: h.Item.ID, ShelfUnitID: h.ShelfUnit.ID, Amount: 10, UpdateDate: time.Now()}
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

	testOrg := &db.Organisation{Name: "Test Org"}
	_, err := dbCon.Model(testOrg).Insert()
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/organisations", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var organisations []db.Organisation
	err = json.Unmarshal(w.Body.Bytes(), &organisations)
	assert.NoError(t, err)
	assert.NotEmpty(t, organisations)
	assert.Equal(t, "Test Org", organisations[0].Name)

	_, err = dbCon.Model(&db.Organisation{}).Where("name = ?", "Test Org").Delete()
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
				var createdBuilding db.Building
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
	building := &db.Building{ID: 1, Name: "Test Building", Campus: "Test Campus"}
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
	var createdRoom db.Room
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
	_, err := dbCon.Model(&db.Building{}).Where("name = ? OR name = ?", "Old Building", "New Building").Delete()
	assert.NoError(t, err)

	// Insert test data with different update dates
	b1 := &db.Building{Name: "Old Building", Campus: "Main", UpdateDate: time.Now().Add(-time.Hour)}
	b2 := &db.Building{Name: "New Building", Campus: "Main", UpdateDate: time.Now()}
	_, err = dbCon.Model(b1, b2).Insert()
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/buildings_sorted", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var buildings []Building
	err = json.Unmarshal(w.Body.Bytes(), &buildings)
	assert.NoError(t, err)

	// Assert that we got at least 2 buildings and they are in the correct order (newest first)
	assert.GreaterOrEqual(t, len(buildings), 2)
	assert.Equal(t, "New Building", buildings[0].Name)
	assert.Equal(t, "Old Building", buildings[1].Name)

	// Cleanup
	_, err = dbCon.Model(&db.Building{}).Where("name = ? OR name = ?", "Old Building", "New Building").Delete()
	assert.NoError(t, err)
}

func TestGetRoomsS(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()

	h := NewHandler(dbCon, nil)
	router.GET("/rooms_sorted", h.GetRoomsS)

	// Insert related building
	building := &db.Building{Name: "Test Building", Campus: "Test Campus"}
	_, err := dbCon.Model(building).Insert()
	assert.NoError(t, err)

	// Insert test data with different update dates
	r1 := &db.Room{Name: "Old Room", BuildingID: building.ID, UpdateDate: time.Now().Add(-time.Hour)}
	r2 := &db.Room{Name: "New Room", BuildingID: building.ID, UpdateDate: time.Now()}
	_, err = dbCon.Model(r1, r2).Insert()
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/rooms_sorted", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var rooms []Room
	err = json.Unmarshal(w.Body.Bytes(), &rooms)
	assert.NoError(t, err)

	assert.GreaterOrEqual(t, len(rooms), 2)
	assert.Equal(t, "New Room", rooms[0].Name)
	assert.Equal(t, "Old Room", rooms[1].Name)

	// Cleanup
	_, err = dbCon.Model(&db.Room{}).Where("name = ? OR name = ?", "Old Room", "New Room").Delete()
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
	var shelves []ShelfSorted
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

	hier := createTestHierarchy(t, dbCon)

	req, _ := http.NewRequest("GET", "/shelves", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var shelves []Shelves
	err := json.Unmarshal(w.Body.Bytes(), &shelves)
	assert.NoError(t, err)
	assert.NotEmpty(t, shelves)
	assert.Equal(t, "Hierarchy Shelf", shelves[0].Name)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestGetInventoryS(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/inventory_sorted/:start/:end", h.GetInventoryS)

	hier := createTestHierarchy(t, dbCon)

	req, _ := http.NewRequest("GET", "/inventory_sorted/2025-01-01/2025-12-31", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var inventory []InventorySorted
	err := json.Unmarshal(w.Body.Bytes(), &inventory)
	assert.NoError(t, err)
	assert.NotEmpty(t, inventory)
	assert.Equal(t, "Hierarchy Item", inventory[0].Name)

	cleanupTestHierarchy(t, dbCon, hier)
}

func TestGetItem(t *testing.T) {
	router, dbCon := setupTestRouter()
	defer dbCon.Close()
	h := NewHandler(dbCon, nil)
	router.GET("/item/:id/:start/:end", h.GetItem)

	hier := createTestHierarchy(t, dbCon)

	req, _ := http.NewRequest("GET", "/item/"+strconv.Itoa(hier.Inventory.ID)+"/2025-01-01/2025-12-31", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var itemWithShelf InventoryItemWithShelf
	err := json.Unmarshal(w.Body.Bytes(), &itemWithShelf)
	assert.NoError(t, err)
	assert.Equal(t, "Hierarchy Item", itemWithShelf.InventoryItem.Name)
	assert.Equal(t, "Hierarchy Shelf", itemWithShelf.Shelf.Name)

	cleanupTestHierarchy(t, dbCon, hier)
}
