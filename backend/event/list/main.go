package main

import (
	"context"
	"os"

	"github.com/aws/aws-lambda-go/lambda"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/event/visibility"
)

var repository = database.DynamoDB
var stage = os.Getenv("stage")

type ListEventsResponse struct {
	Events           []*database.Event `json:"events"`
	LastEvaluatedKey string            `json:"lastEvaluatedKey,omitempty"`
}

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(Handler)
}

func Handler(ctx context.Context, request api.Request) (api.Response, error) {
	log.SetRequestId(request.RequestContext.RequestID)
	log.Infof("Request: %#v", request)

	info := api.GetUserInfo(request)
	var user *database.User
	var err error
	if info.Username != "" {
		user, err = repository.GetUser(info.Username)
		if err != nil {
			log.Errorf("Failed to get user: %v", err)
		}
	}

	startKey := request.QueryStringParameters["startKey"]
	events, lastKey, err := repository.ScanEvents(info.Username == "", startKey)
	if err != nil {
		return api.Failure(err), nil
	}

	finalEvents := make([]*database.Event, 0, len(events))
	for _, e := range events {
		if visibility.ShouldRemoveEvent(e, user) {
			continue
		}
		if visibility.ShouldHideEventDetails(e, user) {
			e.Location = ""
			e.Messages = nil
		}
		finalEvents = append(finalEvents, e)
	}

	return api.Success(&ListEventsResponse{
		Events:           finalEvents,
		LastEvaluatedKey: lastKey,
	}), nil
}
