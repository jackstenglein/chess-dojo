package main

import (
	"context"
	"encoding/json"
	"strings"
	"time"
	"unicode/utf8"

	goaway "github.com/TwiN/go-away"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository database.CourseReviewRepository = database.DynamoDB

var profanityDetector = goaway.NewProfanityDetector()

func main() { lambda.Start(handler) }
func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	courseType, id := event.PathParameters["type"], event.PathParameters["id"]
	if courseType == "" || id == "" {
		return api.Failure(errors.New(400, "Course type and id are required", "")), nil
	}
	course, err := repository.GetCourse(courseType, id)
	if err != nil {
		return api.Failure(err), nil
	}
	if !course.IsPublished() {
		return api.Failure(errors.New(404, "Course not found", "")), nil
	}
	key := courseType + "/" + id
	username := api.GetUserInfo(event).Username
	var user *database.User
	if username != "" {
		user, err = repository.GetUser(username)
		if err != nil {
			return api.Failure(err), nil
		}
	}
	switch event.RequestContext.HTTP.Method {
	case "GET":
		reviews, next, err := repository.ListCourseReviews(key, event.QueryStringParameters["startKey"])
		if err != nil {
			return api.Failure(err), nil
		}
		var own *database.CourseReview
		if username != "" {
			own, err = repository.GetCourseReview(key, username)
			if err != nil {
				return api.Failure(err), nil
			}
		}
		// Pending text is visible only to its author and administrators. Stars still count.
		for i := range reviews {
			if (reviews[i].ModerationStatus != "APPROVED" || hasDisallowedReviewLinks(reviews[i].Review)) && !(user != nil && user.IsAdmin) && reviews[i].Username != username {
				reviews[i].Review = ""
			}
		}
		return api.Success(map[string]any{"canModerate": (user != nil && user.IsAdmin), "reviews": reviews, "lastEvaluatedKey": next, "ownReview": own, "canReview": database.CanReviewCourse(user, course)}), nil
	case "PATCH":
		if user == nil || !user.IsAdmin {
			return api.Failure(errors.New(403, "Administrator access required", "")), nil
		}
		var input struct {
			Username  string `json:"username"`
			UpdatedAt string `json:"updatedAt"`
		}
		if err := json.Unmarshal([]byte(event.Body), &input); err != nil || input.Username == "" || input.UpdatedAt == "" {
			return api.Failure(errors.New(400, "Review author and version are required", "")), nil
		}
		pending, err := repository.GetCourseReview(key, input.Username)
		if err != nil {
			return api.Failure(err), nil
		}
		if pending == nil {
			return api.Failure(errors.New(404, "Review not found", "")), nil
		}
		if hasDisallowedReviewLinks(pending.Review) {
			return api.Failure(errors.New(400, reviewLinkMessage, "")), nil
		}
		if err := repository.ApproveCourseReview(key, input.Username, input.UpdatedAt); err != nil {
			return api.Failure(err), nil
		}
		log.Infof("Course review approved: course=%s actor=%s author=%s", key, username, input.Username)
		return api.Success(map[string]bool{"approved": true}), nil
	case "PUT", "DELETE":
		if username == "" {
			return api.Failure(errors.New(401, "Sign in to review this course", "")), nil
		}
		if event.RequestContext.HTTP.Method == "DELETE" {
			target := event.QueryStringParameters["username"]
			if target == "" {
				target = username
			}
			if target != username && (user == nil || !user.IsAdmin) {
				return api.Failure(errors.New(403, "Only administrators can remove another user's review", "")), nil
			}
			// Users may remove their own submission even after their membership expires.
			if err := repository.DeleteCourseReview(key, target); err != nil {
				return api.Failure(err), nil
			}
			log.Infof("Course review deleted: course=%s actor=%s author=%s", key, username, target)
			return api.Success(map[string]bool{"deleted": true}), nil
		}
		if !database.CanReviewCourse(user, course) {
			return api.Failure(errors.New(403, "Core membership or a purchase of this course is required", "")), nil
		}
		var input struct {
			Rating int    `json:"rating"`
			Review string `json:"review"`
		}
		if err := json.Unmarshal([]byte(event.Body), &input); err != nil {
			return api.Failure(errors.New(400, "Invalid review", "")), nil
		}
		input.Review = strings.TrimSpace(input.Review)
		if input.Review == "" {
			return api.Failure(errors.New(400, "Please write a review along with your rating.", "")), nil
		}
		if input.Rating < 1 || input.Rating > 5 || utf8.RuneCountInString(input.Review) > 5000 {
			return api.Failure(errors.New(400, "Choose 1–5 stars and limit the review to 5000 characters", "")), nil
		}
		if hasDisallowedReviewLinks(input.Review) {
			return api.Failure(errors.New(400, reviewLinkMessage, "")), nil
		}
		if profanityDetector.IsProfane(input.Review) {
			return api.Failure(errors.New(400, "Please remove profanity or explicit sexual language from your review.", "")), nil
		}
		status := "PENDING"
		review := &database.CourseReview{ModerationStatus: status, CourseKey: key, Username: username, DisplayName: user.DisplayName, Rating: input.Rating, Review: input.Review, UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano)}
		if err := repository.SaveCourseReview(review); err != nil {
			return api.Failure(err), nil
		}
		return api.Success(review), nil
	}
	return api.Failure(errors.New(405, "Method not allowed", "")), nil
}
