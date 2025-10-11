package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/config"
)

func SetupRoutes(r *gin.Engine, dbCon *pg.DB, cfg *config.Config) {
	h := NewHandler(dbCon, cfg)

	// Location endpoints
	r.GET("/locations", h.GetAllLocations)
	r.GET("/locations/:id", h.GetLocationByID)
	r.POST("/locations", h.CreateLocation)
	r.PUT("/locations/:id", h.UpdateLocation)
	r.DELETE("/locations/:id", h.DeleteLocation)

	// Item endpoints
	r.GET("/items", h.GetAllItems)
	r.GET("/items/search", h.SearchItems)
	r.GET("/items/:id", h.GetItemByID)
	r.POST("/items", h.CreateItem)
	r.PUT("/items/:id", h.UpdateItem)
	r.DELETE("/items/:id", h.DeleteItem)

	// Inventory (IsIn) endpoints
	r.GET("/inventory", h.GetAllInventory)
	r.GET("/inventory/location/:location_id", h.GetInventoryByLocation)
	r.GET("/inventory/item/:item_id", h.GetInventoryByItem)
	r.GET("/inventory/:id", h.GetInventoryByID)
	r.POST("/inventory", h.CreateInventory)
	r.PUT("/inventory/:id", h.UpdateInventory)
	r.PATCH("/inventory/:id/amount", h.UpdateInventoryAmount)
	r.DELETE("/inventory/:id", h.DeleteInventory)
	r.POST("/inventory/new_item", h.InsertNewItem)

	// Person endpoints
	r.GET("/persons", h.GetAllPersons)
	r.GET("/persons/search", h.SearchPersons)
	r.GET("/persons/:id", h.GetPersonByID)
	r.POST("/persons", h.CreatePerson)
	r.PUT("/persons/:id", h.UpdatePerson)
	r.DELETE("/persons/:id", h.DeletePerson)

	// Loans endpoints
	r.GET("/loans", h.GetAllLoans)
	r.GET("/loans/person/:person_id", h.GetLoansByPerson)
	r.GET("/loans/person/:person_id/history", h.GetLoanHistoryByPerson)
	r.GET("/loans/permanent/:perm_id", h.GetLoansByPermanent)
	r.GET("/loans/overdue", h.GetOverdueLoans)
	r.GET("/loans/item/:item_id/history", h.GetLoanHistoryByItem)
	r.GET("/loans/:id", h.GetLoanByID)
	r.POST("/loans", h.CreateLoan)
	r.PUT("/loans/:id", h.UpdateLoan)
	r.PATCH("/loans/:id/return", h.ReturnLoan)
	r.DELETE("/loans/:id", h.DeleteLoan)

	// Searches
	r.GET("/search", h.Search)
	r.GET("/borrows", h.GetLoansWithPerson)
	r.GET("/borrows_count", h.BorrowCounter)

	// Slack Events endpoint
	r.POST("/slack/events", h.Events)
	r.POST("/slack/interactivity", h.Interactivity)
	r.POST("/slack/borrow", h.BorrowHandler)

	// Event endpoints
	r.GET("/events", h.GetAllEvents)
	r.POST("/events", h.CreateEvent)
	r.GET("/events/:id", h.GetEventByID)
	r.PUT("/events/:id", h.UpdateEvent)
	r.DELETE("/events/:id", h.DeleteEvent)

	// Event helpers endpoints
	r.GET("/events/:id/helpers", h.GetEventHelpers)
	r.POST("/events/:id/helpers", h.AddEventHelper)
	r.DELETE("/events/:id/helpers/:person_id", h.RemoveEventHelper)

	// Event loans endpoints
	r.GET("/events/:id/loans/active", h.GetActiveEventLoans)
	r.POST("/events/:id/loans/return-all", h.ReturnAllEventLoans)
	r.GET("/events/:id/loans", h.GetEventLoans)
	r.POST("/events/:id/loans", h.CreateEventLoan)
	r.POST("/events/:id/loans/:loan_id/return", h.ReturnEventLoan)

	// Person event loans endpoint
	r.GET("/persons/:id/event-loans", h.GetEventLoansByPerson)

	r.POST("/bulkadd", h.BulkAdd)
	r.POST("/bulkborrow", h.BulkBorrow)
	r.POST("/bulksearch", h.BulkSearch)
}
