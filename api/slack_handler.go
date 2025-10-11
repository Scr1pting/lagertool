package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/slack-go/slack"
	"lagertool.com/main/db"
	"lagertool.com/main/slack1"
)

func (h *Handler) Events(c *gin.Context) {
	api, botID := slack1.SetupSlack(h.Cfg)
	var body slack1.Slackevents
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

		session, exists := slack1.Sessions[user]
		if !exists {
			session = &slack1.BorrowSession{Stage: "start"}
			slack1.Sessions[user] = session
		}

		handleMessage(h, api, channel, session, text, userInfo)
	}

	c.Status(http.StatusOK)
}

func (h *Handler) Interactivity(c *gin.Context) {
	// Slack sends the interaction payload as form data under the key "payload"
	api, _ := slack1.SetupSlack(h.Cfg)
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

	// Reuse the api client from outer scope (already initialized with config)

	user := callback.User.ID
	session, exists := slack1.Sessions[user]
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
			db.SlackBorrow(h.Cfg, db.Borrow{
				Item:     session.Item,
				Amount:   session.Quantity,
				Location: session.Source,
				DueDate:  session.DueDate,
				UserID:   user,
				UserName: userInfo.Name,
			})

			_, _, err = api.PostMessage(
				session.GroupChannel,
				slack.MsgOptionText(
					fmt.Sprintf(
						"<@%s> borrowed *%d %s* (due %s).",
						userInfo.ID,
						session.Quantity,
						session.Item,
						session.DueDate.Format("Jan 2"),
					),
					false,
				),
			)
			if err != nil {
				log.Println("Error posting to group:", err)
			}

			session.Stage = "awaiting_item"
		}
	}

	c.Status(http.StatusOK)
}

func (h *Handler) BorrowHandler(c *gin.Context) {
	// Parse the slash command payload
	slackClient, _ := slack1.SetupSlack(h.Cfg)

	s, err := slack.SlashCommandParse(c.Request)
	if err != nil {
		c.String(http.StatusInternalServerError, "parse error")
		return
	}
	userID := s.UserID
	channelID := s.ChannelID

	session := &slack1.BorrowSession{
		Stage:        "start",
		GroupChannel: channelID, // e.g., from SlashCommand or event.Channel
	}
	slack1.Sessions[userID] = session

	// 1️⃣ Respond ephemerally in the group
	response := slack.Msg{
		ResponseType: "ephemeral",
		Text:         "Got it! I’ll DM you to finish your borrow request.",
	}
	c.JSON(http.StatusOK, response)

	// 2️⃣ Open DM channel
	im, _, _, err := slackClient.OpenConversation(&slack.OpenConversationParameters{
		Users: []string{userID},
	})
	if err != nil {
		log.Println("open DM error:", err)
		return
	}

	dmID := im.ID

	// 3️⃣ Send DM to user
	_, _, err = slackClient.PostMessage(dmID, slack.MsgOptionText(
		fmt.Sprintf("Hey <@%s>! Let’s set up your borrow. What item do you need?", userID), false))
	if err != nil {
		log.Println("DM send error:", err)
	}
}

func handleMessage(h *Handler, api *slack.Client, channel string, session *slack1.BorrowSession, text string, user *slack.User) {
	switch session.Stage {
	case "start":
		api.PostMessage(channel, slack.MsgOptionText("Hi! What would you like to borrow? (just the item name)", false))
		session.Stage = "awaiting_item"

	case "awaiting_item":
		session.Item = text
		res, err := h.LocalSearchInventory(text)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Internal Error", false))
			return
		} else if len(res) == 0 {
			api.PostMessage(channel, slack.MsgOptionText("No item with this name found", false))
			return
		} else if res[0].ItemName != text {
			api.PostMessage(channel, slack.MsgOptionText(fmt.Sprintf("Did you meant %s? Then please correct it", res[0].ItemName), false))
			return
		}
		api.PostMessage(channel, slack.MsgOptionText("How many do you need?", false))
		session.Stage = "awaiting_quantity"

	case "awaiting_quantity":
		qty, err := strconv.Atoi(text)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Please enter a valid number.", false))
			return
		}
		res, err := h.LocalSearchItems(session.Item)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Internal Error", false))
			return
		}
		id := res[0].ID
		res2, err := h.LocalGetInventoryByItem(id)
		if err != nil {
			api.PostMessage(channel, slack.MsgOptionText("Internal Error", false))
			return
		}
		count := 0
		for _, inv := range res2 {
			count += inv.Amount
		}
		if count < qty {
			api.PostMessage(channel, slack.MsgOptionText("Not enough of that items in storage. Please enter a smaller amount", false))
			return
		}
		session.Quantity = qty
		api.PostMessage(channel, slack.MsgOptionText("From where do you want to borrow it? (Campus;Building;Room)", false))
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
		if dueDate.Before(time.Now()) {
			api.PostMessage(channel, slack.MsgOptionText("Please enter a date later than today", false))
			return
		}
		session.DueDate = dueDate
		api.PostMessage(channel, slack.MsgOptionText(
			fmt.Sprintf("✅ Got it! You want %d %s(s) from %s until %s. I’ll check and confirm!",
				session.Quantity, session.Item, session.Source, session.DueDate.Format("Jan 2, 2006")),
			false))
		api.PostMessage(channel, slack.MsgOptionText("Type 'confirm' to finalize.", false))
		session.Stage = "confirm"
	case "confirm":
		if strings.ToLower(text) == "confirm" {
			db.SlackBorrow(h.Cfg, db.Borrow{
				Item:     session.Item,
				Amount:   session.Quantity,
				Location: session.Source,
				DueDate:  session.DueDate,
				UserID:   user.ID,
				UserName: user.Name,
			})
			_, _, err := api.PostMessage(
				session.GroupChannel,
				slack.MsgOptionText(
					fmt.Sprintf(
						"<@%s> borrowed *%d %s* (due %s).",
						user.ID,
						session.Quantity,
						session.Item,
						session.DueDate.Format("Jan 2"),
					),
					false,
				),
			)
			if err != nil {
				log.Println("Error posting to group:", err)
			}

		}
		session.Stage = "awaiting_item"

	}
}
