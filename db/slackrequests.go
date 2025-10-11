package db

import (
	"log"
	"strings"
	"time"

	"github.com/go-pg/pg/v10"
	"lagertool.com/main/config"
)

type Borrow struct {
	Item     string    `json:"item"`
	Amount   int       `json:"amount"`
	Location string    `json:"location"`
	DueDate  time.Time `json:"due_date"`
	UserID   string    `json:"userid"`
	UserName string    `json:"username"`
}

func SlackBorrow(cfg *config.Config, borrow Borrow) {
	db, err := NewDBConn(cfg)
	if err != nil {
		log.Println(err)
	}
	defer func(db *pg.DB) {
		err := db.Close()
		if err != nil {
			log.Println(err)
		}
	}(db)

	item := new(Item)
	err = db.Model(item).Where("name = ?", borrow.Item).Select()
	if err != nil {
		log.Printf("Item Error %e\n", err)
	}

	campus, building, room := strings.Split(borrow.Location, ";")[0], strings.Split(borrow.Location, ";")[1], strings.Split(borrow.Location, ";")[2]
	log.Println(campus, building, room)
	location := new(Location)
	err = db.Model(location).Where("campus = ?", campus).Where("building = ?", building).Where("room = ?", room).Select()
	if err != nil {
		log.Printf("Location Error %e", err)
	}

	firstname, lastname := "", ""
	if strings.Contains(borrow.UserName, ".") {
		firstname = strings.Split(borrow.UserName, ".")[0]
		lastname = strings.Split(borrow.UserName, ".")[1]
	} else {
		firstname = borrow.UserName
		lastname = ""
	}

	person := new(Person)
	err = db.Model(person).Where("firstname = ?", firstname).Where("lastname = ?", lastname).Select()
	if err != nil {
		log.Printf("Person Error %e", err)
		person = &Person{
			Firstname: firstname,
			Lastname:  lastname,
			SlackID:   borrow.UserID,
		}
		_, err2 := db.Model(person).Insert()
		if err2 != nil {
			log.Println(err2)
		}
	}

	l := Loans{
		PersonID: person.ID,
		ItemID:   item.ID,
		Amount:   borrow.Amount,
		Begin:    time.Now(),
		Until:    borrow.DueDate,
	}
	_, err = db.Model(l).Insert()
	if err != nil {
		log.Printf("Insert Error %e", err)
	}
	log.Println("Borrow: ", borrow.Item)
}
