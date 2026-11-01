package main

import (
	"context"
	"fmt"
	"os"
	"slices"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository = database.DynamoDB
var stage = os.Getenv("stage")

func main() {
	if stage == "prod" {
		log.SetLevel(log.InfoLevel)
	}
	lambda.Start(handler)
}

func handler(ctx context.Context, event events.DynamoDBEvent) (events.DynamoDBEventResponse, error) {
	log.Infof("Event: %#v", event)
	var submitted int
	var err error

	failures := make([]events.DynamoDBBatchItemFailure, 0, len(event.Records))

	for _, record := range event.Records {
		if record.EventName != "INSERT" {
			continue
		}
		log.Debugf("Record: %#v", record)

		if strings.Contains(record.EventSourceArn, "timeline") {
			submitted, err = processTimelineRecord(record)
		} else if strings.Contains(record.EventSourceArn, "followers") {
			submitted, err = processFollowersRecord(record)
		} else {
			continue
		}

		if err != nil {
			log.Errorf("Failed with %d submitted: %v", submitted, err)
			failures = append(failures, events.DynamoDBBatchItemFailure{
				ItemIdentifier: record.Change.SequenceNumber,
			})
		} else {
			log.Infof("Submitted %d newsfeed entries", submitted)
		}
	}

	return events.DynamoDBEventResponse{
		BatchItemFailures: failures,
	}, nil
}

func processTimelineRecord(record events.DynamoDBEventRecord) (int, error) {
	requirementId := record.Change.NewImage["requirementId"].String()
	if requirementId == "Graduation" {
		return processGraduationRecord(record)
	}

	if slices.Contains(database.NewsfeedBlockedRequirements, requirementId) {
		log.Infof("Skipping record due to blocked requirement id: %s", requirementId)
		return 0, nil
	}

	poster := record.Change.Keys["owner"].String()
	id := record.Change.Keys["id"].String()
	createdAt := time.Now().Format(time.RFC3339)
	sortKey := fmt.Sprintf("%s_%s", createdAt, id)
	cohort := record.Change.NewImage["cohort"].String()

	entries := make([]database.NewsfeedEntry, 0, 25)

	var followers []database.FollowerEntry
	var startKey string
	var err error
	var success int

	user, err := repository.GetUser(poster)
	if err != nil {
		return success, err
	}
	for _, clubId := range user.Clubs {
		entries = append(entries, database.NewsfeedEntry{
			NewsfeedId: clubId,
			SortKey:    sortKey,
			CreatedAt:  createdAt,
			Poster:     poster,
			TimelineId: id,
		})
	}

	for ok := true; ok; ok = startKey != "" {
		followers, startKey, err = repository.ListFollowers(poster, startKey)
		if err != nil {
			return success, err
		}

		for _, f := range followers {
			entries = append(entries, database.NewsfeedEntry{
				NewsfeedId: f.Follower,
				SortKey:    sortKey,
				CreatedAt:  createdAt,
				Poster:     poster,
				TimelineId: id,
			})
		}
	}

	entries = append(entries, database.NewsfeedEntry{
		NewsfeedId: cohort,
		SortKey:    sortKey,
		CreatedAt:  createdAt,
		Poster:     poster,
		TimelineId: id,
	})
	success, err = repository.PutNewsfeedEntries(entries)
	if err != nil {
		return success, err
	}

	if success < len(entries) {
		return success, fmt.Errorf("success (%d) < attempted (%d) for record: %#v", success, len(entries), record)
	}
	return success, nil
}

func processGraduationRecord(record events.DynamoDBEventRecord) (int, error) {
	poster := record.Change.Keys["owner"].String()
	id := record.Change.Keys["id"].String()
	createdAt := time.Now().Format(time.RFC3339)
	sortKey := fmt.Sprintf("%s_%s", createdAt, id)

	entries := make([]database.NewsfeedEntry, 0, 25)
	var success int

	user, err := repository.GetUser(poster)
	if err != nil {
		return success, err
	}
	for _, clubId := range user.Clubs {
		entries = append(entries, database.NewsfeedEntry{
			NewsfeedId: clubId,
			SortKey:    sortKey,
			CreatedAt:  createdAt,
			Poster:     poster,
			TimelineId: id,
		})
	}

	entries = append(entries, database.NewsfeedEntry{
		NewsfeedId: database.NewsfeedIdGraduations,
		SortKey:    sortKey,
		CreatedAt:  createdAt,
		Poster:     poster,
		TimelineId: id,
	})

	submitted, err := repository.PutNewsfeedEntries(entries)
	return submitted, err
}

func processFollowersRecord(record events.DynamoDBEventRecord) (int, error) {
	poster := record.Change.Keys["poster"].String()
	follower := record.Change.Keys["follower"].String()
	return repository.InsertPosterIntoNewsfeed(follower, poster)
}
