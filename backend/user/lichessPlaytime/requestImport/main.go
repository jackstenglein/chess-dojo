package main

import (
	"context"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/lichess"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/lichessPlaytime"
)

var store lichessplaytime.Store = database.DynamoDB

var httpClient = lichess.NewClient(nil)

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	user, err := database.DynamoDB.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	if err := lichessplaytime.ImportUser(ctx, user, httpClient, time.Now(), store); err != nil {
		return api.Failure(err), nil
	}

	updated, err := database.DynamoDB.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	return api.Success(updated), nil
}

func main() {
	lambda.Start(Handler)
}
