package main

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

const (
	requestType_Dojo      = "dojo"
	requestType_Following = "following"
)

var privacyRepository trainingprivacy.Repository = database.DynamoDB

var repository database.ScoreboardSummaryLister = database.DynamoDB
var stage = os.Getenv("stage")

type GetScoreboardResponse struct {
	Data             any    `json:"data"`
	LastEvaluatedKey string `json:"lastEvaluatedKey,omitempty"`
}

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
	defer func() {
		response = trainingprivacy.New(privacyRepository, api.GetUserInfo(event).Username).ProtectUsers(response)
	}()
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	startKey := event.QueryStringParameters["startKey"]
	requestType := event.PathParameters["type"]

	if requestType == requestType_Dojo {
		return handleFullDojo(startKey), nil
	} else if requestType == requestType_Following {
		return handleFollowing(event), nil
	} else if database.IsValidCohort(database.DojoCohort(requestType)) && requestType != string(database.AllCohorts) {
		return handleCohort(requestType, startKey), nil
	}

	err := errors.New(400, fmt.Sprintf("Invalid request: unknown request type `%s`", requestType), "")
	return api.Failure(err), nil
}

// handleFullDojo fetches a list of scoreboard summaries for the full dojo,
// regardless of cohort. Free-tier users and inactive users are excluded.
func handleFullDojo(startKey string) api.Response {
	summaries, lastKey, err := repository.ListScoreboardSummaries(startKey)
	if err != nil {
		return api.Failure(err)
	}

	return api.Success(&GetScoreboardResponse{
		Data:             summaries,
		LastEvaluatedKey: lastKey,
	})
}

// handleFollowing fetches a list of scoreboard summaries for users that this user
// is following. Inactive and free-tier users are included.
func handleFollowing(event api.Request) api.Response {
	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", ""))
	}

	startKey := event.QueryStringParameters["startKey"]
	followingEntries, lastKey, err := repository.ListFollowingLimit(info.Username, startKey, 100)
	if err != nil {
		return api.Failure(err)
	}

	following := make([]string, len(followingEntries))
	for i, entry := range followingEntries {
		following[i] = entry.Poster
	}

	summaries, err := repository.GetScoreboardSummaries(following)
	if err != nil {
		return api.Failure(err)
	}

	return api.Success(&GetScoreboardResponse{
		Data:             summaries,
		LastEvaluatedKey: lastKey,
	})
}

// handleCohort fetches a list of users for the given cohort. Free-tier users and
// inactive users are excluded.
func handleCohort(cohort, startKey string) api.Response {
	users, lastKey, err := repository.GetCohort(cohort, startKey)
	if err != nil {
		return api.Failure(err)
	}

	return api.Success(&GetScoreboardResponse{
		Data:             users,
		LastEvaluatedKey: lastKey,
	})
}
