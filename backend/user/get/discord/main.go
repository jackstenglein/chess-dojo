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

var repository = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
	defer func() {
		response = trainingprivacy.New(privacyRepository, api.GetUserInfo(event).Username).ProtectUsers(response)
	}()
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	discordId := event.PathParameters["discordId"]
	if discordId == "" {
		err := errors.New(400, "Invalid request: discordId is required", "")
		return api.Failure(err), nil
	}

	user, err := repository.GetUserByDiscordId(discordId)
	if err != nil {
		return api.Failure(err), nil
	}

	for _, rating := range user.Ratings {
		if rating.HideUsername {
			rating.Username = ""
		}
	}

	return api.Success(user), err
}
