package main

import (
	"context"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

var privacyRepository trainingprivacy.Repository = database.DynamoDB

var repository = database.DynamoDB
var stage = os.Getenv("stage")

type GetClubResponse struct {
	Club       *database.Club               `json:"club"`
	Scoreboard []database.ScoreboardSummary `json:"scoreboard,omitempty"`
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

	id := event.PathParameters["id"]
	if id == "" {
		return api.Failure(errors.New(400, "Invalid request: id is required", "")), nil
	}

	club, err := repository.GetClub(id)
	if err != nil {
		return api.Failure(err), nil
	}

	if _, ok := event.QueryStringParameters["scoreboard"]; !ok {
		return api.Success(GetClubResponse{Club: club}), nil
	}

	var scoreboard []database.ScoreboardSummary

	var memberUsernames []string
	for username := range club.Members {
		memberUsernames = append(memberUsernames, username)

		if len(memberUsernames) == 100 {
			s, err := repository.GetScoreboardSummaries(memberUsernames)
			if err != nil {
				return api.Failure(err), nil
			}
			scoreboard = append(scoreboard, s...)
			memberUsernames = nil
		}
	}

	if len(memberUsernames) > 0 {
		s, err := repository.GetScoreboardSummaries(memberUsernames)
		if err != nil {
			return api.Failure(err), nil
		}
		scoreboard = append(scoreboard, s...)
	}

	return api.Success(GetClubResponse{Club: club, Scoreboard: scoreboard}), nil
}
