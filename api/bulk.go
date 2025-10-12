package api

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/db"
	"lagertool.com/main/util"
)

// ALlows for bulk .csv adding of db.Inventory to the DB
type BulkAddJSONData struct {
	ItemName string `json:"item_name" pg:"item_name"`
	Building string `json:"building" pg:"building"`
	Room     string `json:"room" pg:"room"`
	Amount   int    `json:"amount" pg:"amount"`
}

func (h *Handler) BulkAdd(c *gin.Context) {
	var data []BulkAddJSONData
	if err := c.BindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parsing as list of Inventory failed. Format of JSON body incorrect. Error: " + err.Error(),
		})
		return
	}

	// Begin a transaction to ensure atomicity
	err := h.DB.RunInTransaction(c, func(tx *pg.Tx) error {
		for _, entry := range data {
			// Step 1: Resolve Item.ID from itemName
			var item db.Item
			err := tx.Model(&item).
				Where("name = ?", entry.ItemName).
				Select()
			if err != nil {
				log.Println("No item found with name " + entry.ItemName)
				return err // Item not found or DB error

			}

			// Step 2: Resolve Shelf.ID from campus, building, and room
			var shelf db.Shelf
			err = tx.Model(&shelf).
				Where("building = ?", entry.Building).
				Where("room = ?", entry.Room).
				Select()
			if err != nil {
				log.Println("Looking Shelf.ID failed.")
				return err // Shelf not found or DB error
			}

			// Step 3: Find all Locations associated with the Shelf
			// (via Column -> ShelfUnit -> Location)
			var locations []db.Location
			err = tx.Model(&locations).
				Join("JOIN shelf_unit su ON su.id = location.shelf_unit_id").
				Join("JOIN col c ON c.id = su.column_id").
				Join("JOIN shelf s ON s.id = c.shelf_id").
				Select()
			if err != nil {
				return fmt.Errorf("ERROR Location search failed %s", shelf.ID, err.Error())
			}
			if len(locations) == 0 {
				return fmt.Errorf("ERROR No location for shelfid %s", shelf.ID)
			}

			// Step 4: Create Inventory entries for each Location
			for _, loc := range locations {
				inventory := db.Inventory{
					LocationId: loc.ID,
					ItemId:     item.ID,
					Amount:     1,  // Default amount, as not provided in BulkAddJSONData
					Note:       "", // Optional: Add note if needed
				}
				_, err = tx.Model(&inventory).Insert()
				if err != nil {
					return err // Inventory insertion failed
				}
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process bulk add: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bulk Add Successful!",
		"added":   len(data),
	})
}

func (h *Handler) BulkBorrow(c *gin.Context) {
	var borrows []db.Loans
	er := c.BindJSON(&borrows)
	if er != nil {
		c.JSON(http.StatusBadRequest, gin.H{"JSON borrow format incorrect": er.Error()})
		return
	}
	for _, bor := range borrows {
		err := h.LocalCreateLoan(&bor)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"❗\tIncorrect formatting of bulk borrow JSON submition.\n Proper format is:\n %[\n \t %{\n \t \t \"person_id\" : int \n \t \t \"item_id\" : int \n \t \t \"amount\" : int \n \t \t \"begin\" : YYYY-MM-DDThh:mm:sZ \n \t \t \"until\" : YYYY-MM-DDThh:mm:sZ \n\t %}, %{...%}\n %]": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, "Bulk Borrow Successful")
}

func (h *Handler) BulkSearch(c *gin.Context) {
	var searches []string
	if err := c.BindJSON(&searches); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body. Please format the JSON as %[\"string\",...%]"})
		return
	}

	// Initialize results with proper length
	results := make([][]db.Item, len(searches))

	for i, str := range searches {
		ti, err := h.LocalGetAllItems()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch all items", "details": err.Error()})
			return
		}
		results[i] = util.FindItemSearchTermsInDB(ti, str)
	}

	// Zip the results
	zipped := zipResults(results)
	c.JSON(http.StatusOK, zipped)
}

func zipResults(results [][]db.Item) []db.Item {
	if len(results) == 0 {
		return []db.Item{}
	}

	// Find the maximum length among all result slices
	maxLength := 0
	for _, result := range results {
		if len(result) > maxLength {
			maxLength = len(result)
		}
	}

	// Create the zipped result by taking elements round-robin style
	var zipped []db.Item
	for i := 0; i < maxLength; i++ {
		for j := 0; j < len(results); j++ {
			if i < len(results[j]) {
				zipped = append(zipped, results[j][i])
			}
		}
	}

	return zipped
}
