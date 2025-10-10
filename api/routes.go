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
	r.POST("/items/", h.CreateItem)

	r.PUT("/update/amount/:item_id/:location_id/:new_amount", h.UpdateItemAmount)
	r.PUT("/update/move/:item_id/:location_id/:new_location_id", h.MoveItem)

	// Example custom: consumables expiring soon
	r.GET("/consumables/expired", h.GetExpiredConsumables)
}
