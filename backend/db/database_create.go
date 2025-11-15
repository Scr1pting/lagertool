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

func CreateRoom(con *pg.DB, name string, floor string, number string, building string) (*Room, error) {
	buildingStruct := &Building{}
	err := con.Model(buildingStruct).Where("name = ?", building).Select()
	if err != nil {
		return nil, err
	}
	room := &Room{
		Name:       name,
		Floor:      floor,
		Number:     number,
		BuildingID: buildingStruct.ID,
		UpdateDate: time.Now(),
	}
	_, err = con.Model(&Room{}).Insert(room)
	return room, err
}
