package db

import (
	"context"
	"fmt"
	"time"

	"github.com/go-pg/pg/v10"
)

func InsertBasicData(db *pg.DB) error {
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
		{Firstname: "Alice", Lastname: "Smith", EMail: "alice.smith@example.com", Telephone: "+1-555-1234"},
		{Firstname: "Bob", Lastname: "Johnson", EMail: "bob.johnson@example.com", Telephone: "+1-555-5678"},
	}

	// Begin transaction
	tx, err := db.BeginContext(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Close()

	// Insert Locations
	for _, loc := range locations {
		_, err := tx.Model(&loc).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert location: %w", err)
		}
	}

	// Insert Items
	for _, item := range items {
		_, err := tx.Model(&item).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert item: %w", err)
		}
	}

	// Insert Persons
	for _, person := range persons {
		_, err := tx.Model(&person).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert person: %w", err)
		}
	}

	// Example: insert a relation (IsIn)
	isIn := IsIn{
		LocationId: 1, // Assuming first location
		ItemId:     1, // Assuming first item
		Amount:     3,
		Note:       "Stored for lab experiments",
	}

	_, err = tx.Model(&isIn).Insert()
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to insert IsIn: %w", err)
	}

	// Example: insert a loan
	loan := Loans{
		PersonId: persons[0].ID,
		PermID:   1,
		Amount:   1,
		Begin:    time.Now(),
		Until:    time.Now().AddDate(0, 0, 14), // 2 weeks
	}

	_, err = tx.Model(&loan).Insert()
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to insert loan: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	fmt.Println("✅ Basic data inserted successfully.")
	return nil
}
