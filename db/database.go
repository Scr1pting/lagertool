package db

import (
	"context"
	"fmt"
	"log"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	"lagertool.com/main/config"
)

func NewDBConn(cfg *config.Config) (con *pg.DB, err error) {
	fmt.Println("Initialising DB")
	address := fmt.Sprintf("%s:%s", cfg.DB.Host, cfg.DB.Port)
	options := &pg.Options{
		User:     cfg.DB.User,
		Password: cfg.DB.Password,
		Addr:     address,
		Database: cfg.DB.Name,
		PoolSize: 50,
	}
	fmt.Println("Connecting to database...")
	fmt.Printf("%s:%s\n", cfg.DB.Host, cfg.DB.Port)
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
	// Create tables using the provided connection
	models := []interface{}{
		(*Shelf)(nil),
		(*ShelfUnit)(nil),
		(*Location)(nil),
		(*Item)(nil),
		(*Inventory)(nil),
		(*Person)(nil),
		(*Loans)(nil),
		(*Event)(nil),
		(*EventHelper)(nil),
		(*EventLoan)(nil),
	}

	for _, model := range models {
		err := con.Model(model).CreateTable(&orm.CreateTableOptions{
			IfNotExists: true,
		})
		if err != nil {
			log.Fatalf("Error creating table for %T: %v", model, err)
		}
	}

	// Run migrations
	runMigrations(con)

	log.Println("✅ Database tables initialized successfully.")
}

func runMigrations(con *pg.DB) {
	// Add returned column to loans table
	_, err := con.Exec("ALTER TABLE loans ADD COLUMN IF NOT EXISTS returned BOOLEAN DEFAULT false")
	if err != nil {
		log.Printf("Warning: Failed to add 'returned' column: %v", err)
	}

	// Add returned_at column to loans table
	_, err = con.Exec("ALTER TABLE loans ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP")
	if err != nil {
		log.Printf("Warning: Failed to add 'returned_at' column: %v", err)
	}

	// Migrate location table to new schema
	// Drop old columns that are no longer needed
	_, err = con.Exec("ALTER TABLE location DROP COLUMN IF EXISTS campus")
	if err != nil {
		log.Printf("Warning: Failed to drop 'campus' column: %v", err)
	}
	_, err = con.Exec("ALTER TABLE location DROP COLUMN IF EXISTS building")
	if err != nil {
		log.Printf("Warning: Failed to drop 'building' column: %v", err)
	}
	_, err = con.Exec("ALTER TABLE location DROP COLUMN IF EXISTS room")
	if err != nil {
		log.Printf("Warning: Failed to drop 'room' column: %v", err)
	}
	_, err = con.Exec("ALTER TABLE location DROP COLUMN IF EXISTS shelf")
	if err != nil {
		log.Printf("Warning: Failed to drop 'shelf' column: %v", err)
	}
	_, err = con.Exec("ALTER TABLE location DROP COLUMN IF EXISTS shelfunit")
	if err != nil {
		log.Printf("Warning: Failed to drop 'shelfunit' column: %v", err)
	}

	// Add new shelf_unit_id column
	_, err = con.Exec("ALTER TABLE location ADD COLUMN IF NOT EXISTS shelf_unit_id TEXT")
	if err != nil {
		log.Printf("Warning: Failed to add 'shelf_unit_id' column: %v", err)
	}
}

func Close(con *pg.DB) {
	if con != nil {
		err := con.Close()
		if err != nil {
			return
		}
	}
}
