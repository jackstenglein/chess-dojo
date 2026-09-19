package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	payment "github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService"
)

var repository database.CourseGetter = database.DynamoDB

type PurchaseCourseResponse struct {
	Url string `json:"url"`
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)

	courseType := event.PathParameters["type"]
	id := event.PathParameters["id"]
	if courseType == "" || id == "" {
		return api.Failure(errors.New(400, "Invalid request: type and id are required", "")), nil
	}

	course, err := repository.GetCourse(courseType, id)
	if err != nil {
		return api.Failure(err), nil
	}

	if !course.IsPublished() {
		return api.Failure(errors.New(404, "Invalid request: course not found", "")), nil
	}

	if len(course.PurchaseOptions) == 0 {
		return api.Failure(errors.New(400, "Invalid request: course has no purchase options", "")), nil
	}

	purchaseOption := course.PurchaseOptions[0]
	selectedPurchaseOption := event.QueryStringParameters["purchaseOption"]
	if len(course.PurchaseOptions) > 1 && selectedPurchaseOption != "" {
		for _, option := range course.PurchaseOptions {
			if option.Name == selectedPurchaseOption {
				purchaseOption = option
				break
			}
		}
	}

	cancelUrl := event.QueryStringParameters["cancelUrl"]

	var user *database.User = nil
	if info.Username != "" {
		user, err = repository.GetUser(info.Username)
		if err != nil {
			log.Error("Failed to get user: ", err)
		}
	}

	url, err := payment.PurchaseCourseUrl(user, course, purchaseOption, cancelUrl)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(PurchaseCourseResponse{Url: url}), nil
}
