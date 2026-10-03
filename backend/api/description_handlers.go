package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lagertool.com/main/db"
	"lagertool.com/main/db_models"
)

// @Summary Regenerate a shelf unit's description
// @Description Re-runs description_gen against the items currently on the
// @Description shelf unit and writes the result to shelf_unit.description.
// @Tags shelves
// @Produce json
// @Param id path string true "Shelf Unit ID"
// @Success 200 {object} map[string]string
// @Router /shelf-units/{id}/regenerate-description [post]
func (h *Handler) RegenerateShelfUnitDescription(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing shelf unit id"})
		return
	}

	var unit db_models.ShelfUnit
	if err := h.DB.Model(&unit).Where("id = ?", id).Select(); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shelf unit not found"})
		return
	}

	description, err := db.RegenerateShelfUnitDescription(c.Request.Context(), h.DB, h.Cfg.DescriptionGen.URL, id)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "description": description})
}

// @Summary Regenerate every shelf unit's description (bulk)
// @Description Iterates every shelf unit and refreshes its description.
// @Description Intended for backfilling existing data or re-running after
// @Description description_gen's categories list changes. Returns counts.
// @Tags shelves
// @Produce json
// @Success 200 {object} map[string]int
// @Router /shelf-units/regenerate-descriptions [post]
func (h *Handler) RegenerateAllDescriptions(c *gin.Context) {
	updated, failed, firstErr := db.RegenerateAllShelfUnitDescriptions(c.Request.Context(), h.DB, h.Cfg.DescriptionGen.URL, 4)
	resp := gin.H{"updated": updated, "failed": failed}
	if firstErr != nil {
		resp["first_error"] = firstErr.Error()
	}
	c.JSON(http.StatusOK, resp)
}
