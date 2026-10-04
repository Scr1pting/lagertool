package main

import (
	"context"
	"flag"
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"lagertool.com/main/api"
	"lagertool.com/main/auth"
	"lagertool.com/main/config"
	"lagertool.com/main/db"
	_ "lagertool.com/main/docs"
)

// @title Lagertool Inventory API
// @version 1.0
// @description Backend API for inventory management system tracking items, locations, and loans.
// @description
// @description Authentication: log in via GET /auth/eduid/login (VSETH Keycloak) in the browser. The backend then sets an HttpOnly "user_session" cookie, which must be sent with every request (fetch: credentials "include", axios: withCredentials). Without a valid session, all routes except /auth/* and /search return 401.
// @description
// @description Authorisation: /me/... routes act on the logged-in user. Routes marked "Admin only" return 403 for users without admin rights (from the Keycloak roles in AUTH_ADMIN_ROLES).
// @description
// @description With USING_AUTH=false (local dev only) every request acts as the dev user (DEV_USER_ID) with admin rights.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@lagertool.com

// @license.name AGPL-3.0
// @license.url https://www.gnu.org/licenses/agpl-3.0.html

// @host localhost:8000
// @BasePath /
// @schemes http

func main() {
	testdata := flag.Bool("testdata", false, "insert testdata into db")
	noserver := flag.Bool("noserver", false, "dont start sever")
	usingAuthFlag := flag.Bool("using_auth", true, "use auth (if not given: USING_AUTH env, default true)")
	flag.Parse()

	// Load configuration from .env file
	cfg := config.Load()

	using_auth := resolveUsingAuth(*usingAuthFlag)
	if !using_auth {
		log.Println("⚠️  AUTH DISABLED — every request acts as the dev user with admin rights. Never run like this in production.")
	}

	router := gin.Default()
	// Configure CORS middleware
	router.Use(cors.New(cors.Config{
		// Explicit origins: browsers don't send cookies to "*" with credentials.
		AllowOrigins:     frontendOrigins(),
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	dbConnection, err := db.NewDBConn(cfg)
	if err != nil {
		log.Fatal("DBConnection failed: ", err)
	}
	defer func(db *pg.DB) {
		err := db.Close()
		if err != nil {
			log.Fatal(err)
		}
	}(dbConnection)

	db.InitDB(dbConnection)
	if *testdata {
		db.InsertDummyData(dbConnection)
	}
	if !*noserver {
		if using_auth {
			auth.InitOIDC()
		}
		api.SetupRoutes(router, dbConnection, cfg, using_auth)

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		auth.NewAuthHandler(dbConnection).StartSessionCleanup(ctx)

		// Swagger endpoint
		router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

		log.Println("🚀 Server running on http://localhost:8000")
		log.Println("📚 Swagger UI available at http://localhost:8000/swagger/index.html")
		if err := router.Run(":8000"); err != nil {
			log.Fatal(err)
		}
	}
}

// resolveUsingAuth: an explicit -using_auth flag wins, otherwise USING_AUTH
// from the environment/.env. Auth stays on unless explicitly disabled, so a
// deployment can't accidentally run without it.
func resolveUsingAuth(flagValue bool) bool {
	explicit := false
	flag.Visit(func(f *flag.Flag) {
		if f.Name == "using_auth" {
			explicit = true
		}
	})
	if explicit {
		return flagValue
	}
	return os.Getenv("USING_AUTH") != "false"
}

// frontendOrigins returns the allowed CORS origins from FRONTEND_URL
// (comma-separated), defaulting to the Vite dev server.
func frontendOrigins() []string {
	v := os.Getenv("FRONTEND_URL")
	if v == "" {
		return []string{"http://localhost:5173"}
	}
	origins := strings.Split(v, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}
	return origins
}
