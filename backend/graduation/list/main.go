package main

import (
	"context"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

type graduationListRepository interface {
	trainingprivacy.Repository
	database.GraduationLister
	database.GameLister
}

var repository graduationListRepository = database.DynamoDB
var stage = os.Getenv("stage")

type ListGraduationsResponse struct {
	Graduations      []database.Graduation `json:"graduations"`
	LastEvaluatedKey string                `json:"lastEvaluatedKey,omitempty"`
}

func byCohortHandler(event api.Request) (api.Response, error) {
	cohort := event.PathParameters["cohort"]
	startKey := event.QueryStringParameters["startKey"]
	graduations, lastKey, err := repository.ListGraduationsByCohort(database.DojoCohort(cohort), startKey)
	if err != nil {
		return api.Failure(err), nil
	}

	graduations, err = trainingprivacy.Filter(trainingprivacy.New(repository, api.GetUserInfo(event).Username), graduations, func(g database.Graduation) string { return g.Username })
	if err != nil {
		return api.Failure(err), nil
	}
	return trainingprivacy.NoStore(api.Success(&ListGraduationsResponse{
		Graduations:      graduations,
		LastEvaluatedKey: lastKey,
	})), nil
}

func byOwnerHandler(event api.Request) (api.Response, error) {
	if err := trainingprivacy.New(repository, api.GetUserInfo(event).Username).Require(event.PathParameters["username"]); err != nil {
		return trainingprivacy.NoStore(api.Failure(err)), nil
	}
	username := event.PathParameters["username"]
	startKey := event.QueryStringParameters["startKey"]
	graduations, lastKey, err := repository.ListGraduationsByOwner(username, startKey)
	if err != nil {
		return api.Failure(err), nil
	}
	return trainingprivacy.NoStore(api.Success(&ListGraduationsResponse{
		Graduations:      graduations,
		LastEvaluatedKey: lastKey,
	})), nil
}

func byDateHandler(event api.Request) (api.Response, error) {
	startKey := event.QueryStringParameters["startKey"]
	monthAgo := time.Now().Add(database.ONE_MONTH_AGO).Format(time.RFC3339)
	graduations, lastKey, err := repository.ListGraduationsByDate(monthAgo, startKey)
	if err != nil {
		return api.Failure(err), nil
	}

	graduations, err = trainingprivacy.Filter(trainingprivacy.New(repository, api.GetUserInfo(event).Username), graduations, func(g database.Graduation) string { return g.Username })
	if err != nil {
		return api.Failure(err), nil
	}
	if err := addRecentGamesAnnotated(graduations); err != nil {
		return api.Failure(err), nil
	}

	return trainingprivacy.NoStore(api.Success(&ListGraduationsResponse{
		Graduations:      graduations,
		LastEvaluatedKey: lastKey,
	})), nil
}

func addRecentGamesAnnotated(graduations []database.Graduation) error {
	now := time.Now()
	startDate := now.AddDate(0, -2, 0).Format("2006.01.02")
	endDate := now.Format("2006.01.02")

	counts := map[string]int{}
	for _, graduation := range graduations {
		if _, ok := counts[graduation.Username]; ok {
			continue
		}

		count := 0
		var gamesStartKey string
		for ok := true; ok; ok = gamesStartKey != "" {
			games, nextKey, err := repository.ListGamesByOwner(false, graduation.Username, startDate, endDate, gamesStartKey)
			if err != nil {
				return err
			}
			count += len(games)
			gamesStartKey = nextKey
		}
		counts[graduation.Username] = count
	}

	for i := range graduations {
		graduations[i].GamesAnnotated = counts[graduations[i].Username]
	}
	return nil
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	if _, ok := event.PathParameters["cohort"]; ok {
		return byCohortHandler(event)
	}

	if _, ok := event.PathParameters["username"]; ok {
		return byOwnerHandler(event)
	}

	return byDateHandler(event)
}

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(Handler)
}
