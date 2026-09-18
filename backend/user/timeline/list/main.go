package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

var privacyRepository trainingprivacy.Repository = database.DynamoDB

var repository database.TimelineLister = database.DynamoDB

type ListTimelineEntriesResponse struct {
	Entries          []*database.TimelineEntry `json:"entries"`
	LastEvaluatedKey string                    `json:"lastEvaluatedKey,omitempty"`
}

func Handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
	defer func() { response = trainingprivacy.NoStore(response) }()
	if err := trainingprivacy.New(privacyRepository, api.GetUserInfo(event).Username).Require(event.PathParameters["owner"]); err != nil {
		return api.Failure(err), nil
	}
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	owner, _ := event.PathParameters["owner"]
	if owner == "" {
		return api.Failure(errors.New(400, "Invalid request: owner is required", "")), nil
	}

	startKey, _ := event.QueryStringParameters["startKey"]

	entries, lastKey, err := repository.ListTimelineEntries(owner, startKey)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(&ListTimelineEntriesResponse{
		Entries:          entries,
		LastEvaluatedKey: lastKey,
	}), nil
}

func main() {
	lambda.Start(Handler)
}
