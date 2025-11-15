package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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

	return router, dbConnection
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
