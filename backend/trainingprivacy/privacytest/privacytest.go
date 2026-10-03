// Package privacytest provides shared fakes for training privacy tests.
package privacytest

import (
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

// Users implements trainingprivacy.Repository.GetTrainingPrivacyUsers on top of a
// single-user lookup, skipping users that do not exist.
func Users(names []string, get func(string) (*database.User, error)) ([]*database.User, error) {
	result := make([]*database.User, 0, len(names))
	for _, name := range names {
		user, err := get(name)
		if err != nil {
			return nil, err
		}
		if user != nil {
			result = append(result, user)
		}
	}
	return result, nil
}

// PrivateRepository reports every user as Private with no followers.
type PrivateRepository struct{}

func (PrivateRepository) GetTrainingPrivacyUser(name string) (*database.User, error) {
	return &database.User{Username: name, TrainingVisibility: database.TrainingVisibilityPrivate, ShowTrainingTotals: true}, nil
}

func (r PrivateRepository) GetTrainingPrivacyUsers(names []string) ([]*database.User, error) {
	return Users(names, r.GetTrainingPrivacyUser)
}

func (PrivateRepository) GetTrainingPrivacyFollower(string, string) (*database.FollowerEntry, error) {
	return nil, nil
}

// RequireDenied fails the test unless the handler returned a non-cacheable 403.
func RequireDenied(t *testing.T, response api.Response, err error) {
	t.Helper()
	if err != nil || response.StatusCode != 403 {
		t.Fatalf("got %+v, %v", response, err)
	}
	if response.Headers["Cache-Control"] != "private, no-store" {
		t.Fatal("missing cache control")
	}
}
