package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

func NewDBConn() (con *pg.DB, err error) {
	fmt.Println("Initialising DB")
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "example")
	database := getEnv("DB_NAME", "appdb")

	address := fmt.Sprintf("%s:%s", host, port)
	options := &pg.Options{
		User:     user,
		Password: password,
		Addr:     address,
		Database: database,
		PoolSize: 50,
	}
	fmt.Println("Connecting to database...")
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
	dbConn, err := NewDBConn()
	if err != nil {
		log.Fatal(err)
	}

	defer func(dbConn *pg.DB) {
		err := dbConn.Close()
		if err != nil {
		}
	}(dbConn)

	// Create tables
	models := []interface{}{
		(*Location)(nil),
		(*Item)(nil),
		(*IsIn)(nil),
		(*Person)(nil),
		(*Loans)(nil),
	}

	for _, model := range models {
		err := dbConn.Model(model).CreateTable(&orm.CreateTableOptions{
			IfNotExists: true,
		})
		if err != nil {
			log.Fatalf("Error creating table for %T: %v", model, err)
		}
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func Close(con *pg.DB) {
	if con != nil {
		err := con.Close()
		if err != nil {
			return
		}
	}
}
