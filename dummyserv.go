package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api"
	"lagertool.com/main/db"
)

func main() {
	dbConnection, err := db.NewDBConn()
	if err != nil {
		log.Fatal(err)
	}
	defer func(db *pg.DB) {
		err := db.Close()
		if err != nil {
			log.Fatal(err)
		}
	}(dbConnection)

	router := gin.Default()
	api.SetupRoutes(router, dbConnection)

	log.Println("🚀 Server running on http://localhost:8080")
	err = router.Run(":8080")
	if err != nil {
		return
	}

	//// Create a new Gin router
	//router := gin.Default()
	//
	//// Define a route for the root path
	//router.GET("/", func(c *gin.Context) {
	//	c.JSON(http.StatusOK, gin.H{
	//		"message": "Hello! This is a dummy message from the Gin server.",
	//		"status":  "success",
	//	})
	//})
	//
	//// Define another route for a different endpoint
	//router.GET("/api/message", func(c *gin.Context) {
	//	c.JSON(http.StatusOK, gin.H{
	//		"message": "This is an API endpoint with a dummy message!",
	//		"data": gin.H{
	//			"id":      1,
	//			"content": "Dummy content for demonstration",
	//			"author":  "Gin Server",
	//		},
	//	})
	//})
	//
	//// Health check endpoint
	//router.GET("/health", func(c *gin.Context) {
	//	c.JSON(http.StatusOK, gin.H{
	//		"status":  "healthy",
	//		"service": "dummy-server-test2",
	//	})
	//})
	//
	//// Start the server on port 8000
	//router.Run(":8000")
}
