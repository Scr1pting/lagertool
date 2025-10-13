package util

import (
	"fmt"
	"time"

	ics "github.com/arran4/golang-ical"
)

// GenerateICSContent creates the iCalendar content as a string for a single event.
// This content is ready to be written directly to an HTTP response.
func GenerateICSContent(summary, description string, start, end time.Time) string {
	// 1. Create a new iCalendar object
	cal := ics.NewCalendar()
	cal.SetMethod(ics.MethodPublish)

	// 2. Create a unique identifier for the event
	uid := fmt.Sprintf("%d-%s@yourdomain.com", time.Now().UnixNano(), "event")

	// 3. Create a new event component
	event := cal.AddEvent(uid)

	now := time.Now().UTC() // Use UTC for timestamps

	// Set the creation time properly
	event.SetCreatedTime(now)

	// DTSTAMP is when the data was generated (required)
	event.SetDtStampTime(now)

	// Set start and end
	event.SetStartAt(start)
	event.SetEndAt(end)

	// Descriptive fields
	event.SetSummary(summary)
	event.SetDescription(description)

	return cal.Serialize()
}

type Events struct {
	Start                time.Time
	End                  time.Time
	Summary, Description string
}

func GenerateICSForDates(
	events []Events,
) string {
	cal := ics.NewCalendar()
	cal.SetMethod(ics.MethodPublish)

	now := time.Now().UTC()

	for i, e := range events {
		// Unique ID for each event
		uid := fmt.Sprintf("%d-%d", now.UnixNano(), i)

		event := cal.AddEvent(uid)
		event.SetCreatedTime(now)
		event.SetDtStampTime(now)

		event.SetStartAt(e.Start)
		event.SetEndAt(e.End)

		event.SetSummary(e.Summary)
		event.SetDescription(e.Description)

	}

	return cal.Serialize()
}
