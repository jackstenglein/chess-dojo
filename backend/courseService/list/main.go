package main

import (
	"context"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository interface {
	database.CourseLister
	database.UserGetter
} = database.DynamoDB

var stage = os.Getenv("stage")

type ListCoursesResponse struct {
	Courses          []database.Course `json:"courses"`
	LastEvaluatedKey string            `json:"lastEvaluatedKey,omitempty"`
}

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	publishedOnly := true
	if !strings.Contains(event.RawPath, "public/") {
		info := api.GetUserInfo(event)
		if info.Username != "" {
			if user, err := repository.GetUser(info.Username); err == nil && user.IsAdmin {
				publishedOnly = false
			}
		}
	}

	startKey := event.QueryStringParameters["startKey"]
	courseType := event.PathParameters["type"]

	var courses []database.Course
	var lastKey string
	var err error

	if courseType != "" {
		courses, lastKey, err = repository.ListCourses(courseType, startKey, publishedOnly)
	} else {
		courses, lastKey, err = repository.ScanCourses(startKey, publishedOnly)
	}

	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(&ListCoursesResponse{
		Courses:          courses,
		LastEvaluatedKey: lastKey,
	}), nil
}
