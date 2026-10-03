package auth

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/coreos/go-oidc"
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"github.com/google/uuid"
	"lagertool.com/main/db_models"

	"golang.org/x/oauth2"
)

var (
	clientID     = os.Getenv("VSETH_CLIENT_ID")
	clientSecret = os.Getenv("VSETH_CLIENT_SECRET")
	redirectURL  = getEnv("AUTH_REDIRECT_URL", "https://lagertool.ch/auth/eduid/callback")
	issuerURL    = getEnv("AUTH_ISSUER_URL", "https://keycloak-fake.vis.ethz.ch/realms/VSETH")

	oauth2Config *oauth2.Config
	oidcProvider *oidc.Provider
	verifier     *oidc.IDTokenVerifier
)

const (
	sessionCookie = "user_session"
	stateCookie   = "oauth_state"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// InitOIDC contacts the identity provider. Only called when auth is enabled,
// so the server and tests can run without network access to Keycloak.
func InitOIDC() {
	var err error
	oidcProvider, err = oidc.NewProvider(context.Background(), issuerURL)
	if err != nil {
		log.Fatalf("Failed to initalize OIDC provider %v", err)
	}

	oauth2Config = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		Endpoint:     oidcProvider.Endpoint(),
	}

	verifier = oidcProvider.Verifier(&oidc.Config{
		ClientID: clientID,
	})
}

type AuthHandler struct {
	DB *pg.DB
}

func NewAuthHandler(db *pg.DB) *AuthHandler {
	return &AuthHandler{DB: db}
}

// connects to /auth/login
func (h *AuthHandler) LoginHandler(c *gin.Context) {
	state := uuid.New().String()
	c.SetCookie(stateCookie, state, 600, "/", "", true, true)
	url := oauth2Config.AuthCodeURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// connects to /auth/callback
func (h *AuthHandler) CallbackHandler(c *gin.Context) {
	expectedState, err := c.Cookie(stateCookie)
	if err != nil || expectedState == "" || c.Query("state") != expectedState {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid OAuth state"})
		return
	}
	c.SetCookie(stateCookie, "", -1, "/", "", true, true)

	code := c.Query("code")
	if code == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Authorization code missing"})
		return
	}

	oauth2Token, err := oauth2Config.Exchange(c.Request.Context(), code)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Token exchange failed", "details": err.Error()})
		return
	}
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "No ID token found in response."})
		return
	}
	idToken, err := verifier.Verify(c.Request.Context(), rawIDToken)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "ID token validation failed", "details": err.Error()})
		return
	}

	var claims struct {
		Sub   string `json:"sub"`
		Name  string `json:"name"`
		Email string `json:"email"`
		// expansions and shit if we need it
	}
	if err := idToken.Claims(&claims); err != nil || claims.Sub == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Failed to extract claims"})
		return
	}

	secure := true
	http_only := true
	path := "/"   // path for which cookie is valid
	domain := ""  // host-only cookie
	lifetime := 1 // hours

	var dbUser []db_models.User
	err = h.DB.Model(&dbUser).Where("subject = ?", claims.Sub).Select()
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Database error during user lookup", "details": err.Error()})
		return
	}
	if len(dbUser) == 0 {
		user := db_models.User{
			Subject:      claims.Sub,
			Issuer:       idToken.Issuer,
			Email:        claims.Email,
			Name:         claims.Name,
			AccessToken:  oauth2Token.AccessToken,
			RefreshToken: oauth2Token.RefreshToken,
			CreatedAt:    time.Now(),
			LastLogin:    time.Now(),
		}
		_, err = h.DB.Model(&user).Insert()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Insertion failed", "details": err.Error()})
			return
		}
	} else if len(dbUser) > 1 {
		c.AbortWithStatusJSON(http.StatusExpectationFailed, gin.H{"error": "Multiple users found", "details": dbUser})
		return
	} else {
		dbU := dbUser[0]
		dbU.Subject = claims.Sub
		dbU.Issuer = idToken.Issuer
		dbU.AccessToken = oauth2Token.AccessToken
		dbU.RefreshToken = oauth2Token.RefreshToken
		dbU.LastLogin = time.Now()
		_, err = h.DB.Model(&dbU).Where("id = ?", dbU.ID).Update()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Update failed", "details": err.Error()})
			return
		}
	}

	var user db_models.User
	err = h.DB.Model(&user).Where("subject = ?", claims.Sub).First()
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "User not found", "details": err.Error()})
		return
	}

	session := db_models.Session{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(time.Duration(lifetime) * time.Hour),
		UserIP:    net.ParseIP(c.ClientIP()),
	}
	_, err = h.DB.Model(&session).Insert()
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"details": err.Error(),
		})
		return
	}

	c.SetCookie(sessionCookie, session.ID, lifetime*3600, path, domain, secure, http_only)

	c.JSON(http.StatusOK, gin.H{"message": "Authentication successful!"})
}

func (h *AuthHandler) LogoutHandler(c *gin.Context) {
	sessionID, err := c.Cookie(sessionCookie)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "No session cookie"})
		return
	}

	_, err = h.DB.Model((*db_models.Session)(nil)).Where("session_id = ?", sessionID).Delete()
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete session", "details": err.Error()})
		return
	}

	c.SetCookie(sessionCookie, "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) AuthMiddleware(using_auth bool) gin.HandlerFunc {
	if !using_auth {
		return func(c *gin.Context) {
			c.Next()
		}
	}
	return func(c *gin.Context) {
		sessionID, err := c.Cookie(sessionCookie)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "No session cookie", "details": err.Error()})
			return
		}

		var session db_models.Session
		err = h.DB.Model(&session).Relation("User").Where("session.session_id = ?", sessionID).First()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid session", "details": err.Error()})
			return
		}
		if time.Now().After(session.ExpiresAt) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session expired", "details": sessionID})
			return
		}
		c.Set("user", session.User)
		c.Set("session", &session)
		c.Next()
	}
}
