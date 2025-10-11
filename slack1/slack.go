package slack1

import (
	"fmt"
	"log"
	"time"

	"github.com/slack-go/slack"
	"lagertool.com/main/config"
)

type BorrowSession struct {
	Stage    string
	Item     string
	Quantity int
	Source   string
	DueDate  time.Time
}

var Sessions = make(map[string]*BorrowSession)

func SetupSlack(cfg *config.Config) (*slack.Client, string) {
	if cfg.Slack.BotToken == "" {
		log.Fatal("SLACK_BOT_TOKEN not set")
	}
	fmt.Println("Bot token loaded.")

	api := slack.New(cfg.Slack.BotToken)

	authResp, err := api.AuthTest()
	if err != nil {
		log.Fatal(err)
	}
	return api, authResp.UserID
}

type Slackevents struct {
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
