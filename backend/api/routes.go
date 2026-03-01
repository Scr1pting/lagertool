package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/auth"
	"lagertool.com/main/config"
)

func SetupRoutes(r *gin.Engine, dbCon *pg.DB, cfg *config.Config) {
	h := NewHandler(dbCon, cfg)

	// Resources
	r.GET("/organisations", h.GetOrganisations)
	r.GET("/organisations/:orgId/buildings", h.GetBuildings)
	r.GET("/organisations/:orgId/rooms", h.GetRooms)
	r.GET("/organisations/:orgId/shelves", h.GetShelves)
	r.GET("/organisations/:orgId/inventory", h.GetInventory) // ?start=X&end=X

	// Items
	r.GET("/items/:id", h.GetItem) // ?start=X&end=X
	r.POST("/items", h.CreateItem)
	r.PUT("/items/:id", h.UpdateItem)

	// Cart
	r.GET("/users/:userId/cart", h.GetShoppingCart) // ?start=X&end=X
	r.POST("/users/:userId/cart/items", h.CreateCartItem)
	r.POST("/users/:userId/cart/checkout", h.CheckoutCart)

	// Loans & Requests
	r.PUT("/loans/:id", h.UpdateLoan)
	r.PUT("/requests/:id", h.UpdateRequest)
	r.POST("/requests/:id/review", h.RequestReview)
	r.GET("/requests/:id/messages", h.GetMessages)
	r.POST("requests/:id/message", h.PostMessage)

	// Auth
	r.GET("/auth/eduid/login", auth.LoginHandler)
	r.GET("/auth/eduid/callback", auth.CallbackHandler)
}
