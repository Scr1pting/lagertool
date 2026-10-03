package auth

import (
	"encoding/base64"
	"testing"
)

func fakeToken(payload string) string {
	return "e30." + base64.RawURLEncoding.EncodeToString([]byte(payload)) + ".sig"
}

func TestHasAdminRole(t *testing.T) {
	// resource_access as seen for the VSETH fake realm test users
	cases := map[string]struct {
		payload string
		want    bool
	}{
		"admin":    {`{"resource_access":{"eventmanager":{"roles":["vis-active","admin"]},"ei-tool":{"roles":["admin"]},"member-ui":{"roles":["admin"]},"member-api":{"roles":["admin"]},"cdn-backend":{"roles":["admin"]}}}`, true},
		"vorstand": {`{"resource_access":{"eventmanager":{"roles":["vis-active"]},"member-ui":{"roles":["admin"]},"member-api":{"roles":["admin"]},"cdn-backend":{"roles":["admin"]}}}`, true},
		"user":     {`{"resource_access":{"eventmanager":{"roles":["admin"]},"account":{"roles":["manage-account"]}}}`, false},
		"garbage":  {`not json`, false},
	}
	for name, tc := range cases {
		if got := hasAdminRole(fakeToken(tc.payload)); got != tc.want {
			t.Errorf("%s: hasAdminRole = %v, want %v", name, got, tc.want)
		}
	}
	if hasAdminRole("not-a-jwt") {
		t.Error("malformed token should not be admin")
	}
}
