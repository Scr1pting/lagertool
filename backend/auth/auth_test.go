package auth

import (
	"context"
	"encoding/base64"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"lagertool.com/main/db_models"
)

func fakeToken(payload string) string {
	return "e30." + base64.RawURLEncoding.EncodeToString([]byte(payload)) + ".sig"
}

func TestHasAdminRole(t *testing.T) {
	// resource_access as seen for the VSETH fake realm test users
	cases := map[string]struct {
		payload string
		want    bool
	}{
		"admin":    {`{"resource_access":{"eventmanager":{"roles":["vis-active","admin"]},"ei-tool":{"roles":["admin"]},"member-ui":{"roles":["admin"]},"member-api":{"roles":["admin"]},"cdn-backend":{"roles":["admin"]}}}`, true},
		"vorstand": {`{"resource_access":{"eventmanager":{"roles":["vis-active"]},"member-ui":{"roles":["admin"]},"member-api":{"roles":["admin"]},"cdn-backend":{"roles":["admin"]}}}`, true},
		"user":     {`{"resource_access":{"eventmanager":{"roles":["admin"]},"account":{"roles":["manage-account"]}}}`, false},
		"garbage":  {`not json`, false},
	}
	for name, tc := range cases {
		if got := hasAdminRole(fakeToken(tc.payload)); got != tc.want {
			t.Errorf("%s: hasAdminRole = %v, want %v", name, got, tc.want)
		}
	}
	if hasAdminRole("not-a-jwt") {
		t.Error("malformed token should not be admin")
	}
}

func TestRequireAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AuthHandler{}
	cases := map[string]struct {
		usingAuth bool
		user      *db_models.User
		want      int
	}{
		"admin":         {true, &db_models.User{ID: 1, IsAdmin: true}, http.StatusOK},
		"normal user":   {true, &db_models.User{ID: 2}, http.StatusForbidden},
		"no user":       {true, nil, http.StatusForbidden},
		"auth disabled": {false, nil, http.StatusOK},
	}
	for name, tc := range cases {
		r := gin.New()
		r.GET("/x", func(c *gin.Context) {
			if tc.user != nil {
				c.Set("user", tc.user)
			}
			c.Next()
		}, h.RequireAdmin(tc.usingAuth), func(c *gin.Context) { c.Status(http.StatusOK) })
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/x", nil))
		if w.Code != tc.want {
			t.Errorf("%s: status = %d, want %d", name, w.Code, tc.want)
		}
	}
}

func TestRefreshIfNeededClassifiesErrors(t *testing.T) {
	tokenSecret = make([]byte, 32)
	encRefresh, err := encryptToken("some-refresh-token")
	if err != nil {
		t.Fatal(err)
	}
	expired := time.Now().Add(-time.Hour)

	cases := map[string]struct {
		status  int
		body    string
		revoked bool
	}{
		"grant rejected": {http.StatusBadRequest, `{"error":"invalid_grant","error_description":"Session not active"}`, true},
		"idp down":       {http.StatusServiceUnavailable, `oops`, false},
	}
	for name, tc := range cases {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(tc.status)
			_, _ = w.Write([]byte(tc.body))
		}))
		oauth2Config = &oauth2.Config{ClientID: "x", Endpoint: oauth2.Endpoint{TokenURL: srv.URL}}

		h := &AuthHandler{}
		err := h.refreshIfNeeded(context.Background(), &db_models.User{ID: 1, RefreshToken: encRefresh, AccessTokenExpiresAt: expired})
		srv.Close()
		if err == nil {
			t.Fatalf("%s: expected an error", name)
		}
		if got := errors.Is(err, errSessionRevoked); got != tc.revoked {
			t.Errorf("%s: revoked = %v, want %v (err: %v)", name, got, tc.revoked, err)
		}
	}

	h := &AuthHandler{}
	if err := h.refreshIfNeeded(context.Background(), &db_models.User{ID: 1, AccessTokenExpiresAt: expired}); !errors.Is(err, errSessionRevoked) {
		t.Errorf("missing refresh token: want errSessionRevoked, got %v", err)
	}
	if err := h.refreshIfNeeded(context.Background(), &db_models.User{ID: 1, RefreshToken: "not-encrypted", AccessTokenExpiresAt: expired}); !errors.Is(err, errSessionRevoked) {
		t.Errorf("undecryptable refresh token: want errSessionRevoked, got %v", err)
	}
	if err := h.refreshIfNeeded(context.Background(), &db_models.User{ID: 1, AccessTokenExpiresAt: time.Now().Add(time.Hour)}); err != nil {
		t.Errorf("valid access token: want no refresh, got %v", err)
	}
}
