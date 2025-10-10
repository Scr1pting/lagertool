package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/db"
)

func main() {
	db.NewDBConn()
	// Create a new Gin router
	router := gin.Default()

	// Define a route for the root path
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello! This is a dummy message from the Gin server.",
			"status":  "success",
		})
	})

	// Start the server on port 8000
	router.Run(":8000")
}
