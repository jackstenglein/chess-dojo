package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/trainingprivacy"
)

const limit = 25

var privacyRepository trainingprivacy.Repository = database.DynamoDB

var repository = database.DynamoDB
var stage = os.Getenv("stage")

type ListNewsfeedResponse struct {
	Entries   []database.TimelineEntry `json:"entries"`
	LastFetch string                   `json:"lastFetch"`
	LastKeys  map[string]string        `json:"lastKeys"`
}

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (response api.Response, handlerErr error) {
	defer func() { response = trainingprivacy.NoStore(response) }()
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	lastFetch := getLastFetched(info.Username, event)

	newsfeedIdsStr := event.QueryStringParameters["newsfeedIds"]
	if newsfeedIdsStr == "" {
		err := errors.New(400, "Invalid request: newsfeedIds is required", "")
		return api.Failure(err), nil
	}

	newsfeedIds := strings.Split(newsfeedIdsStr, ",")
	for i, newsfeedId := range newsfeedIds {
		if newsfeedId == "following" {
			if info.Username == "" {
				err := errors.New(400, "Invalid request: username is required to list following newsfeed", "")
				return api.Failure(err), nil
			}
			newsfeedIds[i] = info.Username
		}
	}

	startKey := event.QueryStringParameters["startKey"]
	startKeys := make(map[string]string)
	if startKey != "" {
		if err := json.Unmarshal([]byte(startKey), &startKeys); err != nil {
			err = errors.Wrap(400, "Invalid request: startKey is not valid", "startKey could not be unmarshaled", err)
			return api.Failure(err), nil
		}
	}

	timelineEntries := make(map[string]database.TimelineEntryKey)
	lastKeys := make(map[string]string)

	for _, newsfeedId := range newsfeedIds {
		if len(timelineEntries) >= limit {
			lastKeys[newsfeedId] = startKeys[newsfeedId]
			continue
		}

		if err := fetchEntries(newsfeedId, startKeys[newsfeedId], lastFetch, timelineEntries, lastKeys); err != nil {
			return api.Failure(err), nil
		}
	}

	log.Debugf("Fetching timeline entries: %#v", timelineEntries)
	resultEntries, err := repository.BatchGetTimelineEntries(timelineEntries)
	if err != nil {
		return api.Failure(err), nil
	}

	resultEntries, err = trainingprivacy.Filter(trainingprivacy.New(privacyRepository, api.GetUserInfo(event).Username), resultEntries, func(e database.TimelineEntry) string { return e.Owner })
	if err != nil {
		return api.Failure(err), nil
	}

	if len(lastKeys) == 0 && info.Username != "" && event.QueryStringParameters["skipLastFetched"] == "" {
		update := &database.UserUpdate{
			LastFetchedNewsfeed: aws.String(time.Now().Format(time.RFC3339)),
		}
		_, err := repository.UpdateUser(info.Username, update)
		if err != nil {
			log.Error("Failed to update last fetched newsfeed: ", err)
		}
	}

	return api.Success(&ListNewsfeedResponse{
		Entries:   resultEntries,
		LastFetch: lastFetch,
		LastKeys:  lastKeys,
	}), nil
}

// getLastFetched returns the time the user last fetched their newsfeed. If the user
// has never fetched their newsfeed or they last fetched it more than 1 week ago, then
// a time 1 week ago is returned. If the event contains the skipLastFetched query parameter,
// then an empty string is returned.
func getLastFetched(username string, event api.Request) string {
	if username == "" || event.QueryStringParameters["skipLastFetched"] != "" {
		return ""
	}

	user, err := repository.GetUser(username)
	if err != nil {
		log.Error("Failed to fetch user: ", err)
		return ""
	}

	weekAgo := time.Now().Add(-7 * 24 * time.Hour)

	if user.LastFetchedNewsfeed == "" {
		return weekAgo.Format(time.RFC3339)
	}

	t, err := time.Parse(time.RFC3339, user.LastFetchedNewsfeed)
	if err != nil {
		log.Error("Failed to parse user's lastFetched time: ", err)
		return weekAgo.Format(time.RFC3339)
	}
	t = t.Add(-24 * time.Hour)

	if t.Before(weekAgo) {
		return weekAgo.Format(time.RFC3339)
	}

	return t.Format(time.RFC3339)
}

func fetchEntries(newsfeedId, startKey, lastFetch string, entryMap map[string]database.TimelineEntryKey, lastKeys map[string]string) error {
	newsfeedEntries, last, err := repository.ListNewsfeedEntries(newsfeedId, startKey, lastFetch, limit)
	if err != nil {
		return err
	}
	log.Debugf("Got %d entries for id %q: %v", len(newsfeedEntries), newsfeedId, newsfeedEntries)

	if last != "" {
		lastKeys[newsfeedId] = last
	}

	for _, entry := range newsfeedEntries {
		entryMap[fmt.Sprintf("%s#%s", entry.Poster, entry.TimelineId)] = database.TimelineEntryKey{
			Owner: entry.Poster,
			Id:    entry.TimelineId,
		}
	}
	return nil
}
