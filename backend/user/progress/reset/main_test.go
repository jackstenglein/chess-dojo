package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type fakeResetRepository struct {
	username string
	update   *database.UserUpdate
	user     *database.User
	err      error
}

func (r *fakeResetRepository) UpdateUser(username string, update *database.UserUpdate) (*database.User, error) {
	r.username = username
	r.update = update
	if r.err != nil {
		return nil, r.err
	}
	return r.user, nil
}

func resetEvent(username string, body string) api.Request {
	event := api.Request{
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			RequestID: "reset-progress-test",
		},
		Body: body,
	}

	if username != "" {
		event.RequestContext.Authorizer = &events.APIGatewayV2HTTPRequestContextAuthorizerDescription{
			JWT: &events.APIGatewayV2HTTPRequestContextAuthorizerJWTDescription{
				Claims: map[string]string{
					"cognito:username": username,
				},
			},
		}
	}

	return event
}

func TestHandlerResetsProgressForAuthenticatedUser(t *testing.T) {
	originalRepository := repository
	defer func() { repository = originalRepository }()

	fake := &fakeResetRepository{
		user: &database.User{
			Username:       "dojo-user",
			Progress:       map[string]*database.RequirementProgress{},
			MinutesSpent:   map[string]int{},
			TotalDojoScore: 0,
		},
	}
	repository = fake

	resp, err := Handler(context.Background(), resetEvent("dojo-user", `{"confirm":"confirm"}`))
	if err != nil {
		t.Fatalf("Handler returned error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("StatusCode = %d, want 200. Body: %s", resp.StatusCode, resp.Body)
	}
	if fake.username != "dojo-user" {
		t.Fatalf("UpdateUser username = %q, want dojo-user", fake.username)
	}
	if fake.update == nil {
		t.Fatal("UpdateUser update is nil")
	}
	if fake.update.Progress == nil || len(*fake.update.Progress) != 0 {
		t.Fatalf("Progress update = %#v, want empty map pointer", fake.update.Progress)
	}
	if fake.update.MinutesSpent == nil || len(*fake.update.MinutesSpent) != 0 {
		t.Fatalf("MinutesSpent update = %#v, want empty map pointer", fake.update.MinutesSpent)
	}
	if fake.update.TotalDojoScore == nil || *fake.update.TotalDojoScore != 0 {
		t.Fatalf("TotalDojoScore update = %#v, want pointer to 0", fake.update.TotalDojoScore)
	}

	var got database.User
	if err := json.Unmarshal([]byte(resp.Body), &got); err != nil {
		t.Fatalf("Failed to unmarshal response body: %v", err)
	}
	if got.Username != "dojo-user" {
		t.Fatalf("Response username = %q, want dojo-user", got.Username)
	}
}

func TestHandlerRejectsMissingUsername(t *testing.T) {
	originalRepository := repository
	defer func() { repository = originalRepository }()

	fake := &fakeResetRepository{}
	repository = fake

	resp, err := Handler(context.Background(), resetEvent("", `{"confirm":"confirm"}`))
	if err != nil {
		t.Fatalf("Handler returned error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Fatalf("StatusCode = %d, want 400. Body: %s", resp.StatusCode, resp.Body)
	}
	if fake.update != nil {
		t.Fatalf("UpdateUser should not be called, got %#v", fake.update)
	}
}

func TestHandlerRejectsMissingConfirm(t *testing.T) {
	originalRepository := repository
	defer func() { repository = originalRepository }()

	fake := &fakeResetRepository{}
	repository = fake

	resp, err := Handler(context.Background(), resetEvent("dojo-user", `{"confirm":"delete"}`))
	if err != nil {
		t.Fatalf("Handler returned error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Fatalf("StatusCode = %d, want 400. Body: %s", resp.StatusCode, resp.Body)
	}
	if fake.update != nil {
		t.Fatalf("UpdateUser should not be called, got %#v", fake.update)
	}
}
