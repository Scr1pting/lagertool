package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/go-pg/pg/v10"
)

func InsertBasicData(db *pg.DB) error {
	log.Println("Loading testdata...")
	ctx := context.Background()

	// Sample locations
	locations := []Location{
		{Campus: "Main Campus", Building: "Science Hall", Room: "101", Shelf: "A", ShelfUnit: "1"},
		{Campus: "North Campus", Building: "Engineering", Room: "202", Shelf: "B", ShelfUnit: "3"},
	}

	// Sample items
	items := []Item{
		{Name: "Oscilloscope", Category: "Electronics"},
		{Name: "Screwdriver", Category: "Tools"},
		{Name: "Resistor Pack", Category: "Consumables"},
	}

	// Sample persons
	persons := []Person{
		{Firstname: "Alice", Lastname: "Smith", SlackID: "your momma so fat"},
		{Firstname: "Bob", Lastname: "Johnson", SlackID: "09KUJW7VQW/C09L080PM9A"},
	}

	// Begin transaction
	tx, err := db.BeginContext(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Close()

	// Insert Locations
	for i := range locations {
		_, err := tx.Model(&locations[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert location => %d: %w", locations[i].ID, err)
		}
		log.Printf("Inserted location: %s %s %s (ID: %d)", locations[i].Campus, locations[i].Building, locations[i].Room, locations[i].ID)
	}

	// Insert Items
	for i := range items {
		_, err := tx.Model(&items[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert item: %w", err)
		}
		log.Printf("Inserted item: %s (ID: %d)", items[i].Name, items[i].ID)
	}

	// Insert Persons
	for i := range persons {
		_, err := tx.Model(&persons[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert person: %w", err)
		}
		log.Printf("Inserted person: %s %s (ID: %d)", persons[i].Firstname, persons[i].Lastname, persons[i].ID)
	}

	// Insert Inventory relations (inventory records) - use actual IDs from inserted records
	isInRecords := []Inventory{
		{
			LocationId: locations[0].ID, // Science Hall 101
			ItemId:     items[0].ID,     // Oscilloscope
			Amount:     3,
			Note:       "Stored for lab experiments",
		},
		{
			LocationId: locations[0].ID, // Science Hall 101
			ItemId:     items[2].ID,     // Resistor Pack
			Amount:     50,
			Note:       "Bulk storage - consumables",
		},
		{
			LocationId: locations[1].ID, // Engineering 202
			ItemId:     items[0].ID,     // Oscilloscope
			Amount:     2,
			Note:       "For student projects",
		},
		{
			LocationId: locations[1].ID, // Engineering 202
			ItemId:     items[1].ID,     // Screwdriver
			Amount:     10,
			Note:       "General toolbox",
		},
		{
			LocationId: locations[1].ID, // Engineering 202
			ItemId:     items[2].ID,     // Resistor Pack
			Amount:     25,
			Note:       "Electronics workbench supply",
		},
	}

	log.Printf("Inserting inventory records...")

	for i := range isInRecords {
		_, err := tx.Model(&isInRecords[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert Inventory: %w", err)
		}
		log.Printf("Inserted inventory: %s (ID: %d)", isInRecords[i].Note, isInRecords[i].ID)
	}

	// Example: insert a loan
	loan := Loans{
		PersonID: persons[0].ID,
		ItemID:   isInRecords[0].ID, // Use actual inventory record ID instead of hard-coded 1
		Amount:   1,
		Begin:    time.Now(),
		Until:    time.Now().AddDate(0, 0, 14), // 2 weeks
	}

	_, err = tx.Model(&loan).Insert()
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to insert loan: %w", err)
	}
	log.Printf("Inserted loan: Person %d borrowed item from inventory %d (Loan ID: %d)", loan.PersonID, loan.ItemID, loan.ID)

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Println("✅ Basic data inserted successfully.")
	return nil
}
