package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"lagertool.com/main/api"
	"lagertool.com/main/config"
	"lagertool.com/main/db"
	_ "lagertool.com/main/docs"
	"lagertool.com/main/slack1"
)

// @title Lagertool Inventory API
// @version 1.0
// @description Backend API for inventory management system tracking items, locations, and loans
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@lagertool.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8000
// @BasePath /
// @schemes http

func main() {
	// Load configuration from .env file
	cfg := config.Load()

	router := gin.Default()

	// Configure CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Allow all origins, or specify your frontend URL
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
	slack1.SetupSlack(cfg)

	if err := db.InsertBasicData(dbConnection); err != nil {
		log.Printf("⚠️  Failed to insert test data: %v", err)
	}

	api.SetupRoutes(router, dbConnection)

	// Swagger endpoint
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	log.Println("🚀 Server running on http://localhost:8000")
	log.Println("📚 Swagger UI available at http://localhost:8000/swagger/index.html")
	err = router.Run(":8000")
	if err != nil {
		return
	}
}
