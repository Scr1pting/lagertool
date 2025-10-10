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
	con, err := db.NewDBConn()
	if err != nil {
		log.Println("Fuck")
	}
	handler := api.NewHandler(con)
	log.Println("Creating objects.")
	strawberry := db.Item{Name: "Strawberry"}
	pear := db.Item{Name: "Pear"}
	bear := db.Item{Name: "Bear"}
	err1 := handler.LocalCreateItem(&strawberry)
	err2 := handler.LocalCreateItem(&bear)
	err3 := handler.LocalCreateItem(&pear)
	if err1 != nil && err2 != nil && err3 != nil {
		log.Println("ERROR when creating Item")
	}
	ti, _ := handler.LocalGetAllItems()
	for _, n := range ti {
		log.Println(n.Name)
	}
	sa := util.FindItemSearchTermsInDB(ti, "Strawberry")
	for _, s := range sa {
		i, _ := handler.LocalSearchItems(s)
		for _, v := range i {
			log.Println("%d : %s", v.ID, v.Name)
		}

	}
}
