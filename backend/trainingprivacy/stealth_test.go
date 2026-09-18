package trainingprivacy

import (
	"encoding/json"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"testing"
)

func TestTotalsAudienceMatrix(t *testing.T) {
	for _, visibility := range []database.TrainingVisibility{"", database.TrainingVisibilityPublic, database.TrainingVisibilityPrivate, database.TrainingVisibilityMembers, database.TrainingVisibilityMutuals, "INVALID"} {
		for _, sharing := range []bool{false, true} {
			for _, viewer := range []string{"", "owner", "free", "subscriber", "mutual", "oneway", "admin", "coach"} {
				r := fixture()
				r.users["owner"].TrainingVisibility = visibility
				r.users["owner"].ShowTrainingTotals = sharing
				access := New(r, viewer)
				details, err := access.CanView("owner")
				if err != nil {
					t.Fatal(err)
				}
				totals, err := access.CanViewTotals("owner")
				if err != nil || totals != (details || sharing && visibility.Valid()) {
					t.Fatalf("%s/%v/%s: totals=%v err=%v", visibility, sharing, viewer, totals, err)
				}
				if !details && access.Require("owner") == nil {
					t.Fatal("totals granted detail access")
				}
			}
		}
	}
}

func TestTotalsRedactionAndRevocation(t *testing.T) {
	for _, envelope := range []string{"", "users", "data", "scoreboard"} {
		r := fixture()
		r.users["owner"].TrainingVisibility = database.TrainingVisibilityPrivate
		for _, sharing := range []bool{true, false} {
			r.users["owner"].ShowTrainingTotals = sharing
			row := map[string]any{"username": "owner", "displayName": "Name", "canViewTrainingTotals": true}
			for _, field := range trainingFields {
				row[field] = "SECRET"
			}
			row["totalDojoScore"] = 42
			row["cohortDojoScore"] = 12
			row["minutesSpent"] = map[string]int{"ALL_TIME": 60, "ALL_COHORTS_ALL_TIME": 120, "LAST_7_DAYS": 30, "NON_DOJO": 20, "ALL_COHORTS_NON_DOJO": 40, "task-id": 50}
			var payload any = row
			if envelope != "" {
				payload = map[string]any{envelope: []any{row}, "lastEvaluatedKey": "next"}
			}
			response := New(r, "free").ProtectUsers(api.Success(payload))
			if response.StatusCode != 200 {
				t.Fatal(response.Body)
			}
			var body map[string]any
			if err := json.Unmarshal([]byte(response.Body), &body); err != nil {
				t.Fatal(err)
			}
			if envelope != "" {
				body = body[envelope].([]any)[0].(map[string]any)
			}
			if body["canViewTraining"] != false || body["canViewTrainingTotals"] != sharing {
				t.Fatal(body)
			}
			for _, field := range trainingFields {
				if sharing && (field == "totalDojoScore" || field == "cohortDojoScore" || field == "minutesSpent") {
					continue
				}
				if _, ok := body[field]; ok {
					t.Fatalf("leaked %s", field)
				}
			}
			if sharing {
				minutes := body["minutesSpent"].(map[string]any)
				if len(minutes) != 3 || minutes["ALL_COHORTS_ALL_TIME"] != float64(120) || body["cohortDojoScore"] != float64(12) {
					t.Fatal(body)
				}
			}
		}
	}
}
