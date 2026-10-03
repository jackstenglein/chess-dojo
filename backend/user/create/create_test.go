package main

import (
	"context"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

const testUsername = "test-createUser"

func setupTest(t *testing.T) func(t *testing.T) {
	return func(t *testing.T) {
		err := database.DynamoDB.DeleteUser(testUsername)
		if err != nil {
			t.Errorf("Failed teardown: %v", err)
		}
	}
}

func getEvent(triggerSource, username, email, name string) Event {
	return Event{
		TriggerSource: triggerSource,
		UserName:      username,
		Request: events.CognitoEventUserPoolsPostConfirmationRequest{
			UserAttributes: map[string]string{
				"email": email,
				"name":  name,
			},
		},
	}
}

func TestIncorrectTriggerSource(t *testing.T) {
	ctx := context.Background()
	event := getEvent("", testUsername, "test@chess-dojo-scheduler.com", "Test Name")

	_, err := Handler(ctx, event)
	if err != nil {
		t.Errorf("Want nil err; got: %v", err)
	}
}

func TestMissingUsername(t *testing.T) {
	ctx := context.Background()
	event := getEvent(triggerSource, "", "test@chess-dojo-scheduler.com", "Test Name")

	_, err := Handler(ctx, event)
	if err == nil {
		t.Error("Want err, got nil")
	}
}

func TestMissingEmail(t *testing.T) {
	ctx := context.Background()
	event := getEvent(triggerSource, testUsername, "", "Test Name")

	_, err := Handler(ctx, event)
	if err == nil {
		t.Error("Want err, got nil")
	}
}

func TestMissingName(t *testing.T) {
	ctx := context.Background()
	event := getEvent(triggerSource, testUsername, "test@chess-dojo-scheduler.com", "")

	_, err := Handler(ctx, event)
	if err == nil {
		t.Error("Want err, got nil")
	}
}

func TestSuccessfulCreate(t *testing.T) {
	teardownTest := setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()
	event := getEvent(triggerSource, testUsername, "test@chess-dojo-scheduler.com", "Test Name")

	_, err := Handler(ctx, event)
	if err != nil {
		t.Errorf("Failed to create user: %v", err)
	}
}

func TestDoubleCreate(t *testing.T) {
	teardownTest := setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()
	event := getEvent(triggerSource, testUsername, "test@chess-dojo-scheduler.com", "Test Name")

	_, err := Handler(ctx, event)
	if err != nil {
		t.Errorf("Failed to create the first user: %v", err)
	}

	_, err = Handler(ctx, event)
	if err == nil {
		t.Error("Want err, got nil")
	}
}
