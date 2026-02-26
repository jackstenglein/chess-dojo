// Implements a lambda handler which marks a game as well annotated (featured).
// The caller must be an admin.
package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository database.GameFeaturer = database.DynamoDB

type Request struct {
	Cohort   string `json:"cohort"`
	Id       string `json:"id"`
	Featured string `json:"featured"`
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Debugf("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	if !user.IsAdmin {
		return api.Failure(errors.New(403, "Invalid request: you must be an admin to call this function", "")), nil
	}

	request := Request{}
	if err := json.Unmarshal([]byte(event.Body), &request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: failed to unmarshal body", "", err)), nil
	}
	if request.Cohort == "" {
		return api.Failure(errors.New(400, "Invalid request: cohort is required", "")), nil
	}
	if request.Id == "" {
		return api.Failure(errors.New(400, "Invalid request: id is required", "")), nil
	}
	if request.Featured != "true" && request.Featured != "false" {
		return api.Failure(errors.New(400, "Invalid request: featured must be \"true\" or \"false\"", "")), nil
	}

	featuredAt := ""
	if request.Featured == "true" {
		featuredAt = time.Now().Format(time.RFC3339)
	}

	game, err := repository.SetGameFeatured(request.Cohort, request.Id, request.Featured, featuredAt)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(game), nil
}
