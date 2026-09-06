package main

import (
	"context"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

var privacyRepository trainingprivacy.Repository = database.DynamoDB

var repository = database.DynamoDB
var coachesStr = os.Getenv("coaches")

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
	defer func() {
		response = trainingprivacy.New(privacyRepository, api.GetUserInfo(event).Username).ProtectUsers(response)
	}()
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	coaches := strings.Split(coachesStr, ",")
	users, err := repository.BatchGetUsers(coaches)
	if err != nil {
		return api.Failure(err), nil
	}

	for _, u := range users {
		for _, rating := range u.Ratings {
			if rating.HideUsername {
				rating.Username = ""
			}
		}
	}
	return api.Success(users), err
}
