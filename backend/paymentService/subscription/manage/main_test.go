package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	stripe "github.com/stripe/stripe-go/v81"
)

type mockUserGetter struct {
	user *database.User
	err  error
}

func (m *mockUserGetter) GetUser(username string) (*database.User, error) {
	return m.user, m.err
}

func manageEvent(body string) api.Request {
	return api.Request{
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			RequestID: "test-request",
			Authorizer: &events.APIGatewayV2HTTPRequestContextAuthorizerDescription{
				JWT: &events.APIGatewayV2HTTPRequestContextAuthorizerJWTDescription{
					Claims: map[string]string{
						"cognito:username": "test-user",
					},
				},
			},
		},
		Body: body,
	}
}

func resetManageDependencies(t *testing.T) func() {
	t.Helper()

	originalRepository := repository
	originalGetBillingPortalSession := getBillingPortalSession

	return func() {
		repository = originalRepository
		getBillingPortalSession = originalGetBillingPortalSession
	}
}

func TestHandlerAllowsOverrideWithPreservedStripeCustomer(t *testing.T) {
	restore := resetManageDependencies(t)
	defer restore()

	repository = &mockUserGetter{
		user: &database.User{
			PaymentInfo: &database.PaymentInfo{
				CustomerId:              database.PaymentCustomerIdOverride,
				PreservedCustomerId:     "cus_preserved123",
				PreservedSubscriptionId: "sub_preserved123",
			},
		},
	}

	var gotCustomerId string
	var gotSubscriptionId string
	getBillingPortalSession = func(paymentInfo *database.PaymentInfo, tier database.SubscriptionTier, interval string) (*stripe.BillingPortalSession, error) {
		gotCustomerId = paymentInfo.GetCustomerId()
		gotSubscriptionId = paymentInfo.GetSubscriptionId()
		return &stripe.BillingPortalSession{URL: "https://billing.stripe.test/session"}, nil
	}

	resp, err := handler(context.Background(), manageEvent(`{}`))
	if err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, want 200; body = %s", resp.StatusCode, resp.Body)
	}
	if gotCustomerId != "cus_preserved123" {
		t.Fatalf("customer id passed to Stripe = %q, want cus_preserved123", gotCustomerId)
	}
	if gotSubscriptionId != "sub_preserved123" {
		t.Fatalf("subscription id passed to Stripe = %q, want sub_preserved123", gotSubscriptionId)
	}

	var body SubscriptionManageResponse
	if err := json.Unmarshal([]byte(resp.Body), &body); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if body.Url != "https://billing.stripe.test/session" {
		t.Fatalf("url = %q, want billing session URL", body.Url)
	}
}

func TestHandlerRejectsOverrideWithoutPreservedStripeCustomer(t *testing.T) {
	restore := resetManageDependencies(t)
	defer restore()

	repository = &mockUserGetter{
		user: &database.User{
			PaymentInfo: &database.PaymentInfo{
				CustomerId: database.PaymentCustomerIdOverride,
			},
		},
	}

	calledStripe := false
	getBillingPortalSession = func(paymentInfo *database.PaymentInfo, tier database.SubscriptionTier, interval string) (*stripe.BillingPortalSession, error) {
		calledStripe = true
		return &stripe.BillingPortalSession{URL: "https://billing.stripe.test/session"}, nil
	}

	resp, err := handler(context.Background(), manageEvent(`{}`))
	if err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Fatalf("status = %d, want 400; body = %s", resp.StatusCode, resp.Body)
	}
	if calledStripe {
		t.Fatal("Stripe billing portal session should not be created for OVERRIDE without preserved customer")
	}
}
