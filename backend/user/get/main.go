package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type userStore interface {
	GetUser(username string) (*database.User, error)
	CreateUser(username, email, name string, paymentInfo *database.PaymentInfo) (*database.User, error)
}

var repository userStore = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
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
