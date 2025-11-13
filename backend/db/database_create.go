package db

import (
	"time"

	"github.com/go-pg/pg/v10"
)

func CreateBuilding(con *pg.DB, name string, campus string) {
	building := &Building{
		Name:       name,
		Campus:     campus,
		UpdateDate: time.Now(),
	}

}
