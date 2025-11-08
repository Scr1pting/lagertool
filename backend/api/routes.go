package api

import (
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"lagertool.com/main/auth"
	"lagertool.com/main/config"
)

func SetupRoutes(r *gin.Engine, dbCon *pg.DB, cfg *config.Config) {
	h := NewHandler(dbCon, cfg)

	r.GET("/shelves", h.GetShelves)

	r.GET("/item:id:start:end", h.GetItem)

	// Calendar endpoints
	r.GET("/calendar/all", h.GetDownloadICSALL)
	r.GET("/calendar/:id", h.GetDownloadICS)

	// Google OAuth2
	r.GET("/auth/google/login", auth.GoogleLoginHandler)
	r.GET("/auth/google/callback", auth.GoogleCallbackHandler)
	r.POST("/auth/google/callback", auth.VerifyGoogleToken)
}
