package visibility

import (
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

func TestShouldRemoveAvailabilityInviteOnly(t *testing.T) {
	user := &database.User{Username: "alice", DojoCohort: "1500-1600"}
	event := &database.Event{
		Type:       database.EventType_Availability,
		Owner:      "bob",
		Status:     database.SchedulingStatus_Scheduled,
		InviteOnly: true,
		Cohorts:    []database.DojoCohort{"1500-1600"},
	}

	if !ShouldRemoveEvent(event, user) {
		t.Fatal("expected invite-only availability to be removed")
	}

	event.Invited = []database.Participant{{Username: "alice"}}
	if ShouldRemoveEvent(event, user) {
		t.Fatal("expected invited user to see availability")
	}
}

func TestShouldHideCoachingLocationUntilPaid(t *testing.T) {
	user := &database.User{Username: "alice"}
	event := &database.Event{
		Type:         database.EventType_Coaching,
		Owner:        "coach",
		Participants: map[string]*database.Participant{"alice": {Username: "alice", HasPaid: false}},
	}

	if !ShouldHideEventDetails(event, user) {
		t.Fatal("expected unpaid coaching location to be hidden")
	}

	event.Participants["alice"].HasPaid = true
	if ShouldHideEventDetails(event, user) {
		t.Fatal("expected paid coaching location to be visible")
	}
}
