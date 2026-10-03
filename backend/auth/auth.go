package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"slices"
	"strings"
	"time"

	"github.com/coreos/go-oidc"
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"github.com/google/uuid"
	"lagertool.com/main/db_models"

	"golang.org/x/oauth2"
)

var (
	oauth2Config  *oauth2.Config
	oidcProvider  *oidc.Provider
	verifier      *oidc.IDTokenVerifier
	endSessionURL string
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
// Env is read here rather than at package init so values from .env are loaded.
func InitOIDC() {
	clientID := os.Getenv("VSETH_CLIENT_ID")
	clientSecret := os.Getenv("VSETH_CLIENT_SECRET")
	redirectURL := getEnv("AUTH_REDIRECT_URL", "http://localhost:8000/auth/eduid/callback")
	issuerURL := getEnv("AUTH_ISSUER_URL", "https://keycloak-fake.vis.ethz.ch/realms/VSETH")
	if clientID == "" || clientSecret == "" {
		log.Fatal("VSETH_CLIENT_ID and VSETH_CLIENT_SECRET must be set when running with -using_auth")
	}

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

	var providerClaims struct {
		EndSessionEndpoint string `json:"end_session_endpoint"`
	}
	if err := oidcProvider.Claims(&providerClaims); err != nil {
		log.Fatalf("Failed to read OIDC provider metadata %v", err)
	}
	endSessionURL = providerClaims.EndSessionEndpoint
}

func frontendURL() string {
	return getEnv("FRONTEND_URL", "http://localhost:5173")
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
	authURL := oauth2Config.AuthCodeURL(state)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// adminRoles returns the "client:role" pairs from AUTH_ADMIN_ROLES that grant
// lagertool admin rights. Default member-api:admin, which in the VSETH realm is
// held by admins and Vorstand but not by normal users.
// Switch to lagertool:admin once VSETH defines roles for the lagertool client.
func adminRoles() []string {
	return strings.Split(getEnv("AUTH_ADMIN_ROLES", "member-api:admin"), ",")
}

// hasAdminRole checks the Keycloak client roles (resource_access) in the
// access token. The token comes straight from the token endpoint over TLS
// (back channel), so its payload is read without re-verifying the signature.
func hasAdminRole(accessToken string) bool {
	parts := strings.Split(accessToken, ".")
	if len(parts) != 3 {
		return false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		log.Printf("Failed to decode access token: %v", err)
		return false
	}
	var claims struct {
		ResourceAccess map[string]struct {
			Roles []string `json:"roles"`
		} `json:"resource_access"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		log.Printf("Failed to parse access token claims: %v", err)
		return false
	}
	for _, pair := range adminRoles() {
		client, role, ok := strings.Cut(strings.TrimSpace(pair), ":")
		if !ok {
			continue
		}
		if slices.Contains(claims.ResourceAccess[client].Roles, role) {
			return true
		}
	}
	return false
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
	isAdmin := hasAdminRole(oauth2Token.AccessToken)
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
			IsAdmin:      isAdmin,
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
		dbU.IsAdmin = isAdmin
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
		IDToken:   rawIDToken,
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
	c.Redirect(http.StatusFound, frontendURL())
	//c.JSON(http.StatusOK, gin.H{"message": "Authentication successful!"})
}

// LogoutHandler ends the local session and then the Keycloak SSO session;
// otherwise the next /login would silently log the same user back in.
func (h *AuthHandler) LogoutHandler(c *gin.Context) {
	logoutParams := url.Values{}
	logoutParams.Set("client_id", oauth2Config.ClientID)
	logoutParams.Set("post_logout_redirect_uri", frontendURL())

	if sessionID, err := c.Cookie(sessionCookie); err == nil {
		var session db_models.Session
		if err := h.DB.Model(&session).Where("session_id = ?", sessionID).First(); err == nil && session.IDToken != "" {
			logoutParams.Set("id_token_hint", session.IDToken)
		}
		_, err = h.DB.Model((*db_models.Session)(nil)).Where("session_id = ?", sessionID).Delete()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete session", "details": err.Error()})
			return
		}
	}

	c.SetCookie(sessionCookie, "", -1, "/", "", true, true)
	c.Redirect(http.StatusFound, endSessionURL+"?"+logoutParams.Encode())
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

// RequireAdmin must run after AuthMiddleware. It rejects users without admin rights.
func (h *AuthHandler) RequireAdmin(using_auth bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !using_auth {
			c.Next()
			return
		}
		user, ok := c.Get("user")
		if u, isUser := user.(*db_models.User); !ok || !isUser || u == nil || !u.IsAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin rights required"})
			return
		}
		c.Next()
	}
}
