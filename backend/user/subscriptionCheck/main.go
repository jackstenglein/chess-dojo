package main

import (
	"context"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/access"
)

type Event events.CloudWatchEvent

var repository = database.DynamoDB
var monthAgo = time.Now().Add(database.ONE_MONTH_AGO).Format(time.RFC3339)

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event Event) (Event, error) {
	log.Infof("Event: %#v", event)
	log.SetRequestId(event.ID)

	var queuedUpdates []*database.User

	for _, cohort := range database.Cohorts {
		log.Debugf("Processing cohort %s", cohort)

		var users []*database.User
		var startKey = ""
		var err error
		for ok := true; ok; ok = startKey != "" {
			users, startKey, err = repository.ListUserRatings(cohort, startKey)
			if err != nil {
				log.Errorf("Failed to scan users: %v", err)
				return event, err
			}

			log.Infof("Processing %d users", len(users))
			for _, u := range users {
				shouldUpdate := updateUser(u)
				if shouldUpdate {
					queuedUpdates = append(queuedUpdates, u)
					if len(queuedUpdates) == 25 {
						if err := repository.UpdateUserSubscriptionStatuses(queuedUpdates); err != nil {
							log.Error(err)
						} else {
							log.Infof("Updated %d users", len(queuedUpdates))
						}
						queuedUpdates = nil
					}
				}
			}
		}
	}

	if len(queuedUpdates) > 0 {
		if err := repository.UpdateUserSubscriptionStatuses(queuedUpdates); err != nil {
			log.Error(err)
		} else {
			log.Infof("Updated %d users", len(queuedUpdates))
		}
	}

	return event, nil
}

func updateUser(user *database.User) bool {
	if user.UpdatedAt >= monthAgo {
		return false
	}
	if !isWix(user) {
		return false
	}

	isForbidden, _ := access.IsForbidden(user.WixEmail, 0)
	if !isForbidden {
		return false
	}

	user.SubscriptionStatus = database.SubscriptionStatus_Canceled
	user.SubscriptionTier = database.SubscriptionTier_Free
	return true
}

func isWix(user *database.User) bool {
	return user.PaymentInfo.GetCustomerId() == "" || user.PaymentInfo.GetCustomerId() == "WIX"
}
