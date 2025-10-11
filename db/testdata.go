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

	// ETH Zürich locations - Main storage at CAB (Zentrum)
	locations := []Location{
		{Campus: "Zentrum", Building: "CAB", Room: "H53", Shelf: "A", ShelfUnit: "1"},
		{Campus: "Zentrum", Building: "CAB", Room: "H53", Shelf: "A", ShelfUnit: "2"},
		{Campus: "Zentrum", Building: "CAB", Room: "H53", Shelf: "B", ShelfUnit: "1"},
		{Campus: "Zentrum", Building: "ETZ", Room: "J91", Shelf: "Main", ShelfUnit: "1"},
		{Campus: "Hönggerberg", Building: "HCI", Room: "J4", Shelf: "Electronics", ShelfUnit: "1"},
		{Campus: "Hönggerberg", Building: "HPH", Room: "G2", Shelf: "Tools", ShelfUnit: "1"},
	}

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

	// Insert Locations (only if they don't exist)
	for i := range locations {
		// Check if location already exists
		exists, err := tx.Model(&Location{}).
			Where("campus = ? AND building = ? AND room = ? AND shelf = ? AND shelfunit = ?",
				locations[i].Campus, locations[i].Building, locations[i].Room,
				locations[i].Shelf, locations[i].ShelfUnit).
			Exists()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to check location existence: %w", err)
		}
		if exists {
			// If exists, fetch the ID
			err = tx.Model(&locations[i]).
				Where("campus = ? AND building = ? AND room = ? AND shelf = ? AND shelfunit = ?",
					locations[i].Campus, locations[i].Building, locations[i].Room,
					locations[i].Shelf, locations[i].ShelfUnit).
				Select()
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to fetch existing location: %w", err)
			}
			log.Printf("Location already exists: %s %s %s (ID: %d)", locations[i].Campus, locations[i].Building, locations[i].Room, locations[i].ID)
			continue
		}

		_, err = tx.Model(&locations[i]).Insert()
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert location: %w", err)
		}
		log.Printf("Inserted location: %s %s %s (ID: %d)", locations[i].Campus, locations[i].Building, locations[i].Room, locations[i].ID)
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

	// Insert Inventory relations - distribute items across CAB storage
	isInRecords := []Inventory{
		// CAB H53 Shelf A Unit 1 - Microcontrollers & Development Boards
		{LocationId: locations[0].ID, ItemId: items[0].ID, Amount: 15, Note: "Arduino Uno stock for student projects"},
		{LocationId: locations[0].ID, ItemId: items[1].ID, Amount: 8, Note: "Raspberry Pi inventory"},
		{LocationId: locations[0].ID, ItemId: items[2].ID, Amount: 12, Note: "ESP32 boards for IoT projects"},

		// CAB H53 Shelf A Unit 2 - Measurement Equipment
		{LocationId: locations[1].ID, ItemId: items[4].ID, Amount: 5, Note: "Handheld multimeters"},
		{LocationId: locations[1].ID, ItemId: items[5].ID, Amount: 2, Note: "Oscilloscopes for lab use"},
		{LocationId: locations[1].ID, ItemId: items[6].ID, Amount: 1, Note: "Function generator"},
		{LocationId: locations[1].ID, ItemId: items[8].ID, Amount: 3, Note: "Logic analyzers"},

		// CAB H53 Shelf B Unit 1 - Consumables
		{LocationId: locations[2].ID, ItemId: items[10].ID, Amount: 50, Note: "Resistor kits - bulk stock"},
		{LocationId: locations[2].ID, ItemId: items[11].ID, Amount: 30, Note: "Capacitor kits"},
		{LocationId: locations[2].ID, ItemId: items[12].ID, Amount: 100, Note: "LED assortment"},
		{LocationId: locations[2].ID, ItemId: items[13].ID, Amount: 200, Note: "Male-male jumper wires"},
		{LocationId: locations[2].ID, ItemId: items[14].ID, Amount: 150, Note: "Male-female jumper wires"},
		{LocationId: locations[2].ID, ItemId: items[3].ID, Amount: 25, Note: "Breadboards for prototyping"},
		{LocationId: locations[2].ID, ItemId: items[17].ID, Amount: 10, Note: "Solder wire rolls"},

		// ETZ J91 - Tools
		{LocationId: locations[3].ID, ItemId: items[20].ID, Amount: 8, Note: "Precision screwdriver sets"},
		{LocationId: locations[3].ID, ItemId: items[21].ID, Amount: 6, Note: "Wire strippers"},
		{LocationId: locations[3].ID, ItemId: items[22].ID, Amount: 5, Note: "Pliers sets"},
		{LocationId: locations[3].ID, ItemId: items[7].ID, Amount: 3, Note: "Soldering stations"},
		{LocationId: locations[3].ID, ItemId: items[26].ID, Amount: 4, Note: "Digital calipers"},

		// Hönggerberg HCI - Robotics/Mechanics
		{LocationId: locations[4].ID, ItemId: items[29].ID, Amount: 30, Note: "SG90 servo motors"},
		{LocationId: locations[4].ID, ItemId: items[30].ID, Amount: 10, Note: "NEMA17 steppers"},
		{LocationId: locations[4].ID, ItemId: items[31].ID, Amount: 15, Note: "DC geared motors"},
		{LocationId: locations[4].ID, ItemId: items[32].ID, Amount: 12, Note: "L298N motor drivers"},

		// Hönggerberg HPH - Sensors & Special Equipment
		{LocationId: locations[5].ID, ItemId: items[36].ID, Amount: 20, Note: "Ultrasonic sensors"},
		{LocationId: locations[5].ID, ItemId: items[37].ID, Amount: 15, Note: "DHT22 temp sensors"},
		{LocationId: locations[5].ID, ItemId: items[38].ID, Amount: 10, Note: "IMU modules"},
		{LocationId: locations[5].ID, ItemId: items[45].ID, Amount: 3, Note: "Loaner laptops for students"},
		{LocationId: locations[5].ID, ItemId: items[46].ID, Amount: 2, Note: "FPGA boards"},
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

	// Insert sample loans
	loans := []Loans{
		{
			PersonID: persons[0].ID,
			ItemID:   isInRecords[0].ID,
			Amount:   2,
			Begin:    time.Now().AddDate(0, 0, -7),
			Until:    time.Now().AddDate(0, 0, 7), // Due in 1 week
		},
		{
			PersonID: persons[1].ID,
			ItemID:   isInRecords[5].ID,
			Amount:   1,
			Begin:    time.Now().AddDate(0, 0, -3),
			Until:    time.Now().AddDate(0, 0, 11), // Due in 2 weeks
		},
		{
			PersonID: persons[2].ID,
			ItemID:   isInRecords[4].ID,
			Amount:   1,
			Begin:    time.Now().AddDate(0, 0, -10),
			Until:    time.Now().AddDate(0, 0, -3), // Overdue!
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
	return nil
}
