package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type mockUserRepository struct {
	users map[string]*database.User
}

func (m *mockUserRepository) GetUser(username string) (*database.User, error) {
	user, ok := m.users[username]
	if !ok {
		return nil, errors.New(404, "Invalid request: user not found", "")
	}
	clone := *user
	return &clone, nil
}

func (m *mockUserRepository) UpdateUser(username string, update *database.UserUpdate) (*database.User, error) {
	user, ok := m.users[username]
	if !ok {
		return nil, errors.New(404, "Invalid request: user not found", "")
	}
	raw, err := json.Marshal(update)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, user); err != nil {
		return nil, err
	}
	clone := *user
	return &clone, nil
}

func (m *mockUserRepository) ListTimelineEntries(owner string, startKey string) ([]*database.TimelineEntry, string, error) {
	return nil, "", nil
}

func (m *mockUserRepository) PutTimelineEntries(entries []*database.TimelineEntry) (int, error) {
	return len(entries), nil
}

const testUsername = "test-updateUser"
const testEmail = "test@chess-dojo-scheduler.com"
const testName = "Test Name"

func setupSuite(t *testing.T) *mockUserRepository {
	t.Helper()
	repo := &mockUserRepository{
		users: map[string]*database.User{
			testUsername: {
				Username: testUsername,
				Email:    testEmail,
				Name:     testName,
			},
		},
	}
	original := repository
	repository = repo
	t.Cleanup(func() { repository = original })
	return repo
}

func getEvent(testName string, username string, update *database.UserUpdate) api.Request {
	body, _ := json.Marshal(update)

	return api.Request{
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			RequestID: testName,
			Authorizer: &events.APIGatewayV2HTTPRequestContextAuthorizerDescription{
				JWT: &events.APIGatewayV2HTTPRequestContextAuthorizerJWTDescription{
					Claims: map[string]string{
						"cognito:username": username,
					},
				},
			},
		},
		Body: string(body),
	}
}

func TestUpdateUser(t *testing.T) {
	repo := setupSuite(t)

	ctx := context.Background()

	table := []struct {
		name     string
		username string
		update   *database.UserUpdate
		wantCode int
		wantErr  bool
		wantUser *database.User
	}{
		{
			name:     "MissingUsername",
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "SuccessfulRequest",
			username: testUsername,
			update: &database.UserUpdate{
				DisplayName:  new("testDisplayName"),
				Bio:          new("testBio"),
				RatingSystem: (*database.RatingSystem)(aws.String(string(database.Fide))),
				// ChesscomUsername:                 aws.String("JackStenglein"),
				// LichessUsername:                  aws.String("JackStenglein"),
				// FideId:                           aws.String("1503014"),
				// UscfId:                           aws.String("31005525"),
				// StartChesscomRating:              aws.Int(1),
				// StartLichessRating:               aws.Int(2),
				// StartFideRating:                  aws.Int(3),
				// StartUscfRating:                  aws.Int(4),
				DojoCohort: (*database.DojoCohort)(new("2400+")),
			},
			wantCode: 200,
			wantUser: &database.User{
				Username:     testUsername,
				Email:        testEmail,
				Name:         testName,
				DisplayName:  "testDisplayName",
				Bio:          "testBio",
				RatingSystem: database.Fide,
				// ChesscomUsername:                 "JackStenglein",
				// LichessUsername:                  "JackStenglein",
				// FideId:                           "1503014",
				// UscfId:                           "31005525",
				// StartChesscomRating:              1,
				// StartLichessRating:               2,
				// StartFideRating:                  3,
				// StartUscfRating:                  4,
				DojoCohort: "2400+",
			},
		},
		{
			name:     "ProfaneBio",
			username: testUsername,
			update: &database.UserUpdate{
				Bio: new("This bio is shit"),
			},
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "cleanBio",
			username: testUsername,
			update: &database.UserUpdate{
				Bio: new("This bio is clean"),
			},
			wantCode: 200,
			wantUser: &database.User{
				Username:     testUsername,
				Email:        testEmail,
				Name:         testName,
				DisplayName:  "testDisplayName",
				Bio:          "This bio is clean",
				RatingSystem: database.Fide,
				DojoCohort:   "2400+",
			},
		},
		{
			name:     "BioWithAsSuch",
			username: testUsername,
			update: &database.UserUpdate{
				Bio: new("As such, I enjoy chess."),
			},
			wantCode: 200,
			wantUser: &database.User{
				Username:     testUsername,
				Email:        testEmail,
				Name:         testName,
				DisplayName:  "testDisplayName",
				Bio:          "As such, I enjoy chess.",
				RatingSystem: database.Fide,
				DojoCohort:   "2400+",
			},
		},
		{
			name:     "BioWithAsSold",
			username: testUsername,
			update: &database.UserUpdate{
				Bio: new("Sold as sold."),
			},
			wantCode: 200,
			wantUser: &database.User{
				Username:     testUsername,
				Email:        testEmail,
				Name:         testName,
				DisplayName:  "testDisplayName",
				Bio:          "Sold as sold.",
				RatingSystem: database.Fide,
				DojoCohort:   "2400+",
			},
		},
		{
			name:     "BioWithCommonAssSubstrings",
			username: testUsername,
			update: &database.UserUpdate{
				Bio: new("I enjoy classroom assessment and passage analysis."),
			},
			wantCode: 200,
			wantUser: &database.User{
				Username:     testUsername,
				Email:        testEmail,
				Name:         testName,
				DisplayName:  "testDisplayName",
				Bio:          "I enjoy classroom assessment and passage analysis.",
				RatingSystem: database.Fide,
				DojoCohort:   "2400+",
			},
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			event := getEvent(tc.name, tc.username, tc.update)
			got, err := Handler(ctx, event)

			if err != nil {
				t.Errorf("UpdateUser(%v) got err: %v", event, err)
			}

			if got.StatusCode != tc.wantCode {
				t.Errorf("UpdateUser(%v) response: %v", event, got)
				t.Fatalf("UpdateUser(%v) got status: %d; want status: %d", event, got.StatusCode, tc.wantCode)
			}

			if !tc.wantErr {
				gotUser, err := repo.GetUser(tc.username)
				if err != nil {
					t.Errorf("GetUser(%s) got err: %v", tc.username, err)
				}

				if diff := cmp.Diff(tc.wantUser, gotUser, cmpopts.EquateEmpty(), cmpopts.IgnoreFields(database.User{}, "CreatedAt", "UpdatedAt", "SearchKey")); diff != "" {
					t.Errorf("GetUser(%v) diff (-want +got):\n%s", event, diff)
				}
			}
		})
	}
}
