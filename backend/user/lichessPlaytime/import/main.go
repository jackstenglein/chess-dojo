package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/lichess"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/lichessPlaytime"
)

type Event events.CloudWatchEvent

var httpClient = lichess.NewClient(nil)

var now = time.Now

type importRequest struct {
	Cohorts []database.DojoCohort `json:"cohorts"`
}

func Handler(ctx context.Context, event Event) (Event, error) {
	log.Infof("Event: %#v", event)
	log.SetRequestId(event.ID)

	var req importRequest
	if err := json.Unmarshal(event.Detail, &req); err != nil {
		log.Errorf("Failed to unmarshal request: %v", err)
		return event, err
	}
	if len(req.Cohorts) == 0 {
		req.Cohorts = database.Cohorts
	}
	log.Infof("Request cohorts: %+v", req.Cohorts)

	clock := now()
	for _, cohort := range req.Cohorts {
		var startKey string
		for ok := true; ok; ok = startKey != "" {
			users, next, err := database.DynamoDB.ListUserRatings(cohort, startKey)
			if err != nil {
				log.Errorf("Failed to list users: %v", err)
				return event, err
			}
			startKey = next
			log.Infof("Processing %d users in cohort %s", len(users), cohort)
			for _, u := range users {
				if err := lichessPlaytime.ImportUser(ctx, u, httpClient, clock, database.DynamoDB); err != nil {
					log.Errorf("Lichess playtime import failed for %q: %v", u.Username, err)
					continue
				}
			}
		}
	}
	return event, nil
}

func main() {
	lambda.Start(Handler)
}
