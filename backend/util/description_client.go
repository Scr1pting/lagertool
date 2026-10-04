package util

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// ItemPayload mirrors the description_gen service's Item schema:
// {"name": str, "tags": list[str]}.
type ItemPayload struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

type generateResponse struct {
	Category string `json:"category"`
}

var descriptionHTTPClient = &http.Client{Timeout: 5 * time.Second}

// GenerateCategory POSTs the items to {baseURL}/generate and returns the
// category label. The caller is responsible for handling errors (e.g.
// logging and skipping when the Python service is down).
func GenerateCategory(ctx context.Context, baseURL string, items []ItemPayload) (string, error) {
	body, err := json.Marshal(items)
	if err != nil {
		return "", fmt.Errorf("marshal items: %w", err)
	}
	url := strings.TrimRight(baseURL, "/") + "/generate"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := descriptionHTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("post %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode/100 != 2 {
		return "", fmt.Errorf("description_gen returned %d", resp.StatusCode)
	}

	var out generateResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}
	return out.Category, nil
}
