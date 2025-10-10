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

func FindItemSearchTermsInDB(db []db.Item, s string) []string {
	result_prim := []string{}
	result_sec := []string{}
	result_tert := []string{}
	for _, v := range db {
		name := v.Name
		if name == s {
			return []string{name}
		}
		if SufficientlySimilar(s, name, 1) {
			result_prim = append(result_prim, name)
			continue
		}
		if SufficientlySimilar(s, name, 2) {
			result_sec = append(result_sec, name)
			continue
		}
		if SufficientlySimilar(s, name, 3) {
			result_tert = append(result_tert, name)
			continue
		}

	}
	return append(append(result_prim, result_sec...), result_tert...)
}
