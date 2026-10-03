package db

import (
	"context"
	"fmt"

	"github.com/go-pg/pg/v10"
	"lagertool.com/main/db_models"
	"lagertool.com/main/util"
)

// RegenerateShelfUnitDescription reads the items on a shelf unit, asks the
// description_gen service for a category, and writes it back to
// shelf_unit.description. Empty units are set to "" without calling the
// service.
func RegenerateShelfUnitDescription(ctx context.Context, con *pg.DB, baseURL, shelfUnitID string) (string, error) {
	var items []db_models.Inventory
	if err := con.ModelContext(ctx, &items).
		Where("shelf_unit_id = ?", shelfUnitID).
		Select(); err != nil {
		return "", fmt.Errorf("select items: %w", err)
	}

	if len(items) == 0 {
		return "", setShelfUnitDescription(ctx, con, shelfUnitID, "")
	}

	payload := make([]util.ItemPayload, len(items))
	for i, it := range items {
		payload[i] = util.ItemPayload{
			Name: it.Name,
			Tags: util.SplitKeywords(it.Keywords),
		}
	}

	category, err := util.GenerateCategory(ctx, baseURL, payload)
	if err != nil {
		return "", err
	}
	return category, setShelfUnitDescription(ctx, con, shelfUnitID, category)
}

// RegenerateAllShelfUnitDescriptions runs RegenerateShelfUnitDescription
// against every shelf unit, with bounded concurrency. Returns counts of
// successes and failures and the first error encountered (if any).
func RegenerateAllShelfUnitDescriptions(ctx context.Context, con *pg.DB, baseURL string, parallelism int) (updated, failed int, firstErr error) {
	if parallelism < 1 {
		parallelism = 1
	}
	var units []db_models.ShelfUnit
	if err := con.ModelContext(ctx, &units).Column("id").Select(); err != nil {
		return 0, 0, fmt.Errorf("select shelf units: %w", err)
	}

	type result struct {
		err error
	}
	jobs := make(chan string)
	results := make(chan result)
	for i := 0; i < parallelism; i++ {
		go func() {
			for id := range jobs {
				_, err := RegenerateShelfUnitDescription(ctx, con, baseURL, id)
				results <- result{err: err}
			}
		}()
	}
	go func() {
		for _, u := range units {
			jobs <- u.ID
		}
		close(jobs)
	}()
	for range units {
		r := <-results
		if r.err != nil {
			failed++
			if firstErr == nil {
				firstErr = r.err
			}
		} else {
			updated++
		}
	}
	return updated, failed, firstErr
}

// ClearShelfUnitDescriptions sets description to NULL, marking the units as
// waiting for a new category until RegenerateShelfUnitDescription finishes.
func ClearShelfUnitDescriptions(ctx context.Context, con *pg.DB, shelfUnitIDs []string) error {
	_, err := con.ModelContext(ctx, (*db_models.ShelfUnit)(nil)).
		Set("description = NULL").
		Where("id IN (?)", pg.In(shelfUnitIDs)).
		Update()
	if err != nil {
		return fmt.Errorf("clear shelf_unit.description: %w", err)
	}
	return nil
}

func setShelfUnitDescription(ctx context.Context, con *pg.DB, shelfUnitID, description string) error {
	_, err := con.ModelContext(ctx, (*db_models.ShelfUnit)(nil)).
		Set("description = ?", description).
		Where("id = ?", shelfUnitID).
		Update()
	if err != nil {
		return fmt.Errorf("update shelf_unit.description: %w", err)
	}
	return nil
}
