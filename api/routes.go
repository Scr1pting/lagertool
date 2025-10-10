package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
)

func SetupRoutes(r *gin.Engine, db *pg.DB) {
	h := NewHandler(db)

	// Location endpoints
	r.GET("/locations", h.GetAllLocations)
	r.GET("/locations/:id", h.GetLocationByID)
	r.POST("/locations", h.CreateLocation)

	// Item endpoints
	r.GET("/items/search", h.SearchItems)

	// Example custom: consumables expiring soon
	r.GET("/consumables/expired", h.GetExpiredConsumables)
}
