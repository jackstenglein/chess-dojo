package main

import (
	"context"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	payment "github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService"
	"github.com/stripe/stripe-go/v81"
)

var repository database.CourseGetter = database.DynamoDB

type GetCourseResponse struct {
	// The requested course.
	Course *database.Course `json:"course"`

	// Whether the user is blocked from viewing this course (due to missing purchases).
	// If true, the course's chapters attribute will be nil.
	IsBlocked bool `json:"isBlocked"`
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	courseType := event.PathParameters["type"]
	id := event.PathParameters["id"]
	if courseType == "" || id == "" {
		return api.Failure(errors.New(400, "Invalid request: type and id are required", "")), nil
	}

	course, err := repository.GetCourse(courseType, id)
	if err != nil {
		return api.Failure(err), nil
	}

	info := api.GetUserInfo(event)
	if info.Username == "" {
		if !course.IsPublished() {
			return api.Failure(errors.New(404, "Invalid request: course not found", "")), nil
		}
		return checkAnonymousAccess(event, course)
	}

	caller, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	if caller.IsAdmin {
		return accessGranted(course)
	}

	if !course.IsPublished() {
		return api.Failure(errors.New(404, "Invalid request: course not found", "")), nil
	}

	// The caller must subscribe to access the course
	if !course.AvailableForFreeUsers && caller.SubscriptionStatus != database.SubscriptionStatus_Subscribed {
		return accessDenied(course)
	}

	if caller.SubscriptionStatus == database.SubscriptionStatus_Subscribed && course.IncludedWithSubscription {
		return accessGranted(course)
	}

	if caller.PurchasedCourses[course.Id] {
		return accessGranted(course)
	}

	return accessDenied(course)
}

func checkAnonymousAccess(event api.Request, course *database.Course) (api.Response, error) {
	checkoutId := event.QueryStringParameters["checkoutId"]
	if checkoutId == "" {
		return accessDenied(course)
	}

	checkoutSession, err := payment.GetCheckoutSession(checkoutId)
	if err != nil {
		log.Error("GetCheckoutSession err: ", err)
		return accessDenied(course)
	}

	if checkoutSession.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
		return accessDenied(course)
	}

	courseIds := strings.SplitSeq(checkoutSession.Metadata["courseIds"], ",")
	for id := range courseIds {
		if id == course.Id {
			return accessGranted(course)
		}
	}
	return accessDenied(course)
}

func accessGranted(course *database.Course) (api.Response, error) {
	return api.Success(GetCourseResponse{
		Course:    course,
		IsBlocked: false,
	}), nil
}

func accessDenied(course *database.Course) (api.Response, error) {
	course.Chapters = nil
	return api.Success(GetCourseResponse{
		Course:    course,
		IsBlocked: true,
	}), nil
}
