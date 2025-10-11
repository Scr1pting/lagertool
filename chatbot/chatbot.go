package chatbot

import (
	"os"

	"github.com/sashabaranov/go-openai"
)

type ToolCall struct {
	Action string            `json:"action"`
	Params map[string]string `json:"params"`
	Reply  string            `json:"reply"`
}

type ChatBot struct {
	Client    *openai.Client
	SysPrompt string
}

func ConnectAI() (*openai.Client, string) {
	openaiKey := os.Getenv("OPENAI_KEY")
	client := openai.NewClient(openaiKey)
	syscall := `
You are an assistant that helps users by either answering directly or calling APIs.
You can use the following actions:
- "get_items": to retrieve all kind of items GET /api/items)

Respond in this JSON format only:
{
  "action": "get_orders" | "get_user" | "none",
  "params": { "userId": "123" },
  "reply": "natural language message to the user"
}
`
	return client, syscall
}
