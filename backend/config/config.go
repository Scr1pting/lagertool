package config

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	DB    DatabaseConfig
	Slack SlackConfig
	App   AppSettings
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

// SlackConfig holds Slack configuration
type SlackConfig struct {
	BotToken string
}

// AppSettings holds general application configuration
type AppSettings struct {
	Port string
}

var App *Config

// Load loads configuration from environment variables
// It attempts to load a .env file if it exists, but doesn't fail if it doesn't
func Load() *Config {
	// Try to load .env file, but don't fail if it doesn't exist
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// If we are in test mode, load test-specific variables, overriding existing ones
	if gin.Mode() == gin.TestMode {
		// Look for the file in the parent directory, as tests are often run from subdirectories
		if err := godotenv.Overload("../.env.test"); err != nil {
			log.Printf("No .env.test file found, using defaults for testing: %v", err)
		}
	}

	dbName := getEnv("DB_NAME", "appdb")

	// If we are in test mode, append _test to the database name
	if gin.Mode() == gin.TestMode {
		dbName += "_test"
	}

	App = &Config{
		DB: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "example"),
			Name:     dbName,
		},
		Slack: SlackConfig{
			BotToken: getEnv("SLACK_BOT_TOKEN", ""),
		},
		App: AppSettings{
			Port: getEnv("APP_PORT", "8000"),
		},
	}

	return App
}

// getEnv retrieves environment variable or returns default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
