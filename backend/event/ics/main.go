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
	"github.com/jackstenglein/chess-dojo-scheduler/backend/event/visibility"
)

var repository database.EventLister = database.DynamoDB
var userGetter database.UserGetter = database.DynamoDB
var stage = os.Getenv("stage")
var frontendHost = os.Getenv("frontendHost")

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(Handler)
}

func Handler(ctx context.Context, request api.Request) (api.Response, error) {
	log.SetRequestId(request.RequestContext.RequestID)
	log.Infof("Request: %#v", request)

	username := request.PathParameters["username"]
	if username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	user, err := userGetter.GetUser(username)
	if err != nil {
		return api.Failure(err), nil
	}

	filters := parseFilters(request.QueryStringParameters)

	events, err := scanAllEvents()
	if err != nil {
		return api.Failure(err), nil
	}

	matched := make([]*database.Event, 0, len(events))
	for _, event := range events {
		if visibility.ShouldRemoveEvent(event, user) {
			continue
		}
		if !includeInICS(event, user, filters) {
			continue
		}

		event.Messages = nil
		if event.Type == database.EventType_LectureTier || event.Type == database.EventType_GameReviewTier {
			event.Location = fmt.Sprintf("%s/meeting/%s", frontendHost, event.Id)
		}

		matched = append(matched, event)
	}

	calendarName := fmt.Sprintf("ChessDojo – %s", user.DisplayName)
	if user.DisplayName == "" {
		calendarName = "ChessDojo Calendar"
	}

	body := formatICS(matched, user, calendarName)
	filename := fmt.Sprintf("%s.ics", username)

	return api.Response{
		StatusCode:      200,
		IsBase64Encoded: false,
		Body:            body,
		Headers: map[string]string{
			"Content-Type":                "text/calendar; charset=utf-8",
			"Content-Disposition":         fmt.Sprintf(`attachment; filename="%s"`, filename),
			"Cache-Control":               "public, max-age=300",
			"Access-Control-Allow-Origin": "*",
		},
	}, nil
}

func scanAllEvents() ([]*database.Event, error) {
	var all []*database.Event
	startKey := ""
	for {
		events, lastKey, err := repository.ScanEvents(false, startKey)
		if err != nil {
			return nil, err
		}
		all = append(all, events...)
		if lastKey == "" {
			return all, nil
		}
		startKey = lastKey
	}
}
