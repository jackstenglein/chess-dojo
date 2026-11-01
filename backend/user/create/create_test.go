package main

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

const testUsername = "test-createUser"

type mockUserCreator struct {
	users map[string]*database.User
}

func (m *mockUserCreator) CreateUser(username, email, name string, paymentInfo *database.PaymentInfo) (*database.User, error) {
	if _, ok := m.users[username]; ok {
		return nil, errors.New("user already exists")
	}
	user := &database.User{Username: username, Email: email, Name: name, PaymentInfo: paymentInfo}
	m.users[username] = user
	return user, nil
}

func setupTest(t *testing.T) {
	t.Helper()
	originalRepo := repository
	originalCheck := isEmailForbidden
	repository = &mockUserCreator{users: map[string]*database.User{}}
	isEmailForbidden = func(email string, timeout time.Duration) (bool, error) {
		return true, nil
	}
	t.Cleanup(func() {
		repository = originalRepo
		isEmailForbidden = originalCheck
	})
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
	setupTest(t)

	ctx := context.Background()
	event := getEvent(triggerSource, testUsername, "test@chess-dojo-scheduler.com", "Test Name")

	_, err := Handler(ctx, event)
	if err != nil {
		t.Errorf("Failed to create user: %v", err)
	}
}

func TestDoubleCreate(t *testing.T) {
	setupTest(t)

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
