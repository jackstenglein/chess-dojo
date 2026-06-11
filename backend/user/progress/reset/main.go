package main

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type progressResetRepository interface {
	UpdateUser(username string, update *database.UserUpdate) (*database.User, error)
}

type ResetProgressRequest struct {
	Confirm string `json:"confirm"`
}

var repository progressResetRepository = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	request := &ResetProgressRequest{}
	if err := json.Unmarshal([]byte(event.Body), request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)), nil
	}
	if strings.TrimSpace(strings.ToLower(request.Confirm)) != "confirm" {
		return api.Failure(errors.New(400, "Invalid request: confirm must be `confirm`", "")), nil
	}

	progress := map[string]*database.RequirementProgress{}
	minutesSpent := map[string]int{}
	totalDojoScore := float32(0)

	user, err := repository.UpdateUser(info.Username, &database.UserUpdate{
		Progress:       &progress,
		MinutesSpent:   &minutesSpent,
		TotalDojoScore: &totalDojoScore,
	})
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(user), nil
}
