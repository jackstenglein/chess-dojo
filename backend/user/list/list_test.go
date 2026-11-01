package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type mockUserLister struct {
	usersByCohort map[database.DojoCohort][]*database.User
}

func (m *mockUserLister) ListUsersByCohort(cohort database.DojoCohort, startKey string) ([]*database.User, string, error) {
	if cohort == "STATISTICS" {
		return nil, "", errors.New(403, "Invalid request: cannot get cohort `STATISTICS`", "")
	}
	return m.usersByCohort[cohort], "", nil
}

func (m *mockUserLister) SearchUsers(query string, fields []string, startKey string) ([]*database.User, string, error) {
	return nil, "", nil
}

var goldenUser1 = &database.User{
	Username:        "test-listusers-golden1",
	DiscordUsername: "TestListUsers#1234",
	RatingSystem:    database.Lichess,
	// StartChesscomRating:   1400,
	// StartLichessRating:    1300,
	// StartFideRating:       1200,
	// StartUscfRating:       1100,
	// CurrentChesscomRating: 1400,
	// CurrentLichessRating:  1300,
	// CurrentFideRating:     1200,
	// CurrentUscfRating:     1100,
	DojoCohort:     "2200-2300",
	CreatedAt:      "2023-03-16T19:09:30Z",
	PreviousCohort: "2100-2200",
	UpdatedAt:      "2023-03-16T19:11:03Z",
}

var goldenUser2 = &database.User{
	Username:        "test-listusers-golden2",
	DiscordUsername: "TestListUsers#5678",
	RatingSystem:    database.Chesscom,
	// StartChesscomRating:   1500,
	// StartLichessRating:    1400,
	// StartFideRating:       1300,
	// StartUscfRating:       1200,
	// CurrentChesscomRating: 1500,
	// CurrentLichessRating:  1400,
	// CurrentFideRating:     1300,
	// CurrentUscfRating:     1200,
	DojoCohort: "2200-2300",
	CreatedAt:  "2023-03-16T19:09:30Z",
	UpdatedAt:  "2023-03-16T19:11:03Z",
}

func getEvent(testName, cohort, startKey string) api.Request {
	return api.Request{
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			RequestID: testName,
		},
		PathParameters: map[string]string{
			"cohort": cohort,
		},
		QueryStringParameters: map[string]string{
			"startKey": startKey,
		},
	}
}

func TestListUser(t *testing.T) {
	original := repository
	repository = &mockUserLister{
		usersByCohort: map[database.DojoCohort][]*database.User{
			"2200-2300": {goldenUser1, goldenUser2},
		},
	}
	t.Cleanup(func() { repository = original })

	ctx := context.Background()

	table := []struct {
		name      string
		cohort    string
		startKey  string
		wantCode  int
		wantErr   bool
		wantUsers []*database.User
	}{
		{
			name:     "MissingCohort",
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "NonexistentCohort",
			cohort:   "fakeCohort",
			wantCode: 200,
		},
		{
			name:      "Success",
			cohort:    "2200-2300",
			wantCode:  200,
			wantUsers: []*database.User{goldenUser1, goldenUser2},
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			event := getEvent(tc.name, tc.cohort, tc.startKey)
			got, err := Handler(ctx, event)

			if err != nil {
				t.Errorf("ListUsers(%v) got err: %v", event, err)
			}

			if got.StatusCode != tc.wantCode {
				t.Errorf("ListUsers(%v) response: %v", event, got)
				t.Fatalf("ListUsers(%v) got status: %d; want status: %d", event, got.StatusCode, tc.wantCode)
			}

			if !tc.wantErr {
				gotResp := &ListUsersResponse{}
				json.Unmarshal([]byte(got.Body), &gotResp)

				if diff := cmp.Diff(tc.wantUsers, gotResp.Users, cmpopts.EquateEmpty()); diff != "" {
					t.Errorf("ListUsers(%v) diff (-want +got):\n%s", event, diff)
				}
			}
		})
	}

}
