package database

import (
	"testing"
	"time"
)

func TestFideRatingToRating_Valid(t *testing.T) {
	now := time.Date(2026, 7, 21, 0, 0, 0, 0, time.UTC)
	item := &FideRating{Id: "1503014", Rating: 2839, ExpiresAt: now.Add(24 * time.Hour).Unix()}

	rating, err := fideRatingToRating(item, now)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if rating.CurrentRating != 2839 {
		t.Errorf("expected rating 2839, got %d", rating.CurrentRating)
	}
}

func TestFideRatingToRating_UnratedIsZero(t *testing.T) {
	now := time.Date(2026, 7, 21, 0, 0, 0, 0, time.UTC)
	item := &FideRating{Id: "123", Rating: 0, ExpiresAt: now.Add(24 * time.Hour).Unix()}

	rating, err := fideRatingToRating(item, now)
	if err != nil {
		t.Fatalf("expected success for unrated player, got %v", err)
	}
	if rating.CurrentRating != 0 {
		t.Errorf("expected rating 0, got %d", rating.CurrentRating)
	}
}

func TestFideRatingToRating_ExpiredIsNotFound(t *testing.T) {
	now := time.Date(2026, 7, 21, 0, 0, 0, 0, time.UTC)
	for _, expiresAt := range []int64{now.Unix(), now.Add(-time.Hour).Unix()} {
		item := &FideRating{Id: "123", Rating: 2000, ExpiresAt: expiresAt}
		if _, err := fideRatingToRating(item, now); err == nil {
			t.Errorf("expected error for expiresAt=%d <= now", expiresAt)
		}
	}
}
