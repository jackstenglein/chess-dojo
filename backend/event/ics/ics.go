package main

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

// SessionType mirrors frontend CalendarSessionType filter values.
type SessionType string

const (
	SessionType_AllSessions      SessionType = "ALL_SESSIONS"
	SessionType_Availabilities   SessionType = "AVAILABILITIES"
	SessionType_Meetings         SessionType = "MEETINGS"
	SessionType_DojoEvents       SessionType = "DOJO_EVENTS"
	SessionType_CoachingSessions SessionType = "COACHING_SESSIONS"
	SessionType_Lectures         SessionType = "LECTURE_TIER"
	SessionType_GameReviews      SessionType = "GAME_REVIEW_TIER"
	SessionType_LigaTournaments  SessionType = "LIGA_TOURNAMENTS"
)

// Filters are optional query filters for the ICS feed.
type Filters struct {
	Sessions []SessionType
	Types    []database.AvailabilityType
}

func parseCommaSeparated(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func parseFilters(query map[string]string) Filters {
	sessions := make([]SessionType, 0)
	for _, s := range parseCommaSeparated(query["sessions"]) {
		sessions = append(sessions, SessionType(s))
	}
	if len(sessions) == 0 {
		sessions = []SessionType{SessionType_AllSessions}
	}

	types := make([]database.AvailabilityType, 0)
	for _, t := range parseCommaSeparated(query["types"]) {
		types = append(types, database.AvailabilityType(t))
	}

	return Filters{
		Sessions: sessions,
		Types:    types,
	}
}

func (f Filters) allowsSession(session SessionType) bool {
	if len(f.Sessions) == 0 || f.Sessions[0] == SessionType_AllSessions {
		return true
	}
	return slices.Contains(f.Sessions, session)
}

// includeInICS returns whether the event should appear in the user's ICS feed.
// Other users' bookable availabilities are excluded (not useful in a personal calendar).
func includeInICS(event *database.Event, user *database.User, filters Filters) bool {
	if event.Status == database.SchedulingStatus_Canceled {
		return false
	}

	username := user.GetUsername()
	isOwner := event.Owner == username
	_, isParticipant := event.Participants[username]

	switch event.Type {
	case database.EventType_Availability:
		if (isOwner && len(event.Participants) > 0) || isParticipant {
			return filters.allowsSession(SessionType_Meetings)
		}
		if !filters.allowsSession(SessionType_Availabilities) {
			return false
		}
		if len(filters.Types) > 0 && filters.Types[0] != "ALL_TYPES" {
			if event.BookedType != "" {
				return containsAvailabilityType(filters.Types, event.BookedType)
			} else if len(event.Types) > 0 {
				return anyAvailabilityTypeMatch(filters.Types, event.Types)
			}
		}
		return true

	case database.EventType_Dojo:
		return filters.allowsSession(SessionType_DojoEvents)

	case database.EventType_LigaTournament:
		return filters.allowsSession(SessionType_LigaTournaments)

	case database.EventType_Coaching:
		return filters.allowsSession(SessionType_CoachingSessions)

	case database.EventType_LectureTier:
		return filters.allowsSession(SessionType_Lectures)

	case database.EventType_GameReviewTier:
		return filters.allowsSession(SessionType_GameReviews)
	}

	return false
}

func containsAvailabilityType(types []database.AvailabilityType, target database.AvailabilityType) bool {
	return slices.Contains(types, target)
}

func anyAvailabilityTypeMatch(filters, eventTypes []database.AvailabilityType) bool {
	for _, t := range eventTypes {
		if containsAvailabilityType(filters, t) {
			return true
		}
	}
	return false
}

func eventTitle(event *database.Event, username string) string {
	if event.Title != "" {
		return event.Title
	}

	switch event.Type {
	case database.EventType_Availability:
		if len(event.Participants) > 0 {
			if event.MaxParticipants == 1 {
				return "Meeting"
			}
			return fmt.Sprintf("Group Meeting (%d/%d)", len(event.Participants), event.MaxParticipants)
		}
		if event.Owner == username {
			if event.MaxParticipants == 1 {
				return "Available for 1:1"
			}
			return "Available for Group"
		}
	}

	if event.BookedType != "" {
		return event.BookedType.GetDisplayName()
	}
	return "ChessDojo Event"
}

// formatICS builds a VCALENDAR document for the given events.
func formatICS(events []*database.Event, user *database.User, calendarName string) string {
	var b strings.Builder
	b.WriteString("BEGIN:VCALENDAR\r\n")
	b.WriteString("VERSION:2.0\r\n")
	b.WriteString("PRODID:-//ChessDojo//Calendar//EN\r\n")
	b.WriteString("CALSCALE:GREGORIAN\r\n")
	b.WriteString("METHOD:PUBLISH\r\n")
	if calendarName != "" {
		b.WriteString("X-WR-CALNAME:")
		b.WriteString(escapeICSText(calendarName))
		b.WriteString("\r\n")
	}

	username := user.GetUsername()
	for _, event := range events {
		writeVEVENT(&b, event, username)
	}

	b.WriteString("END:VCALENDAR\r\n")
	return b.String()
}

func writeVEVENT(b *strings.Builder, event *database.Event, username string) {
	start, err := database.GetEventStart(event)
	if err != nil {
		return
	}
	if event.BookedStartTime != "" {
		if booked, bookedErr := time.Parse(time.RFC3339, event.BookedStartTime); bookedErr == nil {
			start = booked
		}
	}

	end, err := database.GetEventEnd(event)
	if err != nil {
		return
	}

	b.WriteString("BEGIN:VEVENT\r\n")
	b.WriteString("UID:")
	b.WriteString(event.Id)
	b.WriteString("@chessdojo.club\r\n")
	b.WriteString("DTSTAMP:")
	b.WriteString(formatICSTime(time.Now().UTC()))
	b.WriteString("\r\n")
	b.WriteString("DTSTART:")
	b.WriteString(formatICSTime(start.UTC()))
	b.WriteString("\r\n")
	b.WriteString("DTEND:")
	b.WriteString(formatICSTime(end.UTC()))
	b.WriteString("\r\n")
	b.WriteString("SUMMARY:")
	b.WriteString(escapeICSText(eventTitle(event, username)))
	b.WriteString("\r\n")

	if event.Description != "" {
		b.WriteString("DESCRIPTION:")
		b.WriteString(escapeICSText(event.Description))
		b.WriteString("\r\n")
	}
	if event.Location != "" {
		b.WriteString("LOCATION:")
		b.WriteString(escapeICSText(event.Location))
		b.WriteString("\r\n")
	}

	if rrule := icsRRule(event.RRule); rrule != "" {
		b.WriteString("RRULE:")
		b.WriteString(rrule)
		b.WriteString("\r\n")
	}

	b.WriteString("END:VEVENT\r\n")
}

func formatICSTime(t time.Time) string {
	return t.UTC().Format("20060102T150405Z")
}

// icsRRule extracts the RRULE value (without the RRULE: prefix) from a stored rrule string.
// Stored values may be produced by rrule.js optionsToString and can include DTSTART.
func icsRRule(stored string) string {
	stored = strings.TrimSpace(stored)
	if stored == "" {
		return ""
	}

	lines := strings.Split(stored, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		line = strings.TrimPrefix(line, "\r")
		upper := strings.ToUpper(line)
		if strings.HasPrefix(upper, "RRULE:") {
			return strings.TrimSpace(line[len("RRULE:"):])
		}
	}

	// Bare RRULE body (e.g. FREQ=WEEKLY;COUNT=10)
	if strings.HasPrefix(strings.ToUpper(stored), "FREQ=") {
		return stored
	}
	return ""
}

func escapeICSText(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, ";", `\;`)
	s = strings.ReplaceAll(s, ",", `\,`)
	s = strings.ReplaceAll(s, "\r\n", `\n`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	return s
}
