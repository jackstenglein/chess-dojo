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

var repository database.UserLister = database.DynamoDB

type ListUsersResponse struct {
	Users            []*database.User `json:"users"`
	LastEvaluatedKey string           `json:"lastEvaluatedKey,omitempty"`
}

func Handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
	defer func() {
		response = trainingprivacy.New(privacyRepository, api.GetUserInfo(event).Username).ProtectUsers(response)
	}()
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	cohort, _ := event.PathParameters["cohort"]
	if cohort == "" {
		return api.Failure(errors.New(400, "Invalid request: cohort is required", "")), nil
	}
	startKey, _ := event.QueryStringParameters["startKey"]

	users, lastKey, err := repository.ListUsersByCohort(database.DojoCohort(cohort), startKey)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(&ListUsersResponse{
		Users:            users,
		LastEvaluatedKey: lastKey,
	}), nil
}

func main() {
	lambda.Start(Handler)
}
