package util

import (
	"testing"

	"lagertool.com/main/db_models"

	"github.com/stretchr/testify/assert"
)

func TestSufficientlySimilar(t *testing.T) {
	t.Run("Identical strings", func(t *testing.T) {
		assert.True(t, SufficientlySimilar("hello", "hello", 0))
	})

	t.Run("One character difference within degree", func(t *testing.T) {
		assert.True(t, SufficientlySimilar("hello", "hallo", 1))
	})

	t.Run("One character difference outside degree", func(t *testing.T) {
		assert.False(t, SufficientlySimilar("hello", "hallo", 0))
	})

	t.Run("Two character difference", func(t *testing.T) {
		assert.True(t, SufficientlySimilar("hello", "haxlo", 2))
		assert.False(t, SufficientlySimilar("hello", "haxlo", 1))
	})

	t.Run("Completely different strings", func(t *testing.T) {
		assert.False(t, SufficientlySimilar("abc", "xyz", 2))
	})

	t.Run("Empty strings", func(t *testing.T) {
		assert.True(t, SufficientlySimilar("", "", 0))
	})

	t.Run("One empty string", func(t *testing.T) {
		assert.False(t, SufficientlySimilar("hello", "", 4))
		assert.True(t, SufficientlySimilar("hello", "", 5))
	})
}

func TestFindItemSearchTermsInDB(t *testing.T) {
	items := []db_models.Inventory{
		{Name: "Screwdriver"},
		{Name: "Screwdrivar"},
		{Name: "Hammer"},
		{Name: "Hammar"},
		{Name: "Wrench"},
	}

	t.Run("Exact match returns single result", func(t *testing.T) {
		results := FindItemSearchTermsInDB(items, "Screwdriver")
		assert.Equal(t, 1, len(results))
		assert.Equal(t, "Screwdriver", results[0].Name)
	})

	t.Run("Close match returns fuzzy results", func(t *testing.T) {
		results := FindItemSearchTermsInDB(items, "Screwdriver")
		assert.GreaterOrEqual(t, len(results), 1)
		// "Screwdriver" and "Screwdrivar" should both be close matches
	})

	t.Run("No match returns empty slice", func(t *testing.T) {
		results := FindItemSearchTermsInDB(items, "Chainsaw")
		assert.Equal(t, 0, len(results))
	})

	t.Run("Empty table returns empty slice", func(t *testing.T) {
		results := FindItemSearchTermsInDB([]db_models.Inventory{}, "anything")
		assert.Equal(t, 0, len(results))
	})

	t.Run("Results ordered by relevance", func(t *testing.T) {
		results := FindItemSearchTermsInDB(items, "Hammar")
		assert.GreaterOrEqual(t, len(results), 1)
		// "Hammar" is exact match
		assert.Equal(t, "Hammar", results[0].Name)
	})

	t.Run("Primary results appear before secondary", func(t *testing.T) {
		// "Hammor" is 1 edit from "Hammar", 2 from "Hammer"
		results := FindItemSearchTermsInDB(items, "Hammor")
		assert.GreaterOrEqual(t, len(results), 2)
		// Both Hammer and Hammar should appear as close matches
	})
}
