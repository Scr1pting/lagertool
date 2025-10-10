package db

import (
	"context"
	"fmt"
	"log"

	"github.com/go-pg/pg/v10"
)

const (
	host     = "localhost"
	port     = 5432
	user     = "postgres"
	password = "your-password"
	dbname   = "calhounio_demo"
)

func NewDBConn() (con *pg.DB, err error) {
	address := fmt.Sprintf("%s:%s", "localhost", "5432")
	options := &pg.Options{
		User:     "postgres",
		Password: "12345678",
		Addr:     address,
		Database: "postgres",
		PoolSize: 50,
	}
	con = pg.Connect(options)

	// Test connection to Postgres
	ctx := context.Background()
	if err := con.Ping(ctx); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
		return nil, err
	}
	fmt.Println("Connected to PostgreSQL database.")
	return con, nil
}

func InitDB(con *pg.DB) {
}

func Close(con *pg.DB) {
	if con != nil {
		con.Close()
	}
}
