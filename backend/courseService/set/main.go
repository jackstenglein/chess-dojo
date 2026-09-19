package main

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository interface {
	database.CourseSetter
	database.CourseGetter
} = database.DynamoDB

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		err := errors.New(403, "Invalid request: username is required", "")
		return api.Failure(err), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	isAdmin := user.IsAdmin
	if !isAdmin && !user.IsCoach {
		return api.Failure(errors.New(403, "Invalid request: user is not a coach or admin", "")), nil
	}
	if !isAdmin && (user.CoachInfo == nil || user.CoachInfo.StripeId == "") {
		return api.Failure(errors.New(400, "Invalid request: user must complete Stripe onboarding first", "")), nil
	}

	course := &database.Course{}
	if err := json.Unmarshal([]byte(event.Body), course); err != nil {
		err := errors.Wrap(400, "Invalid request: body could not be unmarshalled", "json.Unmarshal failed", err)
		return api.Failure(err), nil
	}

	if err := checkCourse(course); err != nil {
		return api.Failure(err), nil
	}

	if err := setDefaults(user, course, isAdmin); err != nil {
		return api.Failure(err), nil
	}

	var saveErr error
	if isAdmin {
		saveErr = repository.AdminSetCourse(course)
	} else {
		saveErr = repository.SetCourse(course)
	}
	if saveErr != nil {
		return api.Failure(saveErr), nil
	}
	return api.Success(course), nil
}

func checkCourse(course *database.Course) error {
	if course.Type == "" {
		return errors.New(400, fmt.Sprintf("Invalid course type: `%s`", course.Type), "")
	}

	if course.Status != "" && course.Status != database.CourseStatusDraft && course.Status != database.CourseStatusPublished {
		return errors.New(400, fmt.Sprintf("Invalid course status: `%s`", course.Status), "")
	}

	if course.Name == "" {
		return errors.New(400, "Invalid request: course name cannot be empty", "")
	}

	if course.Description == "" {
		return errors.New(400, "Invalid request: course description cannot be empty", "")
	}

	if !course.Color.IsValid() {
		return errors.New(400, fmt.Sprintf("Invalid course color: `%s`", course.Color), "")
	}

	if len(course.Cohorts) == 0 {
		return errors.New(400, "Invalid request: cohorts cannot be empty", "")
	}
	for _, c := range course.Cohorts {
		if !c.IsValid() {
			return errors.New(400, fmt.Sprintf("Invalid cohort: `%s`", c), "")
		}
	}

	if course.CohortRange == "" {
		return errors.New(400, "Invalid request: cohortRange cannot be empty", "")
	}

	if (course.AvailableForFreeUsers || !course.IncludedWithSubscription) && len(course.PurchaseOptions) == 0 {
		return errors.New(400, "Invalid request: purchaseOptions cannot be empty when availableForFreeUsers is true or includedWithSubscription is false", "")
	}
	for _, option := range course.PurchaseOptions {
		if option.FullPrice < 100 {
			return errors.New(400, "Invalid request: fullPrice must be at least $1", "")
		}
		if option.CurrentPrice > 0 && option.CurrentPrice < 100 {
			return errors.New(400, "Invalid request: currentPrice must be at least $1 if set", "")
		}
		if option.CurrentPrice > option.FullPrice {
			return errors.New(400, "Invalid request: currentPrice must be less than or equal to fullPrice", "")
		}
		for _, sp := range option.SellingPoints {
			if sp.Description == "" {
				return errors.New(400, "Invalid request: selling point description cannot be empty", "")
			}
		}
	}

	return nil
}

func setDefaults(user *database.User, course *database.Course, isAdmin bool) error {
	if course.Id == "" {
		course.Id = uuid.NewString()
	}

	var existing *database.Course
	if fetched, err := repository.GetCourse(string(course.Type), course.Id); err == nil {
		existing = fetched
	}

	if existing != nil {
		if existing.Owner != "" && (course.Owner == "" || !isAdmin) {
			course.Owner = existing.Owner
		}
		if course.OwnerDisplayName == "" {
			course.OwnerDisplayName = existing.OwnerDisplayName
		}
		if course.StripeId == "" {
			course.StripeId = existing.StripeId
		}
	}

	if course.Owner == "" {
		course.Owner = user.Username
	}
	if course.OwnerDisplayName == "" {
		course.OwnerDisplayName = user.DisplayName
	}
	if course.StripeId == "" && user.CoachInfo != nil {
		course.StripeId = user.CoachInfo.StripeId
	}
	if course.Status == "" {
		course.Status = database.CourseStatusDraft
	}
	if course.Color == "" {
		course.Color = database.CourseColor_None
	}

	for i, option := range course.PurchaseOptions {
		if len(option.CourseIds) > 0 {
			found := slices.Contains(option.CourseIds, course.Id)
			if !found {
				course.PurchaseOptions[i].CourseIds = append(option.CourseIds, course.Id)
			}
		}
	}

	return nil
}
