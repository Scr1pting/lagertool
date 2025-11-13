package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/auth"
	"lagertool.com/main/config"
)

func SetupRoutes(r *gin.Engine, dbCon *pg.DB, cfg *config.Config) {
	h := NewHandler(dbCon, cfg)

	r.GET("/shelves", h.GetShelves)
	r.GET("/item/:id/:start/:end", h.GetItem) //inventory Item ID, DateRange
	r.GET("/organisations", h.GetOrganisations)
	r.GET("/shopping_cart/:id/:start/:end", h.GetShoppingCart) //userID

	// Google OAuth2
	r.GET("/auth/google/login", auth.GoogleLoginHandler)
	r.GET("/auth/google/callback", auth.GoogleCallbackHandler)
	r.POST("/auth/google/callback", auth.VerifyGoogleToken)

	//sorted by date
	r.GET("/rooms_sorted", h.GetRoomsS)
	r.GET("/buildings_sorted", h.GetBuildingsS)
	r.GET("/shelves_sorted", h.GetShelvesS)
	r.GET("/inventory_sorted/:start/:end", h.GetInventoryS)

	//post
	r.POST("/create_building", h.CreateBuilding)
}
