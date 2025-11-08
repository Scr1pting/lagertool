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

func ffInitDB(con *pg.DB) {
	models := []interface{}{
		(*Organisation)(nil),
		(*User)(nil),
		(*Session)(nil),
		(*HasSpecialRightsFor)(nil),
		(*Building)(nil),
		(*Room)(nil),
		(*Shelf)(nil),
		(*Column)(nil),
		(*ShelfUnit)(nil),
		(*Item)(nil),
		(*Inventory)(nil),
		(*ShoppingCart)(nil),
		(*Request)(nil),
		(*RequestItems)(nil),
		(*RequestReview)(nil),
		(*Loans)(nil),
		(*Consumed)(nil),
	}

	log.Println("🚀 Initializing database tables...")

	for _, model := range models {
		err := con.Model(model).CreateTable(&orm.CreateTableOptions{
			IfNotExists:   true,
			FKConstraints: true,
		})
		if err != nil {
			log.Fatalf("❌ Error creating table for %T: %v", model, err)
		} else {
			log.Printf("✅ Created/verified table for %T", model)
		}
	}

	log.Println("✅ Database tables initialized and migrations completed successfully.")
}

func Close(con *pg.DB) {
	if con != nil {
		err := con.Close()
		if err != nil {
			return
		}
	}
}
