package api

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/config"
	"lagertool.com/main/db_models"
	"lagertool.com/main/util"
)

type Handler struct {
	DB  *pg.DB
	Cfg *config.Config
}

func NewHandler(db *pg.DB, cfg *config.Config) *Handler {
	return &Handler{DB: db, Cfg: cfg}
}

// @Summary Get all organisations
// @Description Get all organisations
// @Tags organisations
// @Produce  json
// @Success 200 {array} db_models.Organisation
// @Router /organisations [get]
func (h *Handler) GetOrganisations(c *gin.Context) {
	var organisations []db_models.Organisation
	err := h.DB.Model(&organisations).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, organisations)
}

// @Summary Get all shelves for an organisation
// @Description Get all shelves for an organisation
// @Tags shelves
// @Produce  json
// @Param orgId path string true "Organisation name"
// @Success 200 {array} api_objects.Shelves
// @Router /organisations/{orgId}/shelves [get]
func (h *Handler) GetShelves(c *gin.Context) {
	organisation := c.Param("orgId")
	var res []api_objects.Shelves
	var dbRes []db_models.Shelf
	err := h.DB.Model(&dbRes).Where("owned_by = ?", organisation).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, shelf := range dbRes {
		shelfObj, err2 := h.GetShelfHelper(shelf.ID, organisation)
		if err2 != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err2.Error()})
			return
		}
		res = append(res, shelfObj)
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get a specific item
// @Description Get a specific item
// @Tags items
// @Produce  json
// @Param id path int true "Inventory Item ID"
// @Param start query string false "Start date in format 2006-01-02"
// @Param end query string false "End date in format 2006-01-02"
// @Success 200 {object} api_objects.InventoryItemWithShelf
// @Router /items/{id} [get]
func (h *Handler) GetItem(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	start, err := time.Parse("2006-01-02", c.Query("start"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start date"})
		return
	}
	end, err := time.Parse("2006-01-02", c.Query("end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end date"})
		return
	}
	invItem, err := h.GetInventoryItemHelper(id, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Look up the organisation from the shelf
	var shelf db_models.Shelf
	err = h.DB.Model(&shelf).Where("id = ?", invItem.ShelfID).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	shelfObj, err := h.GetShelfHelper(invItem.ShelfID, shelf.OwnedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := api_objects.InventoryItemWithShelf{
		InventoryItem: invItem,
		Shelf:         shelfObj,
	}
	c.JSON(http.StatusOK, res)
}

// @Summary Get a user's shopping cart
// @Description Get a user's shopping cart
// @Tags cart
// @Produce  json
// @Param userId path int true "User ID"
// @Param start query string true "Start date in format 2006-01-02"
// @Param end query string true "End date in format 2006-01-02"
// @Success 200 {object} map[string][]api_objects.CartItem
// @Router /users/{userId}/cart [get]
func (h *Handler) GetShoppingCart(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	start, err := time.Parse("2006-01-02", c.Query("start"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start date"})
		return
	}
	end, err := time.Parse("2006-01-02", c.Query("end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end date"})
		return
	}
	m, err := h.GetCartItemHelper(id, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, m)
}

func (h *Handler) GetMessages(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var res []api_objects.Message
	var dbResAdmin []db_models.RequestReview
	var dbResMember []db_models.UserRequestMessage

	err = h.DB.Model(&dbResMember).Relation("User").
		Where("request_id = ?", id).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	err = h.DB.Model(&dbResAdmin).Relation("User").Where("request_id = ?", id).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	for _, admin := range dbResAdmin {
		res = append(res, api_objects.Message{ID: admin.ID, AuthorName: admin.User.Name, Message: admin.Note, IsAdmin: true, TimeStamp: admin.TimeStamp})
	}
	for _, member := range dbResMember {
		res = append(res, api_objects.Message{
			ID:         member.ID,
			AuthorName: member.User.Name,
			Message:    member.Message,
			IsAdmin:    false,
			TimeStamp:  member.TimeStamp,
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].TimeStamp.Before(res[j].TimeStamp)
	})
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetBorrowHistory(c *gin.Context) {
	itemId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	var dbRes []db_models.RequestItems
	err = h.DB.Model(&dbRes).
		Where("inventory_id = ?", itemId).
		Relation("Request.User").
		Select()
	var res []api_objects.BorrowHistory
	for _, item := range dbRes {
		out := api_objects.BorrowHistory{
			User:      item.Request.User.Name,
			Event:     item.Request.Note,
			StartedAt: item.Request.StartDate,
			DueAt:     item.Request.EndDate,
			State:     "",
			Amount:    item.Amount,
		}
		if item.Request.State == "Approved" {
			var db2res db_models.Loans
			err = h.DB.Model(&db2res).Where("request_item_id = ?", item.ID).First()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if db2res.IsReturned {
				out.ReturnedAt = db2res.ReturnedAt
			}
		}
		res = append(res, out)
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) FuzzyFindItems(c *gin.Context) {
	searchTerm := c.Query("searchTerm")
	var dbRes []db_models.Inventory
	err := h.DB.Model(&dbRes).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	res := util.FindItemSearchTermsInDB(dbRes, searchTerm)
	c.JSON(http.StatusOK, res)
}

func (h *Handler) DeleteAllCartItems(c *gin.Context) {
	var dbCI []db_models.ShoppingCartItem
	userId, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	err = h.DB.Model(&dbCI).Relation("ShoppingCart").Where("shopping_cart.user_id = ?", userId).Select()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(dbCI) == 0 {
		c.JSON(http.StatusOK, []db_models.ShoppingCartItem{})
		return
	}
	ids := make([]int, len(dbCI))
	for i, item := range dbCI {
		ids[i] = item.ID
	}
	_, err = h.DB.Model((*db_models.ShoppingCartItem)(nil)).Where("id IN (?)", pg.In(ids)).Delete()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dbCI)
}
