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

const testUsername = "test-getUser"
const testEmail = "test@chess-dojo-scheduler.com"
const testName = "Test Name"

type mockUserStore struct {
	users map[string]*database.User
}

func (m *mockUserStore) GetUser(username string) (*database.User, error) {
	user, ok := m.users[username]
	if !ok {
		return nil, errors.New(404, "Invalid request: user not found", "")
	}
	clone := *user
	return &clone, nil
}

func (m *mockUserStore) CreateUser(username, email, name string, paymentInfo *database.PaymentInfo) (*database.User, error) {
	user := &database.User{
		Username:   username,
		Email:      email,
		Name:       name,
		DojoCohort: database.NoCohort,
		Progress:   map[string]*database.RequirementProgress{},
	}
	m.users[username] = user
	return user, nil
}

func setupSuite(t *testing.T) func() {
	t.Helper()
	original := repository
	repository = &mockUserStore{
		users: map[string]*database.User{
			testUsername: {
				Username:   testUsername,
				Email:      testEmail,
				Name:       testName,
				DojoCohort: database.NoCohort,
				Progress:   map[string]*database.RequirementProgress{},
			},
		},
	}
	return func() {
		repository = original
	}
}

func getEvent(testName string, username string, public bool) api.Request {
	if public {
		return api.Request{
			RequestContext: events.APIGatewayV2HTTPRequestContext{
				RequestID: testName,
			},
			PathParameters: map[string]string{
				"username": username,
			},
		}
	}

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
	}
}

func TestGetUser(t *testing.T) {
	teardownSuite := setupSuite(t)
	defer teardownSuite()

	ctx := context.Background()

	table := []struct {
		name     string
		username string
		public   bool
		wantCode int
		wantErr  bool
		wantUser *database.User
	}{
		{
			name:     "PublicMissingUsername",
			username: "",
			public:   true,
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "PrivateMissingUsername",
			username: "",
			public:   false,
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "PublicNonexistentUser",
			username: "nonexistentUser",
			public:   true,
			wantCode: 404,
			wantErr:  true,
		},
		{
			name:     "PublicSuccessfulRequest",
			username: testUsername,
			public:   true,
			wantCode: 200,
			wantUser: &database.User{
				Username:   testUsername,
				DojoCohort: database.NoCohort,
				Progress:   map[string]*database.RequirementProgress{},
			},
		},
		{
			name:     "PrivateSuccessfulRequest",
			username: testUsername,
			public:   false,
			wantCode: 200,
			wantUser: &database.User{
				Username:   testUsername,
				DojoCohort: database.NoCohort,
				Progress:   map[string]*database.RequirementProgress{},
			},
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			event := getEvent(tc.name, tc.username, tc.public)
			got, err := Handler(ctx, event)

			if err != nil {
				t.Errorf("GetUser(%v) got err: %v", event, err)
			}

			if got.StatusCode != tc.wantCode {
				t.Errorf("GetUser(%v) response: %v", event, got)
				t.Fatalf("GetUser(%v) got status: %d; want status: %d", event, got.StatusCode, tc.wantCode)
			}

			if !tc.wantErr {
				gotUser := &database.User{}
				json.Unmarshal([]byte(got.Body), gotUser)

				if diff := cmp.Diff(tc.wantUser, gotUser, cmpopts.IgnoreFields(database.User{}, "CreatedAt", "UpdatedAt")); diff != "" {
					t.Errorf("GetUser(%v) diff (-want +got):\n%s", event, diff)
				}
			}
		})
	}
}
