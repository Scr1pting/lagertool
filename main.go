package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api"
	"lagertool.com/main/db"
)

func main() {
	dbConnection, err := db.NewDBConn()
	if err != nil {
		log.Fatal(err)
	}
	defer func(db *pg.DB) {
		err := db.Close()
		if err != nil {
			log.Fatal(err)
		}
	}(dbConnection)

	router := gin.Default()
	api.SetupRoutes(router, dbConnection)

	log.Println("🚀 Server running on http://localhost:8000")
	err = router.Run(":8000")
	if err != nil {
		return
	}
}
