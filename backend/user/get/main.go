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

	info := api.GetUserInfo(event)
	username, public := event.PathParameters["username"]
	if !public {
		username = info.Username
	}

	if username == "" {
		err := errors.New(400, "Invalid request: username is required", "")
		return api.Failure(err), nil
	}

	user, err := repository.GetUser(username)
	var apiErr *errors.Error
	if errors.As(err, &apiErr) && apiErr.Code == 404 && username == info.Username {
		return createUser(info)
	}
	if err != nil {
		return api.Failure(err), nil
	}

	if user.Username != info.Username {
		for _, rating := range user.Ratings {
			if rating.HideUsername {
				rating.Username = ""
			}
		}
	}

	return api.Success(user), err
}

func createUser(info *api.UserInfo) (api.Response, error) {
	user, err := repository.CreateUser(info.Username, info.Email, info.Name, nil)
	if err != nil {
		return api.Failure(err), nil
	}
	return api.Success(user), nil
}
