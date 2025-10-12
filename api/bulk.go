package api

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/db"
	"lagertool.com/main/util"
)

// ALlows for bulk .csv adding of db.Inventory to the DB
func (h *Handler) BulkAdd(c *gin.Context) {
	var inventories []db.Inventory
	e := c.BindJSON(&inventories)
	if e != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Parsing as list of Inventory failed. Format of JSON body incorrect. Error: ": e.Error()})
		return
	}
	for _, inv := range inventories {
		err := h.LocalCreateInventory(&inv)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"❗\tIncorrect formatting of bulk add JSON submition.\n Proper format is:\n %[\n \t %{\n \t \t \"location_id\" : int \n \t \t \"item_id\" : int \n \t \t \"amount\" : int \n \t \t \"note\" : string \n \t %}, %{...%}\n %]": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, "Bulk Add Successful!")
}

type BorrowForm struct {
	ItemName       string    `json:"itemName"`
	PersonName     string    `json:"personName"`
	PersonLastName string    `json:"personLastName"`
	Amount         string    `json:"amount"`
	Until          time.Time `json:"until"`
}

func (h *Handler) BulkBorrow(c *gin.Context) {
	var borrows []BorrowForm
	er := c.BindJSON(&borrows)
	if er != nil {
		c.JSON(http.StatusBadRequest, gin.H{"JSON borrow format incorrect": er.Error()})
		return
	}

	for _, borrow := range borrows {
		log.Println(borrow.ItemName, borrow.PersonName, borrow.PersonLastName, borrow.Amount, borrow.Until)
		pers, err := h.LocalGetPersonByName(borrow.PersonName, borrow.PersonLastName)
		if err != nil {
			pers = &db.Person{Firstname: borrow.PersonName, Lastname: borrow.PersonLastName}
			err = h.LocalCreatePerson(pers)
			log.Println("error getting person by name", err)
		}
		item, err := h.LocalGetItemByName(borrow.ItemName)
		if err != nil {
			log.Println("error getting item by name", err)
			item = &db.Item{Name: borrow.ItemName}
			err = h.LocalCreateItem(item)
		}
		amount, _ := strconv.ParseInt(borrow.Amount, 10, 0)
		err = h.LocalCreateLoan(&db.Loans{
			PersonID:   pers.ID,
			ItemID:     item.ID,
			Amount:     int(amount),
			Begin:      time.Now(),
			Until:      borrow.Until,
			Returned:   false,
			ReturnedAt: time.Time{},
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"❗\tIncorrect formatting of bulk borrow JSON submition.\n Proper format is:\n %[\n \t %{\n \t \t \"person_id\" : int \n \t \t \"item_id\" : int \n \t \t \"amount\" : int \n \t \t \"begin\" : YYYY-MM-DDThh:mm:sZ \n \t \t \"until\" : YYYY-MM-DDThh:mm:sZ \n\t %}, %{...%}\n %]": err.Error()})
			log.Println("error creating loan", err)
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
