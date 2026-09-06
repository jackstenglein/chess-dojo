package main

import (
	"context"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"testing"
)

type privateRepository struct{}

func (privateRepository) GetTrainingPrivacyUser(name string) (*database.User, error) {
	return &database.User{Username: name, TrainingVisibility: database.TrainingVisibilityPrivate}, nil
}
func (privateRepository) GetTrainingPrivacyFollower(string, string) (*database.FollowerEntry, error) {
	return nil, nil
}
func TestPrivateActivityDeniedBeforeDataAccess(t *testing.T) {
	oldPrivacy, oldRepo := privacyRepository, repository
	defer func() { privacyRepository, repository = oldPrivacy, oldRepo }()
	privacyRepository = privateRepository{}
	repository = nil
	response, err := handler(context.Background(), api.Request{PathParameters: map[string]string{"owner": "someone", "id": "old-entry", "year": "2024"}, Body: `{"content":"test"}`})
	if err != nil || response.StatusCode != 403 {
		t.Fatalf("got %+v, %v", response, err)
	}
	if response.Headers["Cache-Control"] != "private, no-store" {
		t.Fatal("missing cache control")
	}
}

func (r privateRepository) GetTrainingPrivacyUsers(names []string) ([]*database.User, error) {
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
