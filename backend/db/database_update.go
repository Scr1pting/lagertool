package db

import (
	"time"

	"github.com/go-pg/pg/v10"
	"lagertool.com/main/db_models"
)

func Update_Request(con *pg.DB, id int, status string) error {
	_, err := con.Model((*db_models.Request)(nil)).
		Set("status = ?", status).
		Where("id = ?", id).
		Update()

	return err
}

func Update_Loan(con *pg.DB, id int, returnedAt time.Time, isReturned bool) error {
	_, err := con.Model((*db_models.Loans)(nil)).
		Set("returned_at = ?", returnedAt).
		Set("returned = ?", isReturned).
		Where("id = ?", id).
		Update()

	return err
}
