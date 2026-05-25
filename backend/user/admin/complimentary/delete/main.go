package main

import (
	"context"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
)

var repository = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	caller, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	if !caller.IsAdmin {
		return api.Failure(errors.New(403, "Forbidden", "")), nil
	}

	targetUsername := event.PathParameters["username"]
	if targetUsername == "" {
		return api.Failure(errors.New(400, "Invalid request: username path parameter is required", "")), nil
	}

	user, err := repository.GetUser(targetUsername)
	if err != nil {
		return api.Failure(err), nil
	}

	if user.PaymentInfo == nil || user.PaymentInfo.CustomerId != database.PaymentCustomerIdOverride {
		return api.Failure(errors.New(400, "Invalid request: user does not have an active admin complimentary subscription", "")), nil
	}

	now := time.Now().Format(time.RFC3339)
	pi := database.PaymentInfo{
		UpdatedAt:         now,
		OverrideRevokedAt: now,
		OverrideRevokedBy: info.Username,
	}

	update := &database.UserUpdate{
		SubscriptionStatus: aws.String(string(database.SubscriptionStatus_NotSubscribed)),
		SubscriptionTier:   aws.String(string(database.SubscriptionTier_Free)),
		PaymentInfo:        &pi,
	}

	newUser, err := repository.UpdateUser(targetUsername, update)
	if err != nil {
		return api.Failure(err), nil
	}
	if err := discord.SetCohortRole(newUser); err != nil {
		log.Errorf("Failed to set Discord roles: %v", err)
	}

	return api.Success(newUser), nil
}
