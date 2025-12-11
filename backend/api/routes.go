package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/config"
)

func SetupRoutes(r *gin.Engine, dbCon *pg.DB, cfg *config.Config) {
	h := NewHandler(dbCon, cfg)

	r.GET("/shelves", h.GetShelves)
	r.GET("/item/:id/:start/:end", h.GetItem) // inventory Item ID, DateRange
	r.GET("/organisations", h.GetOrganisations)
	r.GET("/shopping_cart/:id/:start/:end", h.GetShoppingCart) // userID

	// Edu-ID endpoints
	r.GET("/auth/eduid/login", LoginHandler)
	r.GET("/auth/eduid/callback", h.CallbackHandler)

	// sorted by date
	r.GET("/rooms_sorted", h.GetRoomsS)
	r.GET("/buildings_sorted", h.GetBuildingsS)
	r.GET("/shelves_sorted", h.GetShelvesS)
	r.GET("/inventory_sorted/:start/:end", h.GetInventoryS)

	// post
	r.POST("/create_building", h.CreateBuilding)
	r.POST("/create_room", h.CreateRoom)
}
