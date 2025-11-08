package auth

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/coreos/go-oidc"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
)

var (
	clientID     = os.Getenv("VSETH_CLIENT_ID")
	clientSecret = os.Getenv("VSETH_CLIENT_SECRET")
	redirectURL  = "https://lagertool.ch/auth/callback"
	issuerURL    = "ISSUER_URL_HERE"

	oauth2Config *oauth2.Config
	oidcProvider *oidc.Provider
	verifier     *oidc.IDTokenVerifier
)

func init() {
	oidcProvider, err := oidc.NewProvider(context.Background(), issuerURL)
	if err != nil {
		log.Fatalf("Failed to initalize OIDC provider %v", err)
	}

	oauth2Config = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile"},
		Endpoint:     oidcProvider.Endpoint(),
	}

	verifier = oidcProvider.Verifier(&oidc.Config{
		ClientID: clientID,
	})
}

// connects to /auth/login
func LoginHandler(c *gin.Context) {
	state := uuid.New().String()
	// state store here (Redis or something)

	url := oauth2Config.AuthCodeURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// connects to /auth/callback
func CallbackHandler(c *gin.Context) {
	state := c.Query("state")
	// check in state store
	// delete state from statestore

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

	var UserData struct {
		Name string `json:"name"`
		Sub  string `json:"sub"`
		// expansions and shit if we need it
	}
	if err := idToken.Claims(&UserData); err != nil {
		log.Printf("Failed to extract claims: %v", err)
	}

	secure := true
	http := true
	lifetime := 3600 // example
	c.SetCookie("user_session", UserData.Sub, lifetime, "/", "localhost", secure, http)

	// TODO: STORE USER DATA IN DB

	c.JSON(http.StatusOK, gin.H{
		"message": "Authentication successful!",
	})
}
