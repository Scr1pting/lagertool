package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/api"
	"lagertool.com/main/db"
)

func main() {
	router := gin.Default()
	dbConnection, err := db.NewDBConn()
	if err != nil {
		log.Fatal("DBConnection failed: ", err)
	}
	db.InitDB(dbConnection)
	api.SetupRoutes(router, dbConnection)
	log.Println("🚀 Server running on http://localhost:8000")
	err = router.Run(":8000")
	if err != nil {
		return
	}
}
