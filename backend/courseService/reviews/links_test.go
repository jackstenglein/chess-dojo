package main

import (
	"context"
	"encoding/json"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"testing"
)

func TestReviewLinkWhitelist(t *testing.T) {
	for _, text := range []string{
		"Helpful analysis of 1.e4 and 2.Nf3", "", "https://chessdojo.club/courses", "https://www.chess.com/analysis", "lichess.org/study/abc", "www.chessdojo.club", "See CHESS.COM and https://study.lichess.org/abc.", "[Study](https://lichess.org/study/abc)", "(https://chess.com/analysis).", "//chessdojo.club/courses", "https://chess.com./analysis",
	} {
		t.Run("allow "+text, func(t *testing.T) {
			if hasDisallowedReviewLinks(text) {
				t.Errorf("rejected %q", text)
			}
		})
	}
	for _, text := range []string{
		"https://example.com", "example.com/path", "www.example.com", "chess.com.evil.org", "fakechess.com", "https://chess.com@evil.org", "https://evil.org@chess.com", "//evil.org", "https://chess.com and evil.org", "[chess.com](https://evil.org)", "https://127.0.0.1", "127.0.0.1/review", "ftp://chess.com/file", "javascript:alert(1)", "mailto:test@chess.com", "https:chess.com", "https://chess.com\\@evil.org", "https://chеss.com", "evil.рф",
	} {
		t.Run("block "+text, func(t *testing.T) {
			if !hasDisallowedReviewLinks(text) {
				t.Errorf("accepted %q", text)
			}
		})
	}
}

func TestDisallowedLinksCannotBeSavedOrApproved(t *testing.T) {
	original := repository
	defer func() { repository = original }()
	repo := &reviewRepo{course: &database.Course{Id: "course"}, user: &database.User{PurchasedCourses: map[string]bool{"course": true}, IsAdmin: true}}
	repository = repo
	body, _ := json.Marshal(map[string]any{"rating": 5, "review": "See https://example.com"})
	resp, _ := handler(context.Background(), request("PUT", string(body), true))
	if resp.StatusCode != 400 || repo.review != nil {
		t.Fatal("disallowed link saved")
	}
	repo.review = &database.CourseReview{Username: "alice", UpdatedAt: "version", Review: "https://example.com", ModerationStatus: "PENDING"}
	resp, _ = handler(context.Background(), request("PATCH", `{"username":"alice","updatedAt":"version"}`, true))
	if resp.StatusCode != 400 || repo.review.ModerationStatus != "PENDING" {
		t.Fatal("admin approved a forbidden link")
	}
	repo.review.ModerationStatus = "APPROVED"
	resp, _ = handler(context.Background(), request("GET", "", false))
	var public struct {
		Reviews []database.CourseReview `json:"reviews"`
	}
	if err := json.Unmarshal([]byte(resp.Body), &public); err != nil || len(public.Reviews) != 1 || public.Reviews[0].Review != "" {
		t.Fatal("legacy external link exposed publicly")
	}

}
