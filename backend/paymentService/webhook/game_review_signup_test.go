package main

import (
	"testing"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type gameReviewSignupRepo struct {
	updateCalls              int
	updateIfNotReviewCalls   int
	updateIfNotGameReviewErr error
}

func (r *gameReviewSignupRepo) UpdateUser(username string, update *database.UserUpdate) (*database.User, error) {
	r.updateCalls++
	return &database.User{
		Username:           username,
		SubscriptionStatus: database.SubscriptionStatus(*update.SubscriptionStatus),
		SubscriptionTier:   database.SubscriptionTier(*update.SubscriptionTier),
	}, nil
}

func (r *gameReviewSignupRepo) UpdateUserIfNotGameReview(
	username string,
	update *database.UserUpdate,
) (*database.User, error) {
	r.updateIfNotReviewCalls++
	if r.updateIfNotGameReviewErr != nil {
		return nil, r.updateIfNotGameReviewErr
	}
	return &database.User{
		Username:           username,
		SubscriptionStatus: database.SubscriptionStatus(*update.SubscriptionStatus),
		SubscriptionTier:   database.SubscriptionTier(*update.SubscriptionTier),
	}, nil
}

func TestUpdateSubscriptionAndDetectGameReviewSignup(t *testing.T) {
	subscribed := string(database.SubscriptionStatus_Subscribed)
	gameReview := string(database.SubscriptionTier_GameReview)

	repo := &gameReviewSignupRepo{}
	update := &database.UserUpdate{
		SubscriptionStatus: &subscribed,
		SubscriptionTier:   &gameReview,
	}

	user, shouldNotify, err := updateSubscriptionAndDetectGameReviewSignup(repo, "dojo_user", update)
	if err != nil {
		t.Fatalf("updateSubscriptionAndDetectGameReviewSignup returned error: %v", err)
	}
	if !shouldNotify {
		t.Fatal("updateSubscriptionAndDetectGameReviewSignup returned shouldNotify=false, want true")
	}
	if user.GetSubscriptionTier() != database.SubscriptionTier_GameReview {
		t.Fatalf("updated user tier = %q, want %q", user.GetSubscriptionTier(), database.SubscriptionTier_GameReview)
	}
	if repo.updateIfNotReviewCalls != 1 {
		t.Fatalf("UpdateUserIfNotGameReview called %d times, want 1", repo.updateIfNotReviewCalls)
	}
	if repo.updateCalls != 0 {
		t.Fatalf("UpdateUser called %d times, want 0", repo.updateCalls)
	}
}

func TestUpdateSubscriptionAndDetectGameReviewSignupSkipsDuplicateNotification(t *testing.T) {
	subscribed := string(database.SubscriptionStatus_Subscribed)
	gameReview := string(database.SubscriptionTier_GameReview)
	conditionalErr := errors.Wrap(
		500,
		"Temporary server error",
		"DynamoDB UpdateItem failure",
		&dynamodb.ConditionalCheckFailedException{},
	)

	repo := &gameReviewSignupRepo{updateIfNotGameReviewErr: conditionalErr}
	update := &database.UserUpdate{
		SubscriptionStatus: &subscribed,
		SubscriptionTier:   &gameReview,
	}

	_, shouldNotify, err := updateSubscriptionAndDetectGameReviewSignup(repo, "dojo_user", update)
	if err != nil {
		t.Fatalf("updateSubscriptionAndDetectGameReviewSignup returned error: %v", err)
	}
	if shouldNotify {
		t.Fatal("updateSubscriptionAndDetectGameReviewSignup returned shouldNotify=true, want false")
	}
	if repo.updateIfNotReviewCalls != 1 {
		t.Fatalf("UpdateUserIfNotGameReview called %d times, want 1", repo.updateIfNotReviewCalls)
	}
	if repo.updateCalls != 1 {
		t.Fatalf("UpdateUser called %d times, want 1", repo.updateCalls)
	}
}

func TestUpdateSubscriptionAndDetectGameReviewSignupUsesNormalUpdateForOtherTiers(t *testing.T) {
	subscribed := string(database.SubscriptionStatus_Subscribed)
	basic := string(database.SubscriptionTier_Basic)

	repo := &gameReviewSignupRepo{}
	update := &database.UserUpdate{
		SubscriptionStatus: &subscribed,
		SubscriptionTier:   &basic,
	}

	_, shouldNotify, err := updateSubscriptionAndDetectGameReviewSignup(repo, "dojo_user", update)
	if err != nil {
		t.Fatalf("updateSubscriptionAndDetectGameReviewSignup returned error: %v", err)
	}
	if shouldNotify {
		t.Fatal("updateSubscriptionAndDetectGameReviewSignup returned shouldNotify=true, want false")
	}
	if repo.updateIfNotReviewCalls != 0 {
		t.Fatalf("UpdateUserIfNotGameReview called %d times, want 0", repo.updateIfNotReviewCalls)
	}
	if repo.updateCalls != 1 {
		t.Fatalf("UpdateUser called %d times, want 1", repo.updateCalls)
	}
}
