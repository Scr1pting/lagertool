package util

import (
	"github.com/agnivade/levenshtein"
	"lagertool.com/main/db"
)

func SufficientlySimilar(s1 string, s2 string, degree int) bool {
	distance := levenshtein.ComputeDistance(s1, s2)
	if distance <= degree {
		return true
	}
	return false
}

func FindItemSearchTermsInDB(table []db.Item, s string) []db.Item {
	result_prim := []db.Item{}
	result_sec := []db.Item{}
	result_tert := []db.Item{}
	for _, v := range table {
		name := v.Name
		if name == s {
			return []db.Item{v}
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
