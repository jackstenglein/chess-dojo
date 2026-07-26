package main

import (
	"strings"
	"testing"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

func TestParseFiltersDefaultsToAllSessions(t *testing.T) {
	filters := parseFilters(map[string]string{})
	if len(filters.Sessions) != 1 || filters.Sessions[0] != SessionType_AllSessions {
		t.Fatalf("sessions = %#v, want [ALL_SESSIONS]", filters.Sessions)
	}
}

func TestParseFiltersCommaSeparated(t *testing.T) {
	filters := parseFilters(map[string]string{
		"sessions": "DOJO_EVENTS, MEETINGS",
		"types":    "CLASSICAL_GAME,BOOK_STUDY",
	})

	if len(filters.Sessions) != 2 {
		t.Fatalf("sessions len = %d, want 2", len(filters.Sessions))
	}
	if filters.Sessions[0] != SessionType_DojoEvents || filters.Sessions[1] != SessionType_Meetings {
		t.Fatalf("sessions = %#v", filters.Sessions)
	}
	if len(filters.Types) != 2 || filters.Types[0] != "CLASSICAL_GAME" {
		t.Fatalf("types = %#v", filters.Types)
	}
}

func TestIncludeInICS(t *testing.T) {
	user := &database.User{Username: "alice", DojoCohort: "1500-1600"}

	tests := []struct {
		name    string
		event   *database.Event
		filters Filters
		want    bool
	}{
		{
			name: "own meeting included",
			event: &database.Event{
				Type:         database.EventType_Availability,
				Owner:        "alice",
				Status:       database.SchedulingStatus_Booked,
				Participants: map[string]*database.Participant{"bob": {Username: "bob"}},
			},
			filters: Filters{Sessions: []SessionType{SessionType_AllSessions}},
			want:    true,
		},
		{
			name: "participating meeting included",
			event: &database.Event{
				Type:         database.EventType_Availability,
				Owner:        "bob",
				Status:       database.SchedulingStatus_Booked,
				Participants: map[string]*database.Participant{"alice": {Username: "alice"}},
			},
			filters: Filters{Sessions: []SessionType{SessionType_Meetings}},
			want:    true,
		},
		{
			name: "other availability included",
			event: &database.Event{
				Type:   database.EventType_Availability,
				Owner:  "bob",
				Status: database.SchedulingStatus_Scheduled,
			},
			filters: Filters{Sessions: []SessionType{SessionType_AllSessions}},
			want:    true,
		},
		{
			name: "own availability excluded by session filter",
			event: &database.Event{
				Type:   database.EventType_Availability,
				Owner:  "alice",
				Status: database.SchedulingStatus_Scheduled,
			},
			filters: Filters{Sessions: []SessionType{SessionType_Meetings}},
			want:    false,
		},
		{
			name: "dojo event included",
			event: &database.Event{
				Type:   database.EventType_Dojo,
				Owner:  "Sensei",
				Status: database.SchedulingStatus_Scheduled,
			},
			filters: Filters{Sessions: []SessionType{SessionType_DojoEvents}},
			want:    true,
		},
		{
			name: "liga included with all sessions",
			event: &database.Event{
				Type:   database.EventType_LigaTournament,
				Status: database.SchedulingStatus_Scheduled,
				LigaTournament: &database.LigaTournament{
					TimeControlType: database.TimeControlType_Blitz,
				},
			},
			filters: Filters{
				Sessions: []SessionType{SessionType_AllSessions},
			},
			want: true,
		},
		{
			name: "canceled excluded",
			event: &database.Event{
				Type:   database.EventType_Dojo,
				Status: database.SchedulingStatus_Canceled,
			},
			filters: Filters{Sessions: []SessionType{SessionType_AllSessions}},
			want:    false,
		},
		{
			name: "meeting type filter",
			event: &database.Event{
				Type:         database.EventType_Availability,
				Owner:        "bob",
				Status:       database.SchedulingStatus_Booked,
				BookedType:   "CLASSICAL_GAME",
				Participants: map[string]*database.Participant{"carol": {Username: "carol"}},
			},
			filters: Filters{
				Sessions: []SessionType{SessionType_Meetings},
				Types:    []database.AvailabilityType{"BOOK_STUDY"},
			},
			want: false,
		},
		{
			name: "meeting type filter ignored for owners",
			event: &database.Event{
				Type:         database.EventType_Availability,
				Owner:        "alice",
				Status:       database.SchedulingStatus_Booked,
				BookedType:   "CLASSICAL_GAME",
				Participants: map[string]*database.Participant{"bob": {Username: "bob"}},
			},
			filters: Filters{
				Sessions: []SessionType{SessionType_Meetings},
				Types:    []database.AvailabilityType{"BOOK_STUDY"},
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := includeInICS(tt.event, user, tt.filters)
			if got != tt.want {
				t.Fatalf("includeInICS = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatICS(t *testing.T) {
	user := &database.User{Username: "alice", DisplayName: "Alice"}
	start := time.Date(2026, 7, 20, 15, 0, 0, 0, time.UTC)
	end := start.Add(2 * time.Hour)

	events := []*database.Event{
		{
			Id:          "evt-1",
			Type:        database.EventType_Dojo,
			Title:       "Tuesday Training; Live",
			StartTime:   start.Format(time.RFC3339),
			EndTime:     end.Format(time.RFC3339),
			Location:    "https://zoom.example/join",
			Description: "Line1\nLine2",
			RRule:       "DTSTART:20260720T150000Z\nRRULE:FREQ=WEEKLY;COUNT=4",
			Status:      database.SchedulingStatus_Scheduled,
		},
		{
			Id:              "evt-2",
			Type:            database.EventType_Availability,
			Owner:           "alice",
			BookedStartTime: start.Format(time.RFC3339),
			StartTime:       start.Add(-time.Hour).Format(time.RFC3339),
			EndTime:         end.Format(time.RFC3339),
			MaxParticipants: 1,
			Participants:    map[string]*database.Participant{"bob": {Username: "bob"}},
			Status:          database.SchedulingStatus_Booked,
		},
	}

	ics := formatICS(events, user, "ChessDojo – Alice")

	required := []string{
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"X-WR-CALNAME:ChessDojo – Alice",
		"BEGIN:VEVENT",
		"UID:evt-1@chessdojo.club",
		"DTSTART:20260720T150000Z",
		"DTEND:20260720T170000Z",
		"SUMMARY:Tuesday Training\\; Live",
		"DESCRIPTION:Line1\\nLine2",
		"LOCATION:https://zoom.example/join",
		"RRULE:FREQ=WEEKLY;COUNT=4",
		"SUMMARY:Meeting",
		"UID:evt-2@chessdojo.club",
		"END:VCALENDAR",
	}
	for _, s := range required {
		if !strings.Contains(ics, s) {
			t.Fatalf("ICS missing %q\n%s", s, ics)
		}
	}
}

func TestIcsRRule(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"FREQ=WEEKLY;COUNT=4", "FREQ=WEEKLY;COUNT=4"},
		{"RRULE:FREQ=DAILY", "FREQ=DAILY"},
		{"DTSTART:20260720T150000Z\nRRULE:FREQ=WEEKLY;COUNT=4", "FREQ=WEEKLY;COUNT=4"},
	}
	for _, tt := range tests {
		if got := icsRRule(tt.in); got != tt.want {
			t.Fatalf("icsRRule(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
