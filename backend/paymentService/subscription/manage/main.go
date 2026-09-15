package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	payment "github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService"
)

var repository database.UserGetter = database.DynamoDB
var getBillingPortalSession = payment.GetBillingPortalSession

type SubscriptionManageRequest struct {
	Tier     database.SubscriptionTier `json:"tier"`
	Interval string                    `json:"interval"`
}

type SubscriptionManageResponse struct {
	Url string `json:"url"`
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	paymentInfo := billingPortalPaymentInfo(user.PaymentInfo)
	if !isValidCustomerId(paymentInfo.GetCustomerId()) {
		return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: user has invalid Stripe customer ID %q", paymentInfo.GetCustomerId()), "")), nil
	}

	var request SubscriptionManageRequest
	if err := json.Unmarshal([]byte(event.Body), &request); err != nil {
		return api.Failure(errors.Wrap(400, "Failed to unmarshal request body", "", err)), nil
	}

	if request.Tier != "" && paymentInfo.GetSubscriptionId() == "" {
		return api.Failure(errors.New(400, "Invalid request: subscription tier specified but user has no subscription ID", "")), nil
	}

	session, err := getBillingPortalSession(paymentInfo, request.Tier, request.Interval)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(SubscriptionManageResponse{Url: session.URL}), nil
}

func billingPortalPaymentInfo(paymentInfo *database.PaymentInfo) *database.PaymentInfo {
	if paymentInfo == nil {
		return nil
	}

	if paymentInfo.CustomerId == database.PaymentCustomerIdOverride && database.IsStripeCustomerID(paymentInfo.PreservedCustomerId) {
		portalPaymentInfo := *paymentInfo
		portalPaymentInfo.CustomerId = paymentInfo.PreservedCustomerId
		portalPaymentInfo.SubscriptionId = paymentInfo.PreservedSubscriptionId
		return &portalPaymentInfo
	}

	return paymentInfo
}

func isValidCustomerId(customerID string) bool {
	return customerID != "" && customerID != "WIX" && customerID != database.PaymentCustomerIdOverride
}
