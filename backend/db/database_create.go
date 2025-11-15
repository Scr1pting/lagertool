package db

import (
	"time"

	"github.com/go-pg/pg/v10"
)

func CreateBuilding(con *pg.DB, name string, campus string) (*Building, error) {
	building := &Building{
		Name:       name,
		Campus:     campus,
		UpdateDate: time.Now(),
	}

	_, err := con.Model(building).Insert()
	return building, err
}

func CreateRoom(con *pg.DB, name string, floor string, number string, buildingID int) (*Room, error) {
	room := &Room{
		Name:       name,
		Floor:      floor,
		Number:     number,
		BuildingID: buildingID,
		UpdateDate: time.Now(),
	}
	_, err := con.Model(room).Insert()
	return room, err
}
