package api

import "lagertool.com/main/db"

// Helper function to build shelf response with units and numItems (sum of inventory amounts)
func (h *Handler) buildShelfResponse(shelf db.Shelf) ShelfResponse {
	// Get all columns for this shelf
	var columns []db.Column
	h.DB.Model(&columns).Where("shelf_id = ?", shelf.ID).Select()

	// Build response columns
	var respColumns []struct {
		ID       string `json:"id"`
		NumItems int    `json:"numItems"`
		Elements []struct {
			ID       string `json:"id"`
			Type     string `json:"type"`
			NumItems int    `json:"numItems"`
		} `json:"elements"`
	}

	totalItems := 0

	for _, column := range columns {
		// Get all units for this column
		var units []db.ShelfUnit
		h.DB.Model(&units).Where("column_id = ?", column.ID).Select()

		// Build elements array
		var elements []struct {
			ID       string `json:"id"`
			Type     string `json:"type"`
			NumItems int    `json:"numItems"`
		}

		columnItemCount := 0

		for _, unit := range units {
			// Get location for this shelf unit
			var location db.Location
			err := h.DB.Model(&location).Where("shelf_unit_id = ?", unit.ID).Select()

			unitItemCount := 0
			if err == nil {
				// Get all inventory records for this location and sum their amounts
				var inventoryRecords []db.Inventory
				h.DB.Model(&inventoryRecords).
					Where("location_id = ?", location.ID).
					Select()

				for _, inv := range inventoryRecords {
					unitItemCount += inv.Amount
				}
			}

			elements = append(elements, struct {
				ID       string `json:"id"`
				Type     string `json:"type"`
				NumItems int    `json:"numItems"`
			}{
				ID:       unit.ID,
				Type:     unit.Type,
				NumItems: unitItemCount,
			})

			columnItemCount += unitItemCount
		}

		respColumns = append(respColumns, struct {
			ID       string `json:"id"`
			NumItems int    `json:"numItems"`
			Elements []struct {
				ID       string `json:"id"`
				Type     string `json:"type"`
				NumItems int    `json:"numItems"`
			} `json:"elements"`
		}{
			ID:       column.ID,
			NumItems: columnItemCount,
			Elements: elements,
		})

		totalItems += columnItemCount
	}

	// Build final response
	resp := ShelfResponse{
		ID:       shelf.ID,
		Name:     shelf.Name,
		Building: shelf.Building,
		Room:     shelf.Room,
		NumItems: totalItems,
		Columns:  respColumns,
	}

	return resp
}
