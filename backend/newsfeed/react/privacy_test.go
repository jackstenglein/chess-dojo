package main

import (
	"context"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy/privacytest"
)

func TestPrivateActivityDeniedBeforeDataAccess(t *testing.T) {
	oldPrivacy, oldRepo := privacyRepository, repository
	defer func() { privacyRepository, repository = oldPrivacy, oldRepo }()
	privacyRepository = privacytest.PrivateRepository{}
	repository = nil
	response, err := Handler(context.Background(), api.Request{PathParameters: map[string]string{"owner": "someone", "id": "old-entry", "year": "2024"}, Body: `{"content":"test"}`})
	privacytest.RequireDenied(t, response, err)
}
