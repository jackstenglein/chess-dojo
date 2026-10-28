package main

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type reviewRepo struct {
	user    *database.User
	course  *database.Course
	review  *database.CourseReview
	deleted string
}

func (r *reviewRepo) GetCourse(_, _ string) (*database.Course, error) { return r.course, nil }
func (r *reviewRepo) GetUser(_ string) (*database.User, error)        { return r.user, nil }
func (r *reviewRepo) ListCourseReviews(_, _ string) ([]database.CourseReview, string, error) {
	reviews := []database.CourseReview{}
	if r.review != nil {
		reviews = append(reviews, *r.review)
	}
	return reviews, "", nil
}
func (r *reviewRepo) GetCourseReview(_, _ string) (*database.CourseReview, error) {
	return r.review, nil
}
func (r *reviewRepo) SaveCourseReview(review *database.CourseReview) error {
	r.review = review
	return nil
}
func (r *reviewRepo) DeleteCourseReview(_, username string) error {
	r.deleted = username
	r.review = nil
	return nil
}
func (r *reviewRepo) ApproveCourseReview(_, username, version string) error {
	if r.review == nil || r.review.Username != username || r.review.UpdatedAt != version {
		return errors.New(409, "Review changed", "")
	}
	r.review.ModerationStatus = "APPROVED"
	return nil
}
func request(method, body string, signedIn bool) api.Request {
	event := api.Request{PathParameters: map[string]string{"type": "OPENING", "id": "course"}, Body: body}
	event.RequestContext.HTTP.Method = method
	if signedIn {
		event.RequestContext.Authorizer = &events.APIGatewayV2HTTPRequestContextAuthorizerDescription{JWT: &events.APIGatewayV2HTTPRequestContextAuthorizerJWTDescription{Claims: map[string]string{"cognito:username": "alice"}}}
	}
	return event
}
func TestEligibility(t *testing.T) {
	for _, tc := range []struct {
		name    string
		user    *database.User
		allowed bool
	}{
		{"anonymous", nil, false},
		{"free", &database.User{}, false},
		{"core", &database.User{SubscriptionStatus: database.SubscriptionStatus_Subscribed, SubscriptionTier: database.SubscriptionTier_Basic}, true},
		{"lecture", &database.User{SubscriptionStatus: database.SubscriptionStatus_Subscribed, SubscriptionTier: database.SubscriptionTier_Lecture}, true},
		{"game review", &database.User{SubscriptionStatus: database.SubscriptionStatus_Subscribed, SubscriptionTier: database.SubscriptionTier_GameReview}, true},
		{"legacy paid", &database.User{SubscriptionStatus: database.SubscriptionStatus_Subscribed}, true},
		{"expired", &database.User{SubscriptionStatus: database.SubscriptionStatus_Canceled, SubscriptionTier: database.SubscriptionTier_Basic}, false},
		{"purchaser", &database.User{PurchasedCourses: map[string]bool{"course": true}}, true},
		{"other course", &database.User{PurchasedCourses: map[string]bool{"other": true}}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if actual := database.CanReviewCourse(tc.user, &database.Course{Id: "course"}); actual != tc.allowed {
				t.Fatalf("got %v, want %v", actual, tc.allowed)
			}
		})
	}
}
func TestReviewHandler(t *testing.T) {
	original := repository
	defer func() { repository = original }()
	repo := &reviewRepo{course: &database.Course{Id: "course"}, user: &database.User{PurchasedCourses: map[string]bool{"course": true}, DisplayName: "Alice"}}
	repository = repo
	for _, body := range []string{`{"rating":4,"review":"Helpful course"}`, `{"rating":5,"review":"  Great course!  ","username":"someone-else"}`} {
		resp, err := handler(context.Background(), request("PUT", body, true))
		if err != nil || resp.StatusCode != 200 {
			t.Fatalf("save: %v %v", resp, err)
		}
		if repo.review.Username != "alice" || repo.review.CourseKey != "OPENING/course" {
			t.Fatal("must use authenticated identity and route")
		}
	}
	if repo.review.Review != "Great course!" {
		t.Fatal("review should be trimmed")
	}
	for _, body := range []string{`{}`, `{"rating":4}`, `{"rating":4,"review":""}`, `{"rating":4,"review":"   \n\t "}`, `{"rating":0}`, `{"rating":6}`, `{"rating":2.5}`, `{"rating":3,"review":"` + strings.Repeat("a", 5001) + `"}`, `invalid`} {
		resp, _ := handler(context.Background(), request("PUT", body, true))
		if resp.StatusCode != 400 {
			t.Fatalf("invalid input returned %d", resp.StatusCode)
		}
	}
	resp, _ := handler(context.Background(), request("GET", "", false))
	var data struct {
		Reviews   []database.CourseReview `json:"reviews"`
		Own       *database.CourseReview  `json:"ownReview"`
		CanReview bool                    `json:"canReview"`
	}
	if err := json.Unmarshal([]byte(resp.Body), &data); err != nil || len(data.Reviews) != 1 || data.Own != nil || data.CanReview {
		t.Fatalf("public list: %s", resp.Body)
	}
	resp, _ = handler(context.Background(), request("PUT", `{"rating":4}`, false))
	if resp.StatusCode != 401 {
		t.Fatal("anonymous write allowed")
	}
	repo.user = &database.User{}
	resp, _ = handler(context.Background(), request("PUT", `{"rating":4}`, true))
	if resp.StatusCode != 403 {
		t.Fatal("free user write allowed")
	}
	resp, _ = handler(context.Background(), request("DELETE", "", true))
	if resp.StatusCode != 200 || repo.deleted != "alice" {
		t.Fatal("must allow owner to remove after expiry")
	}
	repo.course.Status = database.CourseStatusDraft
	resp, _ = handler(context.Background(), request("GET", "", false))
	if resp.StatusCode != 404 {
		t.Fatal("draft reviews leaked")
	}
}

func TestModeration(t *testing.T) {
	original := repository
	defer func() { repository = original }()
	repo := &reviewRepo{course: &database.Course{Id: "course"}, user: &database.User{PurchasedCourses: map[string]bool{"course": true}}}
	repository = repo
	for _, text := range []string{"This is fucking awful", "porn videos", "f.u.c.k"} {
		body, _ := json.Marshal(map[string]any{"rating": 4, "review": text})
		resp, _ := handler(context.Background(), request("PUT", string(body), true))
		if resp.StatusCode != 400 || repo.review != nil {
			t.Fatalf("inappropriate content saved: %d", resp.StatusCode)
		}
	}
	resp, _ := handler(context.Background(), request("PUT", `{"rating":4,"review":"Helpful course","moderationStatus":"APPROVED"}`, true))
	if resp.StatusCode != 200 || repo.review.ModerationStatus != "PENDING" {
		t.Fatal("cannot self-approve text")
	}
	version := repo.review.UpdatedAt
	resp, _ = handler(context.Background(), request("GET", "", false))
	var public struct {
		Reviews []database.CourseReview `json:"reviews"`
	}
	json.Unmarshal([]byte(resp.Body), &public)
	if len(public.Reviews) != 1 || public.Reviews[0].Review != "" || public.Reviews[0].Rating != 4 {
		t.Fatal("pending text leaked or rating hidden")
	}
	body, _ := json.Marshal(map[string]string{"username": "alice", "updatedAt": version})
	resp, _ = handler(context.Background(), request("PATCH", string(body), true))
	if resp.StatusCode != 403 {
		t.Fatal("non-admin approval allowed")
	}
	req := request("DELETE", "", true)
	req.QueryStringParameters = map[string]string{"username": "bob"}
	resp, _ = handler(context.Background(), req)
	if resp.StatusCode != 403 || repo.review == nil {
		t.Fatal("non-admin deleted another review")
	}
	repo.user.IsAdmin = true
	resp, _ = handler(context.Background(), request("PATCH", `{"username":"alice","updatedAt":"old"}`, true))
	if resp.StatusCode != 409 {
		t.Fatal("stale approval accepted")
	}
	resp, _ = handler(context.Background(), request("PATCH", string(body), true))
	if resp.StatusCode != 200 || repo.review.ModerationStatus != "APPROVED" {
		t.Fatal("admin approval failed")
	}
	resp, _ = handler(context.Background(), request("GET", "", false))
	json.Unmarshal([]byte(resp.Body), &public)
	if public.Reviews[0].Review != "Helpful course" {
		t.Fatal("approved text hidden")
	}
	resp, _ = handler(context.Background(), request("PUT", `{"rating":4,"review":"Edited review"}`, true))
	if resp.StatusCode != 200 || repo.review.ModerationStatus != "PENDING" {
		t.Fatal("edit bypassed moderation")
	}
	req.QueryStringParameters["username"] = "alice"
	req.RequestContext.Authorizer.JWT.Claims["cognito:username"] = "admin"
	resp, _ = handler(context.Background(), req)
	if resp.StatusCode != 200 || repo.deleted != "alice" {
		t.Fatal("admin deletion failed")
	}
}

func TestModerationAllowsChessVocabulary(t *testing.T) {
	for _, text := range []string{"Helpful analysis of passed pawns", "A classical approach to the position", "Excellent class on pawn structures"} {
		if profanityDetector.IsProfane(text) {
			t.Errorf("false positive for %q", text)
		}
	}
}
