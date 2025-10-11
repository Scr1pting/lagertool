package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/db"
	"lagertool.com/main/util"
)

// ALlows for bulk .csv adding of db.Inventory to the DB
func (h *Handler) BulkAdd(c *gin.Context) {
	var inventories []db.Inventory
	c.BindJSON(&inventories)
	for _, inv := range inventories {
		err := h.LocalCreateInventory(&inv)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"❗\tIncorrect formatting of bulk add JSON submition.\n Proper format is:\n %[\n \t %{\n \t \t \"location_id\" : int \n \t \t \"item_id\" : int \n \t \t \"amount\" : int \n \t \t \"note\" : string \n \t %}, %{...%}\n %]": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, "Bulk Add Successful!")
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
