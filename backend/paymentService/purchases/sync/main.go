package main

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	payment "github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService"
	"github.com/stripe/stripe-go/v81"
)

var repository = database.DynamoDB

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	var checkoutIds map[string]string
	if err := json.Unmarshal([]byte(event.Body), &checkoutIds); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: body could not be unmarshalled", "", err)), nil
	}

	if len(checkoutIds) == 0 {
		return api.Failure(errors.New(400, "Invalid request: no checkout ids to sync", "")), nil
	}

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	if user.PurchasedCourses == nil {
		user.PurchasedCourses = make(map[string]bool)
	}

	for _, checkoutId := range checkoutIds {
		checkoutSession, err := payment.GetCheckoutSession(checkoutId)
		if err != nil {
			return api.Failure(err), nil
		}
		if checkoutSession.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
			return api.Failure(errors.New(400, "Invalid request: only paid checkout sessions can be synced", "")), nil
		}

		courseIds := strings.SplitSeq(checkoutSession.Metadata["courseIds"], ",")
		for courseId := range courseIds {
			user.PurchasedCourses[courseId] = true
		}
	}

	user, err = repository.UpdateUser(info.Username, &database.UserUpdate{
		PurchasedCourses: &user.PurchasedCourses,
	})
	if err != nil {
		return api.Failure(err), nil
	}
	return api.Success(user), nil
}
