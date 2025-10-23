package chatbot

import (
	"log"
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
	log.Println("openaiKey:", openaiKey)
	client := openai.NewClient(openaiKey)
	sysprompt := `
You are an assistant that helps users by either answering directly or calling APIs.
You can use the following actions:
- "get_items": to retrieve all kind of items GET http://localhost:8000/api/items)
- "get_inventory": to retrieve all inventory records. The Inventory records connects Items with locations and stores an amount. GET /api/inventory
- "get_loans": to retrieve all records of loans between persons and items GET /api/loans
- "get_persons": to retrieve all records of persons, including the slack_id GET /api/persons
- "get_shelves": to retrieve information about building, room and shelf, match the shelf's five letter id. GET /api/shelves/{id}

Respond in this JSON format only:
{
  "action": "get_items" | "get_inventory" | "get_locations" | "get_loans" | "get_shelves" | "get_persons" | "none"
  "params": { "userId": "123" },
  "reply": "natural language message to the user"
}
`
	return client, sysprompt
}
