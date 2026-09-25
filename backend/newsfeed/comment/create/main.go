package main

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

var privacyRepository trainingprivacy.Repository = database.DynamoDB

var repository database.TimelineCommenter = database.DynamoDB

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

	comment := database.Comment{}
	if err := json.Unmarshal([]byte(event.Body), &comment); err != nil {
		err = errors.Wrap(400, "Invalid request: unable to unmarshal body", "", err)
		return api.Failure(err), nil
	}

	if strings.TrimSpace(comment.Content) == "" {
		err := errors.New(400, "Invalid request: content must not be empty", "")
		return api.Failure(err), nil
	}

	commenter, err := repository.GetUser(api.GetUserInfo(event).Username)
	if err != nil {
		return api.Failure(err), nil
	}

	comment.Owner = commenter.Username
	comment.OwnerDisplayName = commenter.DisplayName
	comment.OwnerCohort = commenter.DojoCohort
	comment.Id = uuid.NewString()
	comment.CreatedAt = time.Now().Format(time.RFC3339)
	comment.UpdatedAt = comment.CreatedAt

	entry, err := repository.CreateTimelineComment(owner, id, &comment)
	if err != nil {
		return api.Failure(err), nil
	}

	if err := database.SendTimelineCommentEvent(entry, &comment); err != nil {
		log.Error("Failed to create notification event: ", err)
	}

	return api.Success(entry), nil
}

func main() {
	lambda.Start(Handler)
}
