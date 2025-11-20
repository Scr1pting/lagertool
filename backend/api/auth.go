package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/coreos/go-oidc"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/go-redis/redis/v8"
	"golang.org/x/oauth2"
)

// Configuration constants
const (
	redisAddr        = "localhost:6379"
	redisDB          = 0
	redisPasswordEnv = "REDIS_PASSWORD"
	clientIDEnv      = "VSETH_CLIENT_ID"
	clientSecretEnv  = "VSETH_CLIENT_SECRET"
	stateTimeout     = 10 * time.Minute
	sessionTimeout   = 24 * time.Hour
	cookieName       = "user_session"
	cookiePath       = "/"
)

var (
	oauth2Config *oauth2.Config
	verifier     *oidc.IDTokenVerifier
	rdb          *redis.Client
)

// User represents authenticated user data
type User struct {
	ID    string `json:"sub"`
	Name  string `json:"name"`
	Email string `json:"email,omitempty"`
}

// Config holds authentication configuration
type Config struct {
	ClientID      string
	ClientSecret  string
	RedirectURL   string
	IssuerURL     string
	RedisAddr     string
	RedisPassword string
}

// Init initializes the authentication package
func Init(config Config) error {
	if config.ClientID == "" || config.ClientSecret == "" {
		return fmt.Errorf("client ID and secret are required")
	}

	// Initialize Redis
	if err := initRedis(config.RedisAddr, config.RedisPassword); err != nil {
		return fmt.Errorf("failed to initialize redis: %w", err)
	}

	// Initialize OIDC provider
	oidcProvider, err := oidc.NewProvider(context.Background(), config.IssuerURL)
	if err != nil {
		return fmt.Errorf("failed to initialize OIDC provider: %w", err)
	}

	oauth2Config = &oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		RedirectURL:  config.RedirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		Endpoint:     oidcProvider.Endpoint(),
	}

	verifier = oidcProvider.Verifier(&oidc.Config{
		ClientID: config.ClientID,
	})

	log.Println("✅ Authentication package initialized successfully")
	return nil
}

// InitFromEnv initializes authentication from environment variables
func InitFromEnv() error {
	config := Config{
		ClientID:      os.Getenv(clientIDEnv),
		ClientSecret:  os.Getenv(clientSecretEnv),
		RedirectURL:   "https://lagertool.ch/auth/callback",
		IssuerURL:     "https://keycloak-fake.vis.ethz.ch/realms/VSETH",
		RedisAddr:     redisAddr,
		RedisPassword: os.Getenv(redisPasswordEnv),
	}

	return Init(config)
}

func initRedis(addr, password string) error {
	log.Println("Initializing Redis...")

	rdb = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       redisDB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis connection failed: %w", err)
	}

	log.Println("✅ Redis initialized successfully!")
	return nil
}

// LoginHandler initiates the OAuth2 flow
func LoginHandler(c *gin.Context) {
	state := uuid.New().String()

	// Store state with expiration
	ctx := context.Background()
	if err := rdb.Set(ctx, state, state, stateTimeout).Err(); err != nil {
		log.Printf("❌ Failed to store state: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Authentication service unavailable",
		})
		return
	}

	url := oauth2Config.AuthCodeURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// CallbackHandler handles the OAuth2 callback
func CallbackHandler(c *gin.Context) {
	ctx := context.Background()

	// Validate state parameter
	state := c.Query("state")
	if state == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"error": "State parameter missing",
		})
		return
	}

	// Verify state exists in Redis
	if err := verifyState(ctx, state); err != nil {
		log.Printf("❌ State verification failed: %v", err)
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"error": "Invalid state parameter",
		})
		return
	}

	// Process authorization code
	code := c.Query("code")
	if code == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"error": "Authorization code missing",
		})
		return
	}

	user, err := exchangeCodeForUser(c, code)
	if err != nil {
		log.Printf("❌ Authentication failed: %v", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "Authentication failed",
		})
		return
	}

	// Set session cookie
	setSessionCookie(c, user.ID)

	// Store user data (you can implement this)
	if err := storeUserData(user); err != nil {
		log.Printf("⚠️ Failed to store user data: %v", err)
	}

	// Redirect to application instead of JSON response
	c.Redirect(http.StatusFound, "/dashboard")
}

// exchangeCodeForUser exchanges authorization code for user information
func exchangeCodeForUser(c *gin.Context, code string) (*User, error) {
	// Exchange code for token
	oauth2Token, err := oauth2Config.Exchange(c.Request.Context(), code)
	if err != nil {
		return nil, fmt.Errorf("token exchange failed: %w", err)
	}

	// Extract and verify ID token
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		return nil, fmt.Errorf("no ID token found in response")
	}

	idToken, err := verifier.Verify(c.Request.Context(), rawIDToken)
	if err != nil {
		return nil, fmt.Errorf("ID token validation failed: %w", err)
	}

	// Extract user claims
	var user User
	if err := idToken.Claims(&user); err != nil {
		return nil, fmt.Errorf("failed to extract user claims: %w", err)
	}

	if user.ID == "" {
		return nil, fmt.Errorf("user ID (sub claim) is empty")
	}

	return &user, nil
}

// verifyState validates the state parameter against Redis
func verifyState(ctx context.Context, state string) error {
	storedState, err := rdb.Get(ctx, state).Result()
	if err == redis.Nil {
		return fmt.Errorf("state not found or expired")
	} else if err != nil {
		return fmt.Errorf("redis error: %w", err)
	}

	if storedState != state {
		return fmt.Errorf("state mismatch")
	}

	// Clean up used state
	if err := rdb.Del(ctx, state).Err(); err != nil {
		log.Printf("⚠️ Failed to delete state: %v", err)
	}

	return nil
}

// setSessionCookie sets the user session cookie
func setSessionCookie(c *gin.Context, userID string) {
	// In production, use secure cookies and proper domain
	secure := true
	if gin.Mode() == gin.ReleaseMode {
		secure = true
	}

	c.SetCookie(
		cookieName,
		userID,
		int(sessionTimeout.Seconds()),
		cookiePath,
		"", // domain - set appropriately for your domain
		secure,
		true, // httpOnly
	)
}

func storeUserData(user *User) error {
	log.Printf("📝 User authenticated: %s", user.ID)
	return nil
}

// Middleware to protect routes that require authentication
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := c.Cookie(cookieName)
		if err != nil || userID == "" {
			c.Redirect(http.StatusFound, "/auth/login")
			c.Abort()
			return
		}

		// Optional: Validate userID against database
		// Optional: Refresh session if needed

		c.Set("userID", userID)
		c.Next()
	}
}

// LogoutHandler handles user logout
func LogoutHandler(c *gin.Context) {
	// Clear session cookie
	c.SetCookie(
		cookieName,
		"",
		-1, // Expire immediately
		cookiePath,
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}
