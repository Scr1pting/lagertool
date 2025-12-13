package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/auth"
	"lagertool.com/main/config"
)

func SetupRoutes(r *gin.Engine, dbCon *pg.DB, cfg *config.Config) {
	h := NewHandler(dbCon, cfg)

	r.GET("/shelves", h.GetShelves) // ?organisation=
	r.GET("/item", h.GetItem)       // ?organisation=X&id=X&start=X&end=X
	r.GET("/organisations", h.GetOrganisations)
	r.GET("/shopping_cart", h.GetShoppingCart) // ?userID=X&start=X&end=X

	// Edu-ID endpoints
	r.GET("/auth/eduid/login", auth.LoginHandler)
	r.GET("/auth/eduid/callback", auth.CallbackHandler)

	//sorted by date
	r.GET("/rooms_sorted", h.GetRoomsS)
	r.GET("/buildings_sorted", h.GetBuildingsS)
	r.GET("/shelves_sorted", h.GetShelvesS)
	r.GET("/inventory_sorted", h.GetInventoryS) //?start=X&end=X

	//post
	r.POST("/create_building", h.CreateBuilding)
	r.POST("/create_room", h.CreateRoom)
	r.POST("/create_shelf", h.CreateShelf)
	r.POST("/add_item_to_cart", h.CreateCartItem)
	r.POST("/create_item", h.CreateItem)
	r.POST("/checkout", h.CheckoutCart)
}
