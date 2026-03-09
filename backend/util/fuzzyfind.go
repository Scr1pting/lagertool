package util

import (
	"github.com/agnivade/levenshtein"
	"lagertool.com/main/db_models"
)

func SufficientlySimilar(s1 string, s2 string, degree int) bool {
	distance := levenshtein.ComputeDistance(s1, s2)
	if distance <= degree {
		return true
	}
	return false
}

func FindItemSearchTermsInDB(table []db_models.Inventory, s string) []db_models.Inventory {
	result_prim := []db_models.Inventory{}
	result_sec := []db_models.Inventory{}
	result_tert := []db_models.Inventory{}
	for _, v := range table {
		name := v.Name
		if name == s {
			return []db_models.Inventory{v}
		}
		if SufficientlySimilar(s, name, 1) {
			result_prim = append(result_prim, v)
			continue
		}
		if SufficientlySimilar(s, name, 2) {
			result_prim = append(result_prim, v)
			continue
		}
		if SufficientlySimilar(s, name, 3) {
			result_sec = append(result_sec, v)
			continue
		}
		if SufficientlySimilar(s, name, 4) {
			result_tert = append(result_tert, v)
			continue
		}

	}
	return append(append(result_prim, result_sec...), result_tert...)
}
