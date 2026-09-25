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
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

var privacyRepository trainingprivacy.Repository = database.DynamoDB

var repository database.TimelineReactor = database.DynamoDB

func Handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
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

	reaction := database.Reaction{}
	if err := json.Unmarshal([]byte(event.Body), &reaction); err != nil {
		err = errors.Wrap(400, "Invalid request: unable to unmarshal body", "", err)
		return api.Failure(err), nil
	}

	reactor, err := repository.GetUser(api.GetUserInfo(event).Username)
	if err != nil {
		return api.Failure(err), nil
	}

	reaction.Username = reactor.Username
	reaction.DisplayName = reactor.DisplayName
	reaction.Cohort = reactor.DojoCohort
	reaction.UpdatedAt = time.Now().Format(time.RFC3339)

	entry, err := repository.SetTimelineReaction(owner, id, &reaction)
	if err != nil {
		return api.Failure(err), nil
	}

	if entry.Owner != reactor.Username {
		if err := database.SendTimelineReactionEvent(entry); err != nil {
			log.Error("Failed to create notification: ", err)
		}
	}

	return api.Success(entry), nil
}

func main() {
	lambda.Start(Handler)
}
