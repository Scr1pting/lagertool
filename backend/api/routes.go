package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/auth"
	"lagertool.com/main/config"
)

func SetupRoutes(r *gin.Engine, dbCon *pg.DB, cfg *config.Config, using_auth bool) {
	h := NewHandler(dbCon, cfg)
	authHandler := auth.NewAuthHandler(dbCon)

	r.GET("/auth/eduid/login", authHandler.LoginHandler)
	r.GET("/auth/eduid/callback", authHandler.CallbackHandler)
	r.GET("/auth/eduid/logout", authHandler.LogoutHandler)

	r.GET("/search/:searchTerm", h.FuzzyFindItems)

	protected := r.Group("/")
	protected.Use(authHandler.AuthMiddleware(using_auth))
	{
		// Resources
		protected.GET("/organisations", h.GetOrganisations)
		protected.GET("/organisations/:orgId/buildings", h.GetBuildings)
		protected.GET("/organisations/:orgId/rooms", h.GetRooms)
		protected.GET("/organisations/:orgId/shelves", h.GetShelves)
		protected.GET("/organisations/:orgId/inventory", h.GetInventory) // ?start=X&end=X
		protected.POST("/organisations/:orgId/buildings", h.CreateBuilding)
		protected.POST("/organisations/:orgId/buildings/:buildingId/rooms", h.CreateRoom)
		protected.POST("/organisations/:orgId/buildings/:buildingId/rooms/:roomId/shelves", h.CreateShelf)

		// Items
		protected.GET("/organisations/:orgId/items/:id", h.GetItem) // ?start=X&end=X
		protected.POST("/organisations/:orgId/items", h.CreateItem)
		protected.PUT("/organisations/:orgId/items/:id", h.UpdateItem)
		protected.GET("/organisations/:orgId/items/:id/borrows", h.GetBorrowHistory)

		// Cart
		protected.GET("/users/:userId/cart", h.GetShoppingCart) // ?start=X&end=X
		protected.POST("/users/:userId/cart/items", h.CreateCartItem)
		protected.POST("/users/:userId/cart/checkout", h.CheckoutCart)
		protected.DELETE("/users/:userId/cart/items", h.DeleteAllCartItems)
		protected.DELETE("/users/:userId/cart/items/:itemId", h.DeleteCartItem)
		protected.PUT("/users/:userId/cart/items/:itemId", h.UpdateCartItem)

		// Loans & Requests
		protected.PUT("/loans/:id", h.UpdateLoan)
		protected.PUT("/requests/:id", h.UpdateRequest)
		protected.PUT("/requests/:id/loans", h.UpdateLoanBulk)
		protected.POST("/requests/:id/review", h.RequestReview)
		protected.GET("/requests/:id/messages", h.GetMessages)
		protected.POST("/requests/:id/messages", h.PostMessage)
	}
}
