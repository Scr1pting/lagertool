package db

import (
	"context"
	"fmt"
	"log"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	"lagertool.com/main/config"
	"lagertool.com/main/db_models"
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
	models := []interface{}{
		(*db_models.Organisation)(nil),
		(*db_models.User)(nil),
		(*db_models.Session)(nil),
		(*db_models.HasSpecialRightsFor)(nil),
		(*db_models.Building)(nil),
		(*db_models.Room)(nil),
		(*db_models.Shelf)(nil),
		(*db_models.Column)(nil),
		(*db_models.ShelfUnit)(nil),
		(*db_models.Item)(nil),
		(*db_models.Inventory)(nil),
		(*db_models.ShoppingCart)(nil),
		(*db_models.ShoppingCartItem)(nil),
		(*db_models.Request)(nil),
		(*db_models.RequestItems)(nil),
		(*db_models.RequestReview)(nil),
		(*db_models.Loans)(nil),
		(*db_models.Consumed)(nil),
		(*db_models.UserRequestMessage)(nil),
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

func InsertDummyData(con *pg.DB) {
	org, user, session, building, room, shelf, columns, units, item, inventory, shoppingCart, shoppingCartItems, request, requestItems, requestReview, loan, consumed := GetDummyData()

	log.Println("🚀 Inserting dummy data...")

	// 1️⃣ Insert parent tables first
	if _, err := con.Model(org).Insert(); err != nil {
		log.Fatalf("Insert Organisation failed: %v", err)
	}
	if _, err := con.Model(user).Insert(); err != nil {
		log.Fatalf("Insert User failed: %v", err)
	}
	if _, err := con.Model(session).Insert(); err != nil {
		log.Fatalf("Insert Session failed: %v", err)
	}
	if _, err := con.Model(building).Insert(); err != nil {
		log.Fatalf("Insert Building failed: %v", err)
	}
	if _, err := con.Model(room).Insert(); err != nil {
		log.Fatalf("Insert Room failed: %v", err)
	}
	if _, err := con.Model(shelf).Insert(); err != nil {
		log.Fatalf("Insert Shelf failed: %v", err)
	}

	// 2️⃣ Insert slices with pointers
	if _, err := con.Model(&columns).Insert(); err != nil {
		log.Fatalf("Insert Columns failed: %v", err)
	}
	if _, err := con.Model(&units).Insert(); err != nil {
		log.Fatalf("Insert ShelfUnits failed: %v", err)
	}

	// 3️⃣ Insert Item and Inventory
	if _, err := con.Model(item).Insert(); err != nil {
		log.Fatalf("Insert Item failed: %v", err)
	}
	if _, err := con.Model(inventory).Insert(); err != nil {
		log.Fatalf("Insert Inventory failed: %v", err)
	}

	// 4️⃣ Insert ShoppingCart and Items
	if _, err := con.Model(shoppingCart).Insert(); err != nil {
		log.Fatalf("Insert ShoppingCart failed: %v", err)
	}
	if _, err := con.Model(&shoppingCartItems).Insert(); err != nil {
		log.Fatalf("Insert ShoppingCartItems failed: %v", err)
	}

	// 5️⃣ Insert Request, RequestItems, RequestReview
	if _, err := con.Model(request).Insert(); err != nil {
		log.Fatalf("Insert Request failed: %v", err)
	}
	if _, err := con.Model(&requestItems).Insert(); err != nil {
		log.Fatalf("Insert RequestItems failed: %v", err)
	}
	if _, err := con.Model(requestReview).Insert(); err != nil {
		log.Fatalf("Insert RequestReview failed: %v", err)
	}

	// 6️⃣ Insert Loans and Consumed
	if _, err := con.Model(loan).Insert(); err != nil {
		log.Fatalf("Insert Loans failed: %v", err)
	}
	if _, err := con.Model(consumed).Insert(); err != nil {
		log.Fatalf("Insert Consumed failed: %v", err)
	}

	log.Println("✅ Dummy data inserted successfully")
}

func Close(con *pg.DB) {
	if con != nil {
		err := con.Close()
		if err != nil {
			return
		}
	}
}
