package main

import (
	"log"

	"lagertool.com/main/api"
	"lagertool.com/main/db"
	_ "lagertool.com/main/docs"
	"lagertool.com/main/util"
)

// @title Lagertool Inventory API
// @version 1.0
// @description Backend API for inventory management system tracking items, locations, and loans
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@lagertool.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8000
// @BasePath /
// @schemes http

func main() {
	db, _ := db.NewDBConn()
	handler := api.NewHandler(db)
	ti, _ := handler.LocalGetAllItems()
	sa := util.FindItemSearchTermsInDB(ti, "Beer")
	for _, s := range sa {
		i, _ := handler.LocalSearchItems(s)
		for _, v := range i {
			log.Println("%d : %s", v.ID, v.Name)
		}

	}
}
