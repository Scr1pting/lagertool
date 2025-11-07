package auth

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/idtoken"
)

// OAuth configuration
var (
	googleOauthConfig *oauth2.Config
	store             *sessions.CookieStore
	backend_domain    string
	frontend_domain   string
)

func Init() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on system environment variables\nERROR: " + err.Error())
	}

	// Get environment variables
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		log.Fatal("GCP_PROJECT_ID environment variable not set")
	} else {
		log.Println("GCP_PROJECT_ID: " + projectID)
	}
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		log.Fatal("GOOGLE_CLIENT_ID environment variable not set")
	} else {
		log.Println("GOOGLE_CLIENT_ID: " + clientID)
	}
	sessionSecret := os.Getenv("SESSION_SECRET_KEY")
	if sessionSecret == "" {
		log.Fatal("SESSION_SECRET_KEY environment variable not set")
	} else {
		log.Println("SESSION_SECRET_KEY: " + sessionSecret)
	}
	production := os.Getenv("PRODUCTION")
	if production == "1" {
		backend_domain = "http://localhost:8000/api"
		frontend_domain = "https://05.hackathon.ethz.ch"
		log.Println("Using hackathon domain.")
	} else if production == "0" {
		log.Println("Using localhost.")
		backend_domain = "http://localhost:8000"
		frontend_domain = "http://localhost:5173"
	} else {
		log.Fatal("PRODUCTION envrionment variable not set")
		return
	}

	// Initialize session store
	store = sessions.NewCookieStore([]byte(sessionSecret))
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if clientSecret == "" {
		log.Fatal("GOOGLE_CLIENT_SECRET environment variable not set")
	}

	// Configure OAuth
	googleOauthConfig = &oauth2.Config{
		RedirectURL:  backend_domain + "/auth/google/callback",
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
}

func GoogleLoginHandler(c *gin.Context) {
	url := googleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func GoogleCallbackHandler(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code not found"})
		return
	}

	token, err := googleOauthConfig.Exchange(c, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token: " + err.Error()})
		return
	}

	client := googleOauthConfig.Client(c, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	var userInfo map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user info: " + err.Error()})
		return
	}

	session, err := store.Get(c.Request, "auth-session")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get session: " + err.Error()})
		return
	}
	session.Values["user"] = userInfo
	if err := session.Save(c.Request, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save session: " + err.Error()})
		return
	}
	c.Redirect(http.StatusTemporaryRedirect, frontend_domain)
}

func VerifyGoogleToken(c *gin.Context) {
	var requestBody struct {
		Credential string `json:"credential"`
	}
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GOOGLE_CLIENT_ID not set"})
		return
	}

	token, err := idtoken.Validate(c, requestBody.Credential, clientID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token: " + err.Error()})
		return
	}

	session, err := store.Get(c.Request, "auth-session")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get session: " + err.Error()})
		return
	}
	session.Values["user"] = map[string]interface{}{
		"name":  token.Claims["name"],
		"email": token.Claims["email"],
	}
	if err := session.Save(c.Request, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save session: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": session.Values["user"]})
}
