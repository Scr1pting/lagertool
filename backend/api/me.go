package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/api_objects"
	"lagertool.com/main/db_models"
)

// currentUser returns the logged-in user set by auth.AuthMiddleware, if any.
func currentUser(c *gin.Context) *db_models.User {
	v, ok := c.Get("user")
	if !ok {
		return nil
	}
	u, _ := v.(*db_models.User)
	return u
}

// targetUserID returns the user a request acts on and writes an error response
// when it returns false.
//   - /me/... routes (no :userId param): the logged-in user.
//   - /users/:userId/... routes: the given user, but only for that user
//     themself or an admin.
//
// Without a user in the context (handlers mounted without AuthMiddleware, as in
// the tests) the :userId param is used as is.
func targetUserID(c *gin.Context) (int, bool) {
	u := currentUser(c)
	param := c.Param("userId")
	if param == "" {
		if u == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not logged in"})
			return 0, false
		}
		return u.ID, true
	}

	id, err := strconv.Atoi(param)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return 0, false
	}
	if u != nil && u.ID != id && !u.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "not allowed to act on another user"})
		return 0, false
	}
	return id, true
}

// actingUserID is the author of an action (review, message): the logged-in
// user, or the id sent in the request body when there is no user in the context.
func actingUserID(c *gin.Context, fromBody int) int {
	if u := currentUser(c); u != nil {
		return u.ID
	}
	return fromBody
}

// @Summary Get the logged-in user
// @Description Returns the user of the current session. 401 if not logged in.
// @Tags auth
// @Produce  json
// @Success 200 {object} api_objects.Me
// @Failure 401 {object} map[string]string "Not logged in"
// @Router /me [get]
func (h *Handler) GetMe(c *gin.Context) {
	u := currentUser(c)
	if u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not logged in"})
		return
	}
	c.JSON(http.StatusOK, api_objects.Me{ID: u.ID, Name: u.Name, Email: u.Email, IsAdmin: u.IsAdmin})
}

// @Summary List my borrow requests
// @Description Borrow requests of the logged-in user, newest first.
// @Tags requests
// @Produce  json
// @Success 200 {array} api_objects.BorrowRequest
// @Failure 401 {object} map[string]string "Not logged in"
// @Router /me/borrow_requests [get]
func (h *Handler) GetMyBorrowRequests(c *gin.Context) {
	u := currentUser(c)
	if u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not logged in"})
		return
	}
	q := c.Request.URL.Query()
	q.Set("userId", strconv.Itoa(u.ID))
	c.Request.URL.RawQuery = q.Encode()
	h.GetBorrowRequests(c)
}

// canAccessRequest reports whether the logged-in user may see or act on a
// borrow request: its owner or an admin. Writes an error response when false.
// Without a user in the context (handlers mounted without AuthMiddleware) it
// allows access.
func (h *Handler) canAccessRequest(c *gin.Context, requestID int) bool {
	u := currentUser(c)
	if u == nil || u.IsAdmin {
		return true
	}
	var req db_models.Request
	err := h.DB.Model(&req).Column("user_id").Where("id = ?", requestID).Select()
	if errors.Is(err, pg.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "request not found"})
		return false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return false
	}
	if req.UserID != u.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not allowed to access this request"})
		return false
	}
	return true
}
