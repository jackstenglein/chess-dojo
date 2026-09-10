package trainingprivacy

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type fakeRepository struct {
	users   map[string]*database.User
	follows map[string]bool
	fail    bool
}

func (r *fakeRepository) GetTrainingPrivacyUser(name string) (*database.User, error) {
	if r.fail {
		return nil, fmt.Errorf("lookup failed")
	}
	return r.users[name], nil
}
func (r *fakeRepository) GetTrainingPrivacyFollower(poster, follower string) (*database.FollowerEntry, error) {
	if r.fail {
		return nil, fmt.Errorf("lookup failed")
	}
	if r.follows[poster+"/"+follower] {
		return &database.FollowerEntry{}, nil
	}
	return nil, nil
}
func fixture() *fakeRepository {
	return &fakeRepository{users: map[string]*database.User{
		"owner":      {Username: "owner"},
		"free":       {Username: "free"},
		"subscriber": {Username: "subscriber", SubscriptionStatus: database.SubscriptionStatus_Subscribed},
		"mutual":     {Username: "mutual"},
		"oneway":     {Username: "oneway"},
		"admin":      {Username: "admin", IsAdmin: true},
		"coach":      {Username: "coach", IsCoach: true},
	}, follows: map[string]bool{"owner/mutual": true, "mutual/owner": true, "owner/oneway": true}}
}

func TestAudienceMatrix(t *testing.T) {
	for _, visibility := range []database.TrainingVisibility{"", database.TrainingVisibilityPublic, database.TrainingVisibilityMembers, database.TrainingVisibilityMutuals, database.TrainingVisibilityPrivate, "INVALID"} {
		for _, viewer := range []string{"", "owner", "free", "subscriber", "oneway", "mutual", "admin", "coach"} {
			t.Run(string(visibility)+"/"+viewer, func(t *testing.T) {
				r := fixture()
				r.users["owner"].TrainingVisibility = visibility
				want := visibility == "" || visibility == database.TrainingVisibilityPublic || viewer == "owner" || viewer == "admin" || (visibility == database.TrainingVisibilityMembers && viewer == "subscriber") || (visibility == database.TrainingVisibilityMutuals && viewer == "mutual")
				got, err := New(r, viewer).CanView("owner")
				if err != nil || got != want {
					t.Fatalf("got %v, %v; want %v", got, err, want)
				}
			})
		}
	}
}

func TestCurrentPolicyAndRelationships(t *testing.T) {
	r := fixture()
	check := func(viewer string, want bool) {
		t.Helper()
		got, err := New(r, viewer).CanView("owner")
		if err != nil || got != want {
			t.Fatalf("got %v, %v; want %v", got, err, want)
		}
	}
	check("free", true)
	r.users["owner"].TrainingVisibility = database.TrainingVisibilityPrivate
	check("free", false)
	r.users["owner"].TrainingVisibility = database.TrainingVisibilityPublic
	check("free", true)
	r.users["owner"].TrainingVisibility = database.TrainingVisibilityMutuals
	check("mutual", true)
	delete(r.follows, "owner/mutual")
	check("mutual", false)
	r.follows["owner/mutual"] = true
	delete(r.follows, "mutual/owner")
	check("mutual", false)
	r.users["owner"].TrainingVisibility = database.TrainingVisibilityMembers
	check("subscriber", true)
	r.users["subscriber"].SubscriptionStatus = database.SubscriptionStatus_Canceled
	check("subscriber", false)
}

func TestRedactionRetainsIdentityAndRemovesTraining(t *testing.T) {
	for _, envelope := range []string{"", "users", "data", "scoreboard"} {
		t.Run(envelope, func(t *testing.T) {
			r := fixture()
			r.users["owner"].TrainingVisibility = database.TrainingVisibilityPrivate
			row := map[string]any{"username": "owner", "displayName": "Visible name", "dojoCohort": "1200-1300", "ratings": map[string]any{"FIDE": 1234}}
			for _, field := range trainingFields {
				row[field] = "SECRET"
			}
			var payload any = row
			if envelope != "" {
				payload = map[string]any{envelope: []any{row}, "lastEvaluatedKey": "next"}
			}
			resp := New(r, "free").ProtectUsers(api.Success(payload))
			if resp.StatusCode != 200 || resp.Headers["Cache-Control"] != "private, no-store" {
				t.Fatalf("bad response: %+v", resp)
			}
			var body map[string]any
			_ = json.Unmarshal([]byte(resp.Body), &body)
			if envelope != "" {
				if body["lastEvaluatedKey"] != "next" {
					t.Fatal("lost cursor")
				}
				body = body[envelope].([]any)[0].(map[string]any)
			}
			if body["displayName"] != "Visible name" || body["canViewTraining"] != false || body["ratings"] == nil {
				t.Fatal("lost basic information or access flag")
			}
			for _, field := range trainingFields {
				if _, ok := body[field]; ok {
					t.Errorf("leaked %s", field)
				}
			}
			if row["progress"] != "SECRET" {
				t.Fatal("mutated original object")
			}
		})
	}
}

func TestHistoricalEntriesAndFailures(t *testing.T) {
	r := fixture()
	r.users["owner"].TrainingVisibility = database.TrainingVisibilityPrivate
	entries := []database.TimelineEntry{{TimelineEntryKey: database.TimelineEntryKey{Owner: "owner"}}}
	visible, err := Filter(New(r, "free"), entries, func(e database.TimelineEntry) string { return e.Owner })
	if err != nil || len(visible) != 0 {
		t.Fatal("private historical entry exposed")
	}
	if err := New(r, "free").Require("owner"); err == nil {
		t.Fatal("detail access allowed")
	}
	r.fail = true
	if _, err := New(r, "free").CanView("owner"); err == nil {
		t.Fatal("lookup failure allowed access")
	}
	resp := New(r, "free").ProtectUsers(api.Success(map[string]any{"username": "owner", "progress": "secret"}))
	if resp.StatusCode == 200 {
		t.Fatal("lookup failure returned user data")
	}
}

func TestMissingPolicyNeverDefaultsToPublic(t *testing.T) {
	r := fixture()
	delete(r.users, "owner")
	resp := New(r, "free").ProtectUsers(api.Success([]any{map[string]any{"username": "owner", "progress": "secret"}}))
	var rows []map[string]any
	if err := json.Unmarshal([]byte(resp.Body), &rows); err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0]["canViewTraining"] != false || rows[0]["progress"] != nil {
		t.Fatal("missing policy exposed data")
	}
}

func TestVisibilityValidation(t *testing.T) {
	for _, value := range []database.TrainingVisibility{database.TrainingVisibilityPublic, database.TrainingVisibilityMembers, database.TrainingVisibilityMutuals, database.TrainingVisibilityPrivate} {
		if !value.Valid() {
			t.Errorf("rejected %s", value)
		}
	}
	for _, value := range []database.TrainingVisibility{"", "public", "FRIENDS"} {
		if value.Valid() {
			t.Errorf("accepted %s", value)
		}
	}
}

func (r *fakeRepository) GetTrainingPrivacyUsers(names []string) ([]*database.User, error) {
	result := make([]*database.User, 0, len(names))
	for _, name := range names {
		user, err := r.GetTrainingPrivacyUser(name)
		if err != nil {
			return nil, err
		}
		if user != nil {
			result = append(result, user)
		}
	}
	return result, nil
}
