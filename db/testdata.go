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

	// ETH Zürich shelves - Main storage at CAB (Zentrum)
	// Define shelves with IDs
	shelves := []Shelf{
		{ID: "SHELF1", Name: "Electronics Lab Storage", Building: "CAB", Room: "H53"},
		{ID: "SHELF2", Name: "Workshop Tools", Building: "ETZ", Room: "J91"},
		{ID: "SHELF3", Name: "Robotics Components", Building: "HCI", Room: "J4"},
	}

	// Define shelf units for each shelf
	shelfUnits := []struct {
		ShelfIndex int
		Units      []ShelfUnit
	}{
		// CAB H53 - Electronics Lab Storage (2 columns)
		{
			ShelfIndex: 0,
			Units: []ShelfUnit{
				{ID: "A1H2E", ColumnID: "COL01", Type: "high"},
				{ID: "A2S1X", ColumnID: "COL01", Type: "slim"},
				{ID: "B1H3K", ColumnID: "COL02", Type: "high"},
			},
		},
		// ETZ J91 - Workshop Tools (2 columns)
		{
			ShelfIndex: 1,
			Units: []ShelfUnit{
				{ID: "C1H2P", ColumnID: "COL03", Type: "high"},
				{ID: "D1S2M", ColumnID: "COL04", Type: "slim"},
			},
		},
		// HCI J4 - Robotics Components (1 column)
		{
			ShelfIndex: 2,
			Units: []ShelfUnit{
				{ID: "E1H1R", ColumnID: "COL05", Type: "high"},
				{ID: "E2H2T", ColumnID: "COL05", Type: "high"},
			},
		},
	}

	var locations []Location

	// Realistic items for engineering/CS students
	items := []Item{
		// Electronics
		{Name: "Arduino Uno R3", Category: "Electronics"},
		{Name: "Raspberry Pi 4 (4GB)", Category: "Electronics"},
		{Name: "ESP32 Development Board", Category: "Electronics"},
		{Name: "Breadboard (830 points)", Category: "Electronics"},
		{Name: "Multimeter", Category: "Electronics"},
		{Name: "Oscilloscope Rigol DS1054Z", Category: "Electronics"},
		{Name: "Function Generator", Category: "Electronics"},
		{Name: "Soldering Station", Category: "Electronics"},
		{Name: "Logic Analyzer", Category: "Electronics"},
		{Name: "Power Supply (0-30V)", Category: "Electronics"},

		// Components (Consumables)
		{Name: "Resistor Kit (E12 series)", Category: "Consumables"},
		{Name: "Capacitor Kit", Category: "Consumables"},
		{Name: "LED Kit (5mm, assorted)", Category: "Consumables"},
		{Name: "Jumper Wires (M-M)", Category: "Consumables"},
		{Name: "Jumper Wires (M-F)", Category: "Consumables"},
		{Name: "Transistor Kit (NPN/PNP)", Category: "Consumables"},
		{Name: "IC Kit (555, OpAmps)", Category: "Consumables"},
		{Name: "Solder Wire (lead-free)", Category: "Consumables"},
		{Name: "Heat Shrink Tubing Kit", Category: "Consumables"},
		{Name: "PCB Prototyping Boards", Category: "Consumables"},

		// Tools
		{Name: "Screwdriver Set (Precision)", Category: "Tools"},
		{Name: "Wire Stripper", Category: "Tools"},
		{Name: "Pliers Set", Category: "Tools"},
		{Name: "Desoldering Pump", Category: "Tools"},
		{Name: "Tweezers (ESD Safe)", Category: "Tools"},
		{Name: "Cutting Mat A3", Category: "Tools"},
		{Name: "Caliper (Digital)", Category: "Tools"},
		{Name: "Hot Glue Gun", Category: "Tools"},
		{Name: "Drill Set", Category: "Tools"},

		// Mechanical/Robotics
		{Name: "Servo Motor SG90", Category: "Mechanics"},
		{Name: "Stepper Motor NEMA17", Category: "Mechanics"},
		{Name: "DC Motor with Gearbox", Category: "Mechanics"},
		{Name: "Motor Driver L298N", Category: "Mechanics"},
		{Name: "3D Printer Filament PLA", Category: "Mechanics"},
		{Name: "Laser Cut Acrylic Sheets", Category: "Mechanics"},

		// Sensors
		{Name: "Ultrasonic Sensor HC-SR04", Category: "Sensors"},
		{Name: "Temperature Sensor DHT22", Category: "Sensors"},
		{Name: "IMU MPU6050", Category: "Sensors"},
		{Name: "GPS Module", Category: "Sensors"},
		{Name: "Camera Module OV7670", Category: "Sensors"},

		// Misc
		{Name: "USB Cable Micro-B (1m)", Category: "Cables"},
		{Name: "USB Cable Type-C (1m)", Category: "Cables"},
		{Name: "HDMI Cable (2m)", Category: "Cables"},
		{Name: "Ethernet Cable Cat6 (5m)", Category: "Cables"},
		{Name: "Laptop (Loaner Lenovo)", Category: "Equipment"},
		{Name: "FPGA Board (Xilinx)", Category: "Equipment"},
		{Name: "VR Headset Meta Quest 2", Category: "Equipment"},
	}

	// ETH Zürich students and staff
	persons := []Person{
		{Firstname: "Max", Lastname: "Müller", SlackID: "U01ABC123"},
		{Firstname: "Anna", Lastname: "Schmidt", SlackID: "U02DEF456"},
		{Firstname: "Lukas", Lastname: "Fischer", SlackID: "U03GHI789"},
		{Firstname: "Sarah", Lastname: "Weber", SlackID: "U04JKL012"},
		{Firstname: "Jonas", Lastname: "Meyer", SlackID: "U05MNO345"},
		{Firstname: "Laura", Lastname: "Schneider", SlackID: "U06PQR678"},
		{Firstname: "David", Lastname: "Wagner", SlackID: "U07STU901"},
		{Firstname: "Julia", Lastname: "Becker", SlackID: "U08VWX234"},
		{Firstname: "Felix", Lastname: "Hoffmann", SlackID: "U09YZA567"},
		{Firstname: "Sophie", Lastname: "Koch", SlackID: "U10BCD890"},
	}

	// Begin transaction
	tx, err := db.BeginContext(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Close()

	// Insert Shelves
	for i := range shelves {
		exists, err := tx.Model(&Shelf{}).
			Where("id = ?", shelves[i].ID).
			Exists()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to check shelf existence: %w", err)
		}
		if exists {
			err = tx.Model(&shelves[i]).
				Where("id = ?", shelves[i].ID).
				Select()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to fetch existing shelf: %w", err)
			}
			log.Printf("Shelf already exists: %s in %s %s (ID: %s)", shelves[i].Name, shelves[i].Building, shelves[i].Room, shelves[i].ID)
			continue
		}

		_, err = tx.Model(&shelves[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert shelf: %w", err)
		}
		log.Printf("Inserted shelf: %s in %s %s (ID: %s)", shelves[i].Name, shelves[i].Building, shelves[i].Room, shelves[i].ID)
	}

	// Insert Columns and Shelf Units and Locations
	// First, collect unique column IDs and create Column records
	columnMap := make(map[string]string) // columnID -> shelfID
	for _, shelfUnitGroup := range shelfUnits {
		shelfID := shelves[shelfUnitGroup.ShelfIndex].ID
		for _, unit := range shelfUnitGroup.Units {
			columnMap[unit.ColumnID] = shelfID
		}
	}

	// Create Column records
	for columnID, shelfID := range columnMap {
		exists, err := tx.Model(&Column{}).Where("id = ?", columnID).Exists()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to check column existence: %w", err)
		}
		if !exists {
			col := &Column{
				ID:      columnID,
				ShelfID: shelfID,
			}
			_, err = tx.Model(col).Insert()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to insert column: %w", err)
			}
			log.Printf("Inserted column: %s (Shelf: %s)", columnID, shelfID)
		} else {
			log.Printf("Column already exists: %s (skipping)", columnID)
		}
	}

	// Now insert shelf units
	for _, shelfUnitGroup := range shelfUnits {
		for _, unit := range shelfUnitGroup.Units {
			// Check if shelf unit exists
			exists, err := tx.Model(&ShelfUnit{}).Where("id = ?", unit.ID).Exists()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to check shelf unit existence: %w", err)
			}
			if exists {
				log.Printf("Shelf unit already exists: %s (skipping)", unit.ID)
				// Fetch existing location for this shelf unit
				var existingLocation Location
				err = tx.Model(&existingLocation).Where("shelf_unit_id = ?", unit.ID).Select()
				if err != nil {
					tx.Rollback()
					return fmt.Errorf("failed to fetch existing location for shelf unit %s: %w", unit.ID, err)
				}
				locations = append(locations, existingLocation)
				continue
			}

			// Insert shelf unit
			_, err = tx.Model(&unit).Insert()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to insert shelf unit: %w", err)
			}
			log.Printf("Inserted shelf unit: %s (Type: %s, Column: %s)", unit.ID, unit.Type, unit.ColumnID)

			// Create corresponding Location
			location := Location{ShelfUnitID: unit.ID}
			_, err = tx.Model(&location).Insert()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to insert location for shelf unit %s: %w", unit.ID, err)
			}
			locations = append(locations, location)
			log.Printf("Created location for shelf unit %s (Location ID: %d)", unit.ID, location.ID)
		}
	}

	// Insert Items (only if they don't exist)
	for i := range items {
		exists, err := tx.Model(&Item{}).Where("name = ?", items[i].Name).Exists()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to check item existence: %w", err)
		}
		if exists {
			err = tx.Model(&items[i]).Where("name = ?", items[i].Name).Select()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to fetch existing item: %w", err)
			}
			log.Printf("Item already exists: %s (ID: %d)", items[i].Name, items[i].ID)
			continue
		}

		_, err = tx.Model(&items[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert item: %w", err)
		}
		log.Printf("Inserted item: %s (ID: %d)", items[i].Name, items[i].ID)
	}

	// Insert Persons (only if they don't exist)
	for i := range persons {
		exists, err := tx.Model(&Person{}).
			Where("firstname = ? AND lastname = ?", persons[i].Firstname, persons[i].Lastname).
			Exists()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to check person existence: %w", err)
		}
		if exists {
			err = tx.Model(&persons[i]).
				Where("firstname = ? AND lastname = ?", persons[i].Firstname, persons[i].Lastname).
				Select()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to fetch existing person: %w", err)
			}
			log.Printf("Person already exists: %s %s (ID: %d)", persons[i].Firstname, persons[i].Lastname, persons[i].ID)
			continue
		}

		_, err = tx.Model(&persons[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert person: %w", err)
		}
		log.Printf("Inserted person: %s %s (ID: %d)", persons[i].Firstname, persons[i].Lastname, persons[i].ID)
	}

	// Insert Inventory relations - distribute items across storage locations
	isInRecords := []Inventory{
		// CAB H53 Shelf A Unit 1 (A1H2E) - Microcontrollers & Development Boards
		{LocationId: locations[0].ID, ItemId: items[0].ID, Amount: 15, Note: "Arduino Uno stock for student projects"},
		{LocationId: locations[0].ID, ItemId: items[1].ID, Amount: 8, Note: "Raspberry Pi inventory"},
		{LocationId: locations[0].ID, ItemId: items[2].ID, Amount: 12, Note: "ESP32 boards for IoT projects"},

		// CAB H53 Shelf A Unit 2 (A2S1X) - Measurement Equipment
		{LocationId: locations[1].ID, ItemId: items[4].ID, Amount: 5, Note: "Handheld multimeters"},
		{LocationId: locations[1].ID, ItemId: items[5].ID, Amount: 2, Note: "Oscilloscopes for lab use"},
		{LocationId: locations[1].ID, ItemId: items[6].ID, Amount: 1, Note: "Function generator"},
		{LocationId: locations[1].ID, ItemId: items[8].ID, Amount: 3, Note: "Logic analyzers"},

		// CAB H53 Shelf B Unit 1 (B1H3K) - Consumables
		{LocationId: locations[2].ID, ItemId: items[10].ID, Amount: 50, Note: "Resistor kits - bulk stock"},
		{LocationId: locations[2].ID, ItemId: items[11].ID, Amount: 30, Note: "Capacitor kits"},
		{LocationId: locations[2].ID, ItemId: items[12].ID, Amount: 100, Note: "LED assortment"},
		{LocationId: locations[2].ID, ItemId: items[13].ID, Amount: 200, Note: "Male-male jumper wires"},
		{LocationId: locations[2].ID, ItemId: items[14].ID, Amount: 150, Note: "Male-female jumper wires"},
		{LocationId: locations[2].ID, ItemId: items[3].ID, Amount: 25, Note: "Breadboards for prototyping"},
		{LocationId: locations[2].ID, ItemId: items[17].ID, Amount: 10, Note: "Solder wire rolls"},

		// ETZ J91 Unit 1 (C1H2P) - Tools
		{LocationId: locations[3].ID, ItemId: items[20].ID, Amount: 8, Note: "Precision screwdriver sets"},
		{LocationId: locations[3].ID, ItemId: items[21].ID, Amount: 6, Note: "Wire strippers"},
		{LocationId: locations[3].ID, ItemId: items[22].ID, Amount: 5, Note: "Pliers sets"},
		{LocationId: locations[3].ID, ItemId: items[7].ID, Amount: 3, Note: "Soldering stations"},
		{LocationId: locations[3].ID, ItemId: items[26].ID, Amount: 4, Note: "Digital calipers"},

		// ETZ J91 Unit 2 (D1S2M) - More Tools
		{LocationId: locations[4].ID, ItemId: items[23].ID, Amount: 4, Note: "Desoldering pumps"},
		{LocationId: locations[4].ID, ItemId: items[24].ID, Amount: 6, Note: "ESD safe tweezers"},
		{LocationId: locations[4].ID, ItemId: items[27].ID, Amount: 3, Note: "Hot glue guns"},

		// HCI J4 Unit 1 (E1H1R) - Robotics/Mechanics
		{LocationId: locations[5].ID, ItemId: items[29].ID, Amount: 30, Note: "SG90 servo motors"},
		{LocationId: locations[5].ID, ItemId: items[30].ID, Amount: 10, Note: "NEMA17 steppers"},
		{LocationId: locations[5].ID, ItemId: items[31].ID, Amount: 15, Note: "DC geared motors"},
		{LocationId: locations[5].ID, ItemId: items[32].ID, Amount: 12, Note: "L298N motor drivers"},

		// HCI J4 Unit 2 (E2H2T) - Sensors & Special Equipment
		{LocationId: locations[6].ID, ItemId: items[36].ID, Amount: 20, Note: "Ultrasonic sensors"},
		{LocationId: locations[6].ID, ItemId: items[37].ID, Amount: 15, Note: "DHT22 temp sensors"},
		{LocationId: locations[6].ID, ItemId: items[38].ID, Amount: 10, Note: "IMU modules"},
		{LocationId: locations[6].ID, ItemId: items[45].ID, Amount: 3, Note: "Loaner laptops for students"},
		{LocationId: locations[6].ID, ItemId: items[46].ID, Amount: 2, Note: "FPGA boards"},
	}

	log.Printf("Inserting inventory records...")

	for i := range isInRecords {
		// Check if inventory record exists
		exists, err := tx.Model(&Inventory{}).
			Where("location_id = ? AND item_id = ?", isInRecords[i].LocationId, isInRecords[i].ItemId).
			Exists()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to check inventory existence: %w", err)
		}
		if exists {
			log.Printf("Inventory record already exists for location %d, item %d - skipping", isInRecords[i].LocationId, isInRecords[i].ItemId)
			continue
		}

		_, err = tx.Model(&isInRecords[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert Inventory: %w", err)
		}
		log.Printf("Inserted inventory: %s (ID: %d)", isInRecords[i].Note, isInRecords[i].ID)
	}

	// Insert sample loans - mix of active, returned, and overdue
	now := time.Now()
	returnedTime1 := now.AddDate(0, 0, -2)  // Returned 2 days ago
	returnedTime2 := now.AddDate(0, -1, 5)  // Returned 1 month ago, 5 days later
	returnedTime3 := now.AddDate(0, -2, 0)  // Returned 2 months ago
	returnedTime4 := now.AddDate(0, 0, -14) // Returned 14 days ago
	returnedTime5 := now.AddDate(0, 0, -30) // Returned 30 days ago

	loans := []Loans{
		// Active loans (not returned)
		{
			PersonID: persons[0].ID, // Max Müller
			ItemID:   items[0].ID,   // Arduino Uno
			Amount:   2,
			Begin:    now.AddDate(0, 0, -7),
			Until:    now.AddDate(0, 0, 7), // Due in 1 week
			Returned: false,
		},
		{
			PersonID: persons[1].ID, // Anna Schmidt
			ItemID:   items[5].ID,   // Oscilloscope
			Amount:   1,
			Begin:    now.AddDate(0, 0, -3),
			Until:    now.AddDate(0, 0, 11), // Due in 2 weeks
			Returned: false,
		},
		{
			PersonID: persons[2].ID, // Lukas Fischer
			ItemID:   items[4].ID,   // Multimeter
			Amount:   1,
			Begin:    now.AddDate(0, 0, -10),
			Until:    now.AddDate(0, 0, -3), // OVERDUE by 3 days!
			Returned: false,
		},
		{
			PersonID: persons[3].ID, // Sarah Weber
			ItemID:   items[1].ID,   // Raspberry Pi
			Amount:   1,
			Begin:    now.AddDate(0, 0, -5),
			Until:    now.AddDate(0, 0, 9), // Due in 9 days
			Returned: false,
		},
		{
			PersonID: persons[4].ID, // Jonas Meyer
			ItemID:   items[45].ID,  // Loaner Laptop
			Amount:   1,
			Begin:    now.AddDate(0, 0, -14),
			Until:    now.AddDate(0, 0, -1), // OVERDUE by 1 day!
			Returned: false,
		},

		// Returned loans - good history
		{
			PersonID:   persons[0].ID, // Max Müller (has active + history)
			ItemID:     items[4].ID,   // Multimeter
			Amount:     1,
			Begin:      now.AddDate(0, 0, -30),
			Until:      now.AddDate(0, 0, -16),
			Returned:   true,
			ReturnedAt: &returnedTime1, // Returned on time
		},
		{
			PersonID:   persons[0].ID, // Max Müller (frequent borrower)
			ItemID:     items[7].ID,   // Soldering Station
			Amount:     1,
			Begin:      now.AddDate(0, -2, -10),
			Until:      now.AddDate(0, -2, 4),
			Returned:   true,
			ReturnedAt: &returnedTime3, // Returned on time 2 months ago
		},
		{
			PersonID:   persons[1].ID, // Anna Schmidt
			ItemID:     items[1].ID,   // Raspberry Pi
			Amount:     2,
			Begin:      now.AddDate(0, -1, -5),
			Until:      now.AddDate(0, -1, 9),
			Returned:   true,
			ReturnedAt: &returnedTime2, // Returned on time
		},
		{
			PersonID:   persons[2].ID, // Lukas Fischer (currently has overdue)
			ItemID:     items[2].ID,   // ESP32 board
			Amount:     3,
			Begin:      now.AddDate(0, 0, -45),
			Until:      now.AddDate(0, 0, -31),
			Returned:   true,
			ReturnedAt: &returnedTime5, // Returned on time
		},
		{
			PersonID:   persons[5].ID, // Laura Schneider
			ItemID:     items[30].ID,  // Stepper Motor
			Amount:     5,
			Begin:      now.AddDate(0, 0, -20),
			Until:      now.AddDate(0, 0, -6),
			Returned:   true,
			ReturnedAt: &returnedTime4, // Returned on time
		},
		{
			PersonID:   persons[6].ID, // David Wagner
			ItemID:     items[46].ID,  // FPGA Board
			Amount:     1,
			Begin:      now.AddDate(0, -1, -10),
			Until:      now.AddDate(0, -1, 4),
			Returned:   true,
			ReturnedAt: &returnedTime2, // Returned on time
		},
		{
			PersonID:   persons[7].ID, // Julia Becker
			ItemID:     items[8].ID,   // Logic Analyzer
			Amount:     1,
			Begin:      now.AddDate(0, 0, -40),
			Until:      now.AddDate(0, 0, -26),
			Returned:   true,
			ReturnedAt: &returnedTime5, // Returned on time
		},

		// Returned loans - some were late
		{
			PersonID:   persons[3].ID, // Sarah Weber
			ItemID:     items[0].ID,   // Arduino Uno
			Amount:     3,
			Begin:      now.AddDate(0, 0, -25),
			Until:      now.AddDate(0, 0, -11),
			Returned:   true,
			ReturnedAt: &returnedTime1, // Returned LATE (was due 11 days ago, returned 2 days ago)
		},
		{
			PersonID:   persons[4].ID, // Jonas Meyer
			ItemID:     items[36].ID,  // Ultrasonic Sensor
			Amount:     10,
			Begin:      now.AddDate(0, 0, -50),
			Until:      now.AddDate(0, 0, -36),
			Returned:   true,
			ReturnedAt: &returnedTime4, // Returned LATE (was due 36 days ago, returned 14 days ago)
		},

		// More history for popular items
		{
			PersonID:   persons[8].ID, // Felix Hoffmann
			ItemID:     items[0].ID,   // Arduino Uno (popular item with history)
			Amount:     1,
			Begin:      now.AddDate(0, -2, -5),
			Until:      now.AddDate(0, -2, 9),
			Returned:   true,
			ReturnedAt: &returnedTime3,
		},
		{
			PersonID:   persons[9].ID, // Sophie Koch
			ItemID:     items[0].ID,   // Arduino Uno
			Amount:     2,
			Begin:      now.AddDate(0, -1, -7),
			Until:      now.AddDate(0, -1, 7),
			Returned:   true,
			ReturnedAt: &returnedTime2,
		},
	}

	for i := range loans {
		// Check if loan exists
		exists, err := tx.Model(&Loans{}).
			Where("person_id = ? AND item_id = ? AND begin = ?",
				loans[i].PersonID, loans[i].ItemID, loans[i].Begin).
			Exists()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to check loan existence: %w", err)
		}
		if exists {
			log.Printf("Loan already exists for person %d, item %d - skipping", loans[i].PersonID, loans[i].ItemID)
			continue
		}

		_, err = tx.Model(&loans[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert loan: %w", err)
		}
		log.Printf("Inserted loan: Person %d borrowed %d item(s) from inventory %d (Loan ID: %d)", loans[i].PersonID, loans[i].Amount, loans[i].ItemID, loans[i].ID)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Println("✅ ETH Zürich test data loaded successfully.")
	log.Printf("   🏗️  Shelves: %d", len(shelves))

	// Count total shelf units
	totalUnits := 0
	for _, group := range shelfUnits {
		totalUnits += len(group.Units)
	}
	log.Printf("   📦 Shelf Units: %d", totalUnits)
	log.Printf("   📍 Locations: %d", len(locations))
	log.Printf("   🔧 Items: %d", len(items))
	log.Printf("   👥 Persons: %d", len(persons))
	log.Printf("   📊 Inventory records: %d", len(isInRecords))
	log.Printf("   📋 Loans: %d (5 active, 11 returned - includes 2 overdue active, 2 late returns)", len(loans))
	return nil
}
