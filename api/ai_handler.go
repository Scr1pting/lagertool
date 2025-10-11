package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
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

	resp, err := h.Ai.Client.CreateChatCompletion(
		context.Background(),
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var tool chatbot.ToolCall
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "bad AI JSON"})
		return
	}

	// Default AI reply
	reply := tool.Reply

	// Perform API call if needed
	if tool.Action != "none" {
		data, err := callInternalAPI(tool.Action, tool.Params)
		if err != nil {
			reply += fmt.Sprintf("\n\n(I tried calling your API but got an error: %v)", err)
		} else {
			reply += fmt.Sprintf("\n\nHere’s what I found:\n%s", data)
		}
	}

	c.JSON(http.StatusOK, gin.H{"reply": reply})
}

func callInternalAPI(action string, params map[string]string) (string, error) {
	switch action {
	case "get_items":
		resp, err := http.Get("https://05.hackathon.ethz.ch/api/items")
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		body, _ := ioutil.ReadAll(resp.Body)
		return string(body), nil
	default:
		return "", fmt.Errorf("unknown action")
	}
}
