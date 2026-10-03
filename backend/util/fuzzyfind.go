package util

import (
	"strings"

	"github.com/agnivade/levenshtein"
	"lagertool.com/main/db_models"
)

func SufficientlySimilar(s1 string, s2 string, degree int) bool {
	return levenshtein.ComputeDistance(s1, s2) <= degree
}

func FindItemSearchTermsInDB(table []db_models.Inventory, s string) []db_models.Inventory {
	if s == "" {
		return []db_models.Inventory{}
	}
	sLower := strings.ToLower(s)

	degree := 0
	switch {
	case len(sLower) >= 7:
		degree = 2
	case len(sLower) >= 4:
		degree = 1
	}

	var resultPrim, resultSec []db_models.Inventory

	for _, v := range table {
		nameLower := strings.ToLower(v.Name)

		if nameLower == sLower {
			return []db_models.Inventory{v}
		}

		if strings.Contains(nameLower, sLower) {
			resultPrim = append(resultPrim, v)
			continue
		}

		if degree == 0 {
			continue
		}

		for _, word := range strings.Fields(nameLower) {
			if SufficientlySimilar(sLower, word, degree) {
				resultSec = append(resultSec, v)
				break
			}
		}
	}
	return append(resultPrim, resultSec...)
}
