package util

import (
	"github.com/agnivade/levenshtein"
)

func sufficientlySimilar(s1 string, s2 string) bool {
	distance := levenshtein.ComputeDistance(s1, s2)
	if distance < max(len(s1), len(s2))/2 {
		return true
	}
	return false
}
