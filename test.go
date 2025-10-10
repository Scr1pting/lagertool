package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// Create a new Gin router
	router := gin.Default()

	// Define a route for the root path
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello! This is a dummy message from the Gin server.",
			"status":  "success",
		})
	})

	// Define another route for a different endpoint
	router.GET("/api/message", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "This is an API endpoint with a dummy message!",
			"data": gin.H{
				"id":      1,
				"content": "Dummy content for demonstration",
				"author":  "Gin Server",
			},
		})
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "dummy-server",
		})
	})

	// Start the server on port 8080
	router.Run(":8080")
}
