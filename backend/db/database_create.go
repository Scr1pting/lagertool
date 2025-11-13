package db

import (
	"time"

	"github.com/go-pg/pg/v10"
)

func CreateBuilding(con *pg.DB, name string, campus string) error {
	building := &Building{
		Name:       name,
		Campus:     campus,
		UpdateDate: time.Now(),
	}

	_, err := con.Model(&Building{}).Insert(building)
	return err
}

func CreateRoom(con *pg.DB, name string, floor string, number string, building string) error {
	buildingStruct := &Building{}
	err := con.Model(buildingStruct).Where("name = ?", name).Select()
	if err != nil {
		return err
	}
	room := &Room{
		Name:       name,
		Floor:      floor,
		Number:     number,
		BuildingID: buildingStruct.ID,
		UpdateDate: time.Now(),
	}
	_, err = con.Model(&Room{}).Insert(room)
	return err
}
