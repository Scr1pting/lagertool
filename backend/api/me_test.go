package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"lagertool.com/main/db_models"
)

func TestTargetUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cases := []struct {
		name       string
		user       *db_models.User
		param      string
		wantID     int
		wantOK     bool
		wantStatus int
	}{
		{"me route, logged in", &db_models.User{ID: 7}, "", 7, true, 0},
		{"me route, not logged in", nil, "", 0, false, http.StatusUnauthorized},
		{"own id", &db_models.User{ID: 7}, "7", 7, true, 0},
		{"other id, normal user", &db_models.User{ID: 7}, "8", 0, false, http.StatusForbidden},
		{"other id, admin", &db_models.User{ID: 7, IsAdmin: true}, "8", 8, true, 0},
		{"no user in context (tests/no middleware)", nil, "8", 8, true, 0},
		{"invalid id", &db_models.User{ID: 7}, "abc", 0, false, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			if tc.user != nil {
				c.Set("user", tc.user)
			}
			if tc.param != "" {
				c.Params = gin.Params{{Key: "userId", Value: tc.param}}
			}
			id, ok := targetUserID(c)
			assert.Equal(t, tc.wantOK, ok)
			assert.Equal(t, tc.wantID, id)
			if !tc.wantOK {
				assert.Equal(t, tc.wantStatus, w.Code)
			}
		})
	}
}

func TestActingUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	assert.Equal(t, 5, actingUserID(c, 5), "falls back to body without session user")
	c.Set("user", &db_models.User{ID: 9})
	assert.Equal(t, 9, actingUserID(c, 5), "session user wins over body")
}
