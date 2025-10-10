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
	r.PUT("/locations/:id", h.UpdateLocation)
	r.DELETE("/locations/:id", h.DeleteLocation)

	// Item endpoints
	r.GET("/items", h.GetAllItems)
	r.GET("/items/search", h.SearchItems)
	r.GET("/items/:id", h.GetItemByID)
	r.POST("/items", h.CreateItem)
	r.PUT("/items/:id", h.UpdateItem)
	r.DELETE("/items/:id", h.DeleteItem)

	// Consumable endpoints
	r.GET("/consumables", h.GetAllConsumables)
	r.GET("/consumables/expired", h.GetExpiredConsumables)
	r.GET("/consumables/:id", h.GetConsumableByID)
	r.POST("/consumables", h.CreateConsumable)
	r.PUT("/consumables/:id", h.UpdateConsumable)
	r.DELETE("/consumables/:id", h.DeleteConsumable)

	// Permanent endpoints
	r.GET("/permanents", h.GetAllPermanents)
	r.GET("/permanents/:id", h.GetPermanentByID)
	r.POST("/permanents", h.CreatePermanent)
	r.PUT("/permanents/:id", h.UpdatePermanent)
	r.DELETE("/permanents/:id", h.DeletePermanent)

	// Inventory (IsIn) endpoints
	r.GET("/inventory", h.GetAllInventory)
	r.GET("/inventory/location/:location_id", h.GetInventoryByLocation)
	r.GET("/inventory/item/:item_id", h.GetInventoryByItem)
	r.GET("/inventory/:id", h.GetInventoryByID)
	r.POST("/inventory", h.CreateInventory)
	r.PUT("/inventory/:id", h.UpdateInventory)
	r.PATCH("/inventory/:id/amount", h.UpdateInventoryAmount)
	r.DELETE("/inventory/:id", h.DeleteInventory)

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
	r.GET("/loans/permanent/:perm_id", h.GetLoansByPermanent)
	r.GET("/loans/overdue", h.GetOverdueLoans)
	r.GET("/loans/:id", h.GetLoanByID)
	r.POST("/loans", h.CreateLoan)
	r.PUT("/loans/:id", h.UpdateLoan)
	r.DELETE("/loans/:id", h.DeleteLoan)
}
