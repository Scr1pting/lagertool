package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
	"lagertool.com/main/chatbot"
)

func (h *Handler) ChatHandler(c *gin.Context) {
	var req struct {
		Message string `json:"message"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx := context.Background()

	// --- Step 1: Call AI to determine action (Tool Call) ---
	firstResp, err := h.Ai.Client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: openai.GPT4oMini,
			Messages: []openai.ChatCompletionMessage{
				{Role: "system", Content: h.Ai.SysPrompt},
				{Role: "user", Content: req.Message},
			},
			ResponseFormat: &openai.ChatCompletionResponseFormat{
				Type: openai.ChatCompletionResponseFormatTypeJSONObject,
			},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI decision error: %v", err)})
		return
	}

	var tool chatbot.ToolCall
	if err := json.Unmarshal([]byte(firstResp.Choices[0].Message.Content), &tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "bad AI JSON for tool decision"})
		return
	}

	// Default reply is the initial reply from the AI
	finalReply := tool.Reply

	// --- Step 2: Perform API call if needed ---
	if tool.Action != "none" {
		data, err := callInternalAPI(tool.Action, tool.Params)

		if err != nil {
			// If API call fails, just append an error message to the AI's initial reply
			finalReply += fmt.Sprintf("\n\n(I tried calling your API but got an error: %v)", err)
		} else {
			// If API call succeeds, perform the second AI call for interpretation

			// --- Step 3: Call AI again to interpret the data (Natural Language Generation) ---

			// Construct messages for the interpretation call
			messages := []openai.ChatCompletionMessage{
				// System prompt is kept general, focusing on role
				{Role: "system", Content: "You are an assistant. The user asked a question, and a tool was called. Your job now is to analyze the tool's raw output (provided below) and generate a single, final, user-friendly, natural language response based on it. Do not use JSON."},

				// The raw data is provided as a system message to the model
				{Role: "system", Content: fmt.Sprintf("Tool %s completed. Raw Data:\n%s", tool.Action, data)},

				// Add the original user message for context
				{Role: "user", Content: req.Message},
			}

			secondResp, interpretErr := h.Ai.Client.CreateChatCompletion(
				ctx,
				openai.ChatCompletionRequest{
					Model:    openai.GPT4oMini,
					Messages: messages,
					// No ResponseFormat is specified, defaulting to natural text
				},
			)

			if interpretErr != nil {
				log.Printf("AI interpretation error: %v", interpretErr)
				// Fallback: If the interpretation call fails, return the raw data with an explanation
				finalReply = fmt.Sprintf("I retrieved the data, but the AI failed to format it (Error: %v). Here is the raw data:\n%s", interpretErr, data)
			} else {
				// Success! Use the natural language reply from the second call
				finalReply = secondResp.Choices[0].Message.Content
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"reply": finalReply})
}

func callAPIhelper(client *http.Client, url string) (string, error) {

	resp, err := client.Get(url)

	if err != nil {

		return "", err

	}

	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)

	if err != nil {

		return "", err

	}

	return string(body), nil

}

func callInternalAPI(action string, params map[string]string) (string, error) {

	tr := &http.Transport{

		TLSClientConfig: &tls.Config{

			MinVersion: tls.VersionTLS12,
		},
	}

	client := &http.Client{Transport: tr}

	switch action {

	case "get_items":

		return callAPIhelper(client, "http://localhost:8000/api/items")

	case "get_inventory":

		return callAPIhelper(client, "http://localhost:8000/api/inventory")

	case "get_locations":

		return callAPIhelper(client, "http://localhost:8000/api/locations")

	case "get_loans":

		return callAPIhelper(client, "http://localhost:8000/api/loans")

	case "get_shelves":

		return callAPIhelper(client, "http://localhost:8000/api/shelves")

	case "get_persons":

		return callAPIhelper(client, "http://localhost:8000/api/persons")

	case "none":

		return "", nil

	default:

		return "", fmt.Errorf("unknown action: %s", action)

	}

}
