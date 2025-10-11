package slack1

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/slack-go/slack"
	"lagertool.com/main/db"
)

type BorrowSession struct {
	Stage    string
	Item     string
	Quantity int
	Source   string
	DueDate  time.Time
}

var Sessions = make(map[string]*BorrowSession)

func SetupSlack() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	token := os.Getenv("SLACK_BOT_TOKEN")
	if token == "" {
		log.Fatal("SLACK_BOT_TOKEN not set")
	}
	fmt.Println("Bot token loaded.")

	api := slack.New(token)

	r := gin.Default()

	authResp, err := api.AuthTest()
	if err != nil {
		log.Fatal(err)
	}
	botID := authResp.UserID
	r.POST("/slack/interactivity", func(c *gin.Context) {
		// Slack sends the interaction payload as form data under the key "payload"
		payload := c.PostForm("payload")
		if payload == "" {
			log.Println("Error: Missing 'payload' in form data.")
			c.Status(http.StatusBadRequest)
			return
		}

		var callback slack.InteractionCallback
		// Unmarshal the payload string into the struct
		if err := json.Unmarshal([]byte(payload), &callback); err != nil {
			log.Println("Error unmarshaling Slack payload:", err)
			c.Status(http.StatusBadRequest)
			return
		}

		if err := godotenv.Load(); err != nil {
			log.Fatal("Error loading .env file")
		}

		token := os.Getenv("SLACK_BOT_TOKEN")
		if token == "" {
			log.Fatal("SLACK_BOT_TOKEN not set")
		}
		fmt.Println("Bot token loaded.")
		api := slack.New(token)

		user := callback.User.ID
		session, exists := Sessions[user]
		userInfo, err := api.GetUserInfo(user)
		if err != nil {
			log.Println("Error getting user info:", err)
		} else {
			fmt.Println("User ID:", userInfo.ID)
			fmt.Println("Username:", userInfo.Name)
			fmt.Println("Display Name:", userInfo.Profile.DisplayName)
		}

		// Corrected stage check: slack1.go sets "awaiting_due_date"
		if !exists || session.Stage != "awaiting_due_date" {
			c.Status(http.StatusOK)
			return
		}

		for _, action := range callback.ActionCallback.BlockActions {
			if action.ActionID == "due_date_selected" {
				dueDate, err := time.Parse("2006-01-02", action.SelectedDate)
				if err != nil {
					api.PostMessage(callback.Channel.ID,
						slack.MsgOptionText("Invalid date. Please try again.", false))
					return
				}

				session.DueDate = dueDate

				// Confirm to user
				api.PostMessage(callback.Channel.ID,
					slack.MsgOptionText(
						fmt.Sprintf("✅ Got it! You want %d %s(s) from %s until %s. I’ll check and confirm!",
							session.Quantity, session.Item, session.Source, session.DueDate.Format("Jan 2, 2006")),
						false))

				// Save to DB
				db.SlackBorrow(db.Borrow{
					Item:     session.Item,
					Amount:   session.Quantity,
					Location: session.Source,
					DueDate:  session.DueDate,
					UserID:   user,
					UserName: userInfo.Name,
				})

				session.Stage = "start"
			}
		}

		c.Status(http.StatusOK)
	})

	// Slack Events endpoint
	r.POST("/slack/events", func(c *gin.Context) {
		var body slackevents
		if err := c.ShouldBindJSON(&body); err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		// Respond to URL verification challenge
		if body.Type == "url_verification" {
			c.JSON(http.StatusOK, gin.H{"challenge": body.Challenge})
			return
		}

		// Handle messages
		if body.Event.Type == "message" {
			// Ignore messages from bots (including itself)
			if body.Event.User == "" || botID == body.Event.User {
				c.Status(http.StatusOK)
				return
			}

			user := body.Event.User
			channel := body.Event.Channel
			text := body.Event.Text

			userInfo, err := api.GetUserInfo(user)
			if err != nil {
				log.Println("Error getting user info:", err)
			} else {
				fmt.Println("User ID:", userInfo.ID)
				fmt.Println("Username:", userInfo.Name)                    // e.g., "john_doe"
				fmt.Println("Display Name:", userInfo.Profile.DisplayName) // e.g., "John"
			}

			session, exists := Sessions[user]
			if !exists {
				session = &BorrowSession{Stage: "start"}
				Sessions[user] = session
			}

			handleMessage(api, channel, session, text, userInfo)
		}

		c.Status(http.StatusOK)
	})

	log.Println("Slack bot running on :3000")
	log.Fatal(r.Run(":3000"))
}

// handleMessage processes the conversation
func handleMessage(api *slack.Client, channel string, session *BorrowSession, text string, user *slack.User) {
	log.Println(session.Stage)
	switch session.Stage {
	case "start":
		api.PostMessage(channel, slack.MsgOptionText("Hi! What would you like to borrow? (just the item name)", false))
		session.Stage = "awaiting_item"

	case "awaiting_item":
		session.Item = text
		api.PostMessage(channel, slack.MsgOptionText("How many do you need?", false))
		session.Stage = "awaiting_quantity"

	case "awaiting_quantity":
		qty, err := strconv.Atoi(text)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Please enter a valid number.", false))
			return
		}
		session.Quantity = qty
		api.PostMessage(channel, slack.MsgOptionText("From where do you want to borrow it? (Campus Building Room)", false))
		session.Stage = "awaiting_source"

	case "awaiting_source":
		session.Source = text

		// Create the datepicker element
		datePicker := slack.NewDatePickerBlockElement("due_date_selected")
		datePicker.InitialDate = time.Now().Format("2006-01-02")

		// Text section explaining what to do
		textSection := slack.NewSectionBlock(
			slack.NewTextBlockObject("mrkdwn", "Please pick a due date:", false, false),
			nil,
			nil,
		)

		// Action block with the datepicker
		actionBlock := slack.NewActionBlock(
			"due_date_action",
			datePicker,
		)

		// Send the message
		api.PostMessage(channel,
			slack.MsgOptionBlocks(
				textSection,
				actionBlock,
			),
		)

		session.Stage = "awaiting_due_date"

	case "awaiting_due_date":
		layout := "2006-01-02"
		dueDate, err := time.Parse(layout, text)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Please enter the date in YYYY-MM-DD format.", false))
			return
		}
		session.DueDate = dueDate
		api.PostMessage(channel, slack.MsgOptionText(
			fmt.Sprintf("✅ Got it! You want %d %s(s) from %s until %s. I’ll check and confirm!",
				session.Quantity, session.Item, session.Source, session.DueDate.Format("Jan 2, 2006")),
			false))
		session.Stage = "start"

		db.SlackBorrow(db.Borrow{
			Item:     session.Item,
			Amount:   session.Quantity,
			Location: session.Source,
			DueDate:  session.DueDate,
			UserID:   user.ID,
			UserName: user.Name,
		})

	}
}

// slackevents is a minimal struct to parse Slack Events API payloads
type slackevents struct {
	Token     string `json:"token"`
	Challenge string `json:"challenge"`
	Type      string `json:"type"`
	Event     struct {
		Type    string `json:"type"`
		User    string `json:"user"`
		Text    string `json:"text"`
		Channel string `json:"channel"`
	} `json:"event"`
}
