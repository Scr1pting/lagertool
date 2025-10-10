package db

import (
	"fmt"

	"github.com/go-pg/pg/v10"
)

const (
	host     = "localhost"
	port     = 5432
	user     = "postgres"
	password = "your-password"
	dbname   = "calhounio_demo"
)

func NewDBConn() (con *pg.DB, err error) {
	address := fmt.Sprintf("%s:%s", "localhost", "5432")
	options := &pg.Options{
		User:     "postgres",
		Password: "12345678",
		Addr:     address,
		Database: "postgres",
		PoolSize: 50,
	}
	con = pg.Connect(options)
	if con == nil {
		return nil, err
	}
	return con, nil
}
