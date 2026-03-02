package main

import (
	"context"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/access"
)

var repository database.UserUpdater = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	if strings.Contains(event.RawPath, "/v2") {
		return handlerV2(event), nil
	}

	info := api.GetUserInfo(event)
	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	var isForbidden bool
	subscriptionStatus := user.GetSubscriptionStatus()
	subscriptionTier := user.GetSubscriptionTier()

	if !user.IsSubscribed() || user.PaymentInfo.GetCustomerId() == "" || user.PaymentInfo.GetCustomerId() == "WIX" {
		isForbidden, err = access.IsForbidden(user.WixEmail, 0)
		if isForbidden {
			subscriptionStatus = database.SubscriptionStatus_NotSubscribed
			subscriptionTier = database.SubscriptionTier_Free
		}
	}

	if subscriptionStatus != user.SubscriptionStatus {
		// Cache the user's subscription status, that way future reloads of the
		// frontend immediately show the correct version of the site
		_, err := repository.UpdateUser(info.Username, &database.UserUpdate{
			SubscriptionStatus: aws.String(string(subscriptionStatus)),
			SubscriptionTier:   aws.String(string(subscriptionTier)),
		})
		if err != nil {
			log.Error("Failed UpdateUser: ", err)
		}

		switch user.SubscriptionStatus {
		case database.SubscriptionStatus_Subscribed:
			err = repository.RecordSubscriptionCancelation(user.DojoCohort)
		case database.SubscriptionStatus_NotSubscribed, "FREE_TIER":
			err = repository.RecordFreeTierConversion(user.DojoCohort)
		}
		if err != nil {
			log.Error("Failed to update statistics: ", err)
		}
	}

	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(nil), nil
}

func handlerV2(event api.Request) api.Response {
	info := api.GetUserInfo(event)
	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err)
	}

	subscriptionStatus := user.GetSubscriptionStatus()
	subscriptionTier := user.GetSubscriptionTier()

	// Check Wix users access as it may have changed without our database updating
	if user.PaymentInfo.GetCustomerId() == "" || user.PaymentInfo.GetCustomerId() == "WIX" {
		isForbidden, _ := access.IsForbidden(user.WixEmail, 0)
		if isForbidden {
			subscriptionStatus = database.SubscriptionStatus_NotSubscribed
			subscriptionTier = database.SubscriptionTier_Free
		} else {
			subscriptionStatus = database.SubscriptionStatus_Subscribed
			subscriptionTier = database.SubscriptionTier_Basic
		}
	}

	if subscriptionStatus != user.SubscriptionStatus || subscriptionTier != user.SubscriptionTier {
		// Cache the user's subscription status, that way future reloads of the
		// frontend immediately show the correct version of the site
		user, err = repository.UpdateUser(info.Username, &database.UserUpdate{
			SubscriptionStatus: aws.String(string(subscriptionStatus)),
			SubscriptionTier:   aws.String(string(subscriptionTier)),
		})
		if err != nil {
			log.Error("Failed UpdateUser: ", err)
		}

		if user.IsSubscribed() {
			err = repository.RecordFreeTierConversion(user.DojoCohort)
		} else {
			err = repository.RecordSubscriptionCancelation(user.DojoCohort)
		}

		if err != nil {
			log.Error("Failed to update statistics: ", err)
		}
	}

	return api.Success(user)
}
