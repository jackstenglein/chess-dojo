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

var repository database.TimelineGetter = database.DynamoDB

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
	defer func() { response = trainingprivacy.NoStore(response) }()
	if err := trainingprivacy.New(privacyRepository, api.GetUserInfo(event).Username).Require(event.PathParameters["owner"]); err != nil {
		return api.Failure(err), nil
	}
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	owner := event.PathParameters["owner"]
	if owner == "" {
		err := errors.New(400, "Invalid request: owner is required", "")
		return api.Failure(err), nil
	}

	id := event.PathParameters["id"]
	if id == "" {
		err := errors.New(400, "Invalid request: id is required", "")
		return api.Failure(err), nil
	}

	entry, err := repository.GetTimelineEntry(owner, id)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(entry), nil
}
