// Package visibility contains shared calendar event visibility helpers.
package visibility

import (
	"slices"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

// ShouldRemoveEvent returns true if the event should be hidden from the given user.
func ShouldRemoveEvent(event *database.Event, user *database.User) bool {
	if user.GetIsCalendarAdmin() {
		return false
	}

	if event.Owner == user.GetUsername() {
		return false
	}

	switch event.Type {
	case database.EventType_Availability:
		return shouldRemoveAvailability(event, user)
	case database.EventType_Dojo:
		return shouldRemoveDojo(event, user)
	case database.EventType_Coaching:
		return shouldRemoveCoaching(event, user)
	case database.EventType_GameReviewTier:
		return shouldRemoveGameReview(event, user)
	}

	return false
}

func shouldRemoveAvailability(event *database.Event, user *database.User) bool {
	if _, ok := event.Participants[user.GetUsername()]; ok {
		return false
	}

	if event.Status != database.SchedulingStatus_Scheduled {
		return true
	}

	if slices.ContainsFunc(
		event.Invited,
		func(p database.Participant) bool {
			return p.Username == user.GetUsername()
		}) {
		return false
	} else if event.InviteOnly {
		return true
	}

	if len(event.Cohorts) > 0 && !slices.Contains(event.Cohorts, user.GetCohort()) {
		return true
	}

	return false
}

func shouldRemoveDojo(event *database.Event, user *database.User) bool {
	if len(event.Cohorts) > 0 && !slices.Contains(event.Cohorts, user.GetCohort()) {
		return true
	}
	return false
}

func shouldRemoveCoaching(event *database.Event, user *database.User) bool {
	if _, ok := event.Participants[user.GetUsername()]; ok {
		return false
	}

	if len(event.Cohorts) > 0 && !slices.Contains(event.Cohorts, user.GetCohort()) {
		return true
	}
	if event.Coaching != nil && !event.Coaching.BookableByFreeUsers && user.GetSubscriptionStatus() != database.SubscriptionStatus_Subscribed {
		return true
	}
	if event.Status != database.SchedulingStatus_Scheduled {
		return true
	}

	return false
}

func shouldRemoveGameReview(event *database.Event, user *database.User) bool {
	if user.GetSubscriptionTier() != database.SubscriptionTier_GameReview {
		return false
	}
	return user.GameReviewCohortId != event.GameReviewCohortId
}

// ShouldHideEventDetails returns true if location/messages should be hidden from the user.
func ShouldHideEventDetails(event *database.Event, user *database.User) bool {
	if user.GetIsCalendarAdmin() {
		return false
	}

	username := user.GetUsername()
	if event.Owner == username {
		return false
	}

	isGameReviewTier := user.GetSubscriptionTier() == database.SubscriptionTier_GameReview
	isLectureTier := isGameReviewTier || (user.GetSubscriptionTier() == database.SubscriptionTier_Lecture)

	p := event.Participants[username]
	switch event.Type {
	case database.EventType_Coaching:
		return p == nil || !p.HasPaid

	case database.EventType_GameReviewTier:
		return !isGameReviewTier

	case database.EventType_LectureTier:
		return !isLectureTier

	default:
		return false
	}
}
