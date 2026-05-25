package main

import (
	"context"
	"encoding/json"
	"strings"
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

type putComplimentaryRequest struct {
	SubscriptionTier string `json:"subscriptionTier"`
	ExpiresAt        string `json:"expiresAt"`
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

	var req putComplimentaryRequest
	if err := json.Unmarshal([]byte(event.Body), &req); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)), nil
	}

	tier := database.SubscriptionTier(strings.TrimSpace(req.SubscriptionTier))
	if tier == "" || tier == database.SubscriptionTier_Free {
		return api.Failure(errors.New(400, "Invalid request: subscriptionTier must be a paid tier", "")), nil
	}
	if !validSubscriptionTier(tier) {
		return api.Failure(errors.New(400, "Invalid request: unknown subscriptionTier", "")), nil
	}

	expiresAt := strings.TrimSpace(req.ExpiresAt)
	if expiresAt != "" {
		if _, err := time.Parse(time.RFC3339, expiresAt); err != nil {
			return api.Failure(errors.New(400, "Invalid request: expiresAt must be RFC3339", "")), nil
		}
	}

	user, err := repository.GetUser(targetUsername)
	if err != nil {
		return api.Failure(err), nil
	}

	user, err = database.ExpirePaymentOverrideIfNeeded(repository, targetUsername, user)
	if err != nil {
		return api.Failure(err), nil
	}

	if user.SubscriptionStatus == database.SubscriptionStatus_Subscribed &&
		database.IsStripeCustomerID(user.PaymentInfo.GetCustomerId()) {
		return api.Failure(errors.New(409, "This user has an active Stripe subscription. Cancel or adjust it in Stripe before granting complimentary access.", "")), nil
	}

	var pi database.PaymentInfo
	if user.PaymentInfo != nil {
		pi = *user.PaymentInfo
	}
	pi.CustomerId = database.PaymentCustomerIdOverride
	pi.SubscriptionId = ""
	pi.UpdatedAt = time.Now().Format(time.RFC3339)
	pi.ExpiresAt = expiresAt
	pi.OverrideRevokedAt = ""
	pi.OverrideRevokedBy = ""
	pi.OverrideUpdatedAt = pi.UpdatedAt
	pi.OverrideUpdatedBy = info.Username

	if pi.OverrideGrantedAt == "" {
		pi.OverrideGrantedAt = pi.UpdatedAt
	}
	if pi.OverrideGrantedBy == "" {
		pi.OverrideGrantedBy = info.Username
	}

	update := &database.UserUpdate{
		SubscriptionStatus: aws.String(string(database.SubscriptionStatus_Subscribed)),
		SubscriptionTier:   aws.String(string(tier)),
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

func validSubscriptionTier(t database.SubscriptionTier) bool {
	switch t {
	case database.SubscriptionTier_Basic,
		database.SubscriptionTier_Lecture,
		database.SubscriptionTier_GameReview:
		return true
	default:
		return false
	}
}
