package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository database.GameLister = database.DynamoDB

type ListGamesResponse struct {
	Games            []*database.Game `json:"games"`
	LastEvaluatedKey string           `json:"lastEvaluatedKey,omitempty"`
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	startKey, _ := event.QueryStringParameters["startKey"]

	games, lastKey, err := repository.ListFeaturedGames("", startKey)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(&ListGamesResponse{
		Games:            games,
		LastEvaluatedKey: lastKey,
	}), nil
}

func main() {
	lambda.Start(Handler)
}
