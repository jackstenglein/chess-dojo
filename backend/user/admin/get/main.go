package main

import (
	"context"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

type adminGetUserResponse struct {
	User       *database.User `json:"user"`
	AdminHints adminHints     `json:"adminHints"`
}

type adminHints struct {
	BillingPath string `json:"billingPath"`
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

	user, err = database.ExpirePaymentOverrideIfNeeded(repository, targetUsername, user)
	if err != nil {
		return api.Failure(err), nil
	}

	resp := adminGetUserResponse{
		User: user,
		AdminHints: adminHints{
			BillingPath: billingPathHint(user),
		},
	}

	return api.Success(resp), nil
}

func billingPathHint(user *database.User) string {
	now := time.Now()
	if database.IsPaymentOverrideActive(user.PaymentInfo, now) {
		return "override"
	}
	cid := user.PaymentInfo.GetCustomerId()
	if database.IsStripeCustomerID(cid) {
		return "stripe"
	}
	if cid == "WIX" || (cid == "" && user.IsSubscribed()) {
		return "wix"
	}
	return "none"
}
