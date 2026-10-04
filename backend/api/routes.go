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

	if using_auth {
		r.GET("/auth/eduid/login", authHandler.LoginHandler)
		r.GET("/auth/eduid/callback", authHandler.CallbackHandler)
		r.GET("/auth/eduid/logout", authHandler.LogoutHandler)
	} else {
		// OIDC isn't initialized without auth; the real handlers would panic.
		r.GET("/auth/eduid/login", authHandler.DevAuthRedirect)
		r.GET("/auth/eduid/callback", authHandler.DevAuthRedirect)
		r.GET("/auth/eduid/logout", authHandler.DevAuthRedirect)
	}

	r.GET("/search/:searchTerm", h.FuzzyFindItems)

	protected := r.Group("/")
	protected.Use(authHandler.AuthMiddleware(using_auth))
	adminOnly := authHandler.RequireAdmin(using_auth)
	{
		// Resources
		protected.GET("/organisations", h.GetOrganisations)
		protected.GET("/organisations/:orgId/buildings", h.GetBuildings)
		protected.GET("/organisations/:orgId/rooms", h.GetRooms)
		protected.GET("/organisations/:orgId/shelves", h.GetShelves)
		protected.GET("/organisations/:orgId/inventory", h.GetInventory) // ?start=X&end=X
		protected.POST("/organisations/:orgId/buildings", adminOnly, h.CreateBuilding)
		protected.POST("/organisations/:orgId/buildings/:buildingId/rooms", adminOnly, h.CreateRoom)
		protected.POST("/organisations/:orgId/buildings/:buildingId/rooms/:roomId/shelves", adminOnly, h.CreateShelf)

		// Items
		protected.GET("/organisations/:orgId/items/:id", h.GetItem) // ?start=X&end=X
		protected.POST("/organisations/:orgId/items", adminOnly, h.CreateItem)
		protected.PUT("/organisations/:orgId/items/:id", adminOnly, h.UpdateItem)
		protected.GET("/organisations/:orgId/items/:id/borrows", h.GetBorrowHistory)

		// Logged-in user ("me" = owner of the session cookie)
		protected.GET("/me", h.GetMe)
		protected.GET("/me/cart", h.GetShoppingCart) // ?start=X&end=X
		protected.POST("/me/cart/items", h.CreateCartItem)
		protected.POST("/me/cart/checkout", h.CheckoutCart)
		protected.POST("/me/checkout", h.InstantCheckout) // single item, bypasses the cart
		protected.DELETE("/me/cart/items", h.DeleteAllCartItems)
		protected.DELETE("/me/cart/items/:itemId", h.DeleteCartItem)
		protected.PUT("/me/cart/items/:itemId", h.UpdateCartItem)
		protected.GET("/me/borrow_requests", h.GetMyBorrowRequests)

		// Cart of a specific user (that user or admin only)
		protected.GET("/users/:userId/cart", h.GetShoppingCart) // ?start=X&end=X
		protected.POST("/users/:userId/cart/items", h.CreateCartItem)
		protected.POST("/users/:userId/cart/checkout", h.CheckoutCart)
		protected.DELETE("/users/:userId/cart/items", h.DeleteAllCartItems)
		protected.DELETE("/users/:userId/cart/items/:itemId", h.DeleteCartItem)
		protected.PUT("/users/:userId/cart/items/:itemId", h.UpdateCartItem)

		// Shelf unit description regeneration (manual triggers, admin only)
		protected.POST("/shelf-units/:id/regenerate-description", adminOnly, h.RegenerateShelfUnitDescription)
		protected.POST("/shelf-units/regenerate-descriptions", adminOnly, h.RegenerateAllDescriptions)

		// Loans & Requests
		protected.GET("/borrow_requests", h.GetBorrowRequests) // all: admin only; ?userId=N: that user or admin
		protected.PUT("/loans/:id", adminOnly, h.UpdateLoan)
		protected.PUT("/requests/:id/loans", adminOnly, h.UpdateLoanBulk)
		protected.POST("/requests/:id/review", adminOnly, h.RequestReview)
		protected.POST("/requests/:id/revert", adminOnly, h.RevertReview)
		protected.POST("/requests/:id/pickup", adminOnly, h.PickUpRequest)
		protected.GET("/requests/:id/messages", h.GetMessages)
		protected.POST("/requests/:id/messages", h.PostMessage)
	}
}
