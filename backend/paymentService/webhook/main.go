package main

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/davecgh/go-spew/spew"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/analytics"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
	payment "github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService/secrets"
	stripe "github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/webhook"
)

var repository = database.DynamoDB
var endpointSecret = ""

func init() {
	key, err := secrets.GetApiKey()
	if err != nil {
		log.Error("Failed to get Stripe key: ", err)
		return
	}
	stripe.Key = key

	endpointSecret, err = secrets.GetEndpointSecret()
	if err != nil {
		log.Error("Failed to get Stripe endpoint secret: ", err)
	}
}

func main() {
	lambda.Start(handler)
}

// handler responds to Stripe webhook events.
func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	signatureHeader, ok := event.Headers["stripe-signature"]
	if !ok {
		err := errors.New(400, "Invalid request: missing stripe signature", "")
		return api.Failure(err), nil
	}

	stripeEvent, err := webhook.ConstructEvent([]byte(event.Body), signatureHeader, endpointSecret)
	if err != nil {
		err = errors.Wrap(400, "Invalid request: stripe signature did not verify", "", err)
		return api.Failure(err), nil
	}

	str := spew.Sdump(stripeEvent)
	log.Debugf("Stripe Event: %s", str)

	switch stripeEvent.Type {
	case "checkout.session.completed":
		return handleCheckoutSessionCompleted(&stripeEvent), nil

	case "checkout.session.expired":
		return handleCheckoutSessionExpired(&stripeEvent), nil

	case "customer.subscription.deleted":
		return handleSubscriptionDeletion(&stripeEvent), nil

	case "customer.subscription.updated":
		return handleSubscriptionUpdated(&stripeEvent), nil

	default:
		log.Debugf("Unhandled event type: %s", stripeEvent.Type)
	}

	return api.Success(nil), nil
}

// Responds to Stripe checkout.session.completed events.
func handleCheckoutSessionCompleted(event *stripe.Event) api.Response {
	var checkoutSession stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &checkoutSession); err != nil {
		err := errors.Wrap(400, "Invalid request: unable to unmarshal event data", "", err)
		return api.Failure(err)
	}

	str := spew.Sdump(checkoutSession)
	log.Debugf("Got checkout session: %s", str)

	checkoutType := checkoutSession.Metadata["type"]
	switch checkoutType {
	case string(payment.CheckoutSessionType_Course):
		return handleCoursePurchase(checkoutSession.ClientReferenceID, strings.Split(checkoutSession.Metadata["courseIds"], ","))
	case string(payment.CheckoutSessionType_Subscription):
		return handleSubscriptionPurchase(&checkoutSession)
	case string(payment.CheckoutSessionType_Coaching):
		return handleCoachingPurchase(&checkoutSession)
	case string(payment.CheckoutSessionType_GameReview):
		return handleGameReviewPurchase(&checkoutSession)
	}

	return api.Success(nil)
}

// Saves the given courseIds in the provided user's PurchasedCourses map.
func handleCoursePurchase(username string, courseIds []string) api.Response {
	if username == "" {
		// Course purchased by anonymous user
		return api.Success(nil)
	}

	user, err := repository.GetUser(username)
	if err != nil {
		return api.Failure(err)
	}

	if user.PurchasedCourses == nil {
		user.PurchasedCourses = make(map[string]bool)
	}

	for _, id := range courseIds {
		user.PurchasedCourses[id] = true
	}

	_, err = repository.UpdateUser(username, &database.UserUpdate{
		PurchasedCourses: &user.PurchasedCourses,
	})
	if err != nil {
		return api.Failure(err)
	}
	return api.Success(nil)
}

// Handles saving a subscription purchase on the user in the checkout session.
func handleSubscriptionPurchase(checkoutSession *stripe.CheckoutSession) api.Response {
	if checkoutSession.ClientReferenceID == "" {
		return api.Failure(errors.New(400, "Invalid request: no clientReferenceId included", ""))
	}

	tier := database.SubscriptionTier(checkoutSession.Metadata["tier"])
	if tier == "" {
		tier = database.SubscriptionTier_Basic
	}

	paymentInfo := database.PaymentInfo{
		CustomerId:     checkoutSession.Customer.ID,
		SubscriptionId: checkoutSession.Subscription.ID,
		UpdatedAt:      time.Now().Format(time.RFC3339),
	}
	update := database.UserUpdate{
		PaymentInfo:        &paymentInfo,
		SubscriptionStatus: stripe.String(string(database.SubscriptionStatus_Subscribed)),
		SubscriptionTier:   stripe.String(string(tier)),
	}

	user, err := repository.UpdateUser(checkoutSession.ClientReferenceID, &update)
	if err != nil {
		return api.Failure(err)
	}
	if err := discord.SetCohortRole(user); err != nil {
		log.Errorf("Failed to set Discord roles: %v", err)
	}

	if err := database.SendSubscriptionCreatedEvent(user.Username); err != nil {
		log.Errorf("Failed to send subscription created notification: %v", err)
	}

	analytics.PurchaseEvent(user, checkoutSession)
	return api.Success(nil)
}

// Handles a successful coaching lesson purchase by setting the event participant's
// stripe data.
func handleCoachingPurchase(checkoutSession *stripe.CheckoutSession) api.Response {
	username := checkoutSession.Metadata["username"]
	eventId := checkoutSession.Metadata["eventId"]

	if username == "" || eventId == "" {
		return api.Failure(errors.New(400, "Invalid request: username and eventId are required metadata", ""))
	}

	if _, err := repository.MarkParticipantPaid(eventId, username, checkoutSession); err != nil {
		return api.Failure(err)
	}
	return api.Success(nil)
}

// Handles a successful game review purchase by setting the game's review data.
func handleGameReviewPurchase(checkoutSession *stripe.CheckoutSession) api.Response {
	cohort := checkoutSession.Metadata["cohort"]
	id := checkoutSession.Metadata["id"]
	reviewType := database.GameReviewType(checkoutSession.Metadata["reviewType"])

	if cohort == "" || id == "" || reviewType == "" {
		return api.Failure(errors.New(400, "Invalid request: missing metadata", ""))
	}

	status := database.GameReviewStatus_Pending
	update := database.GameUpdate{
		ReviewStatus:      &status,
		ReviewRequestedAt: stripe.String(time.Now().Format(time.RFC3339)),
		Review: &database.GameReview{
			Type:     reviewType,
			StripeId: checkoutSession.ID,
		},
	}
	if _, err := repository.UpdateGame(cohort, id, &update); err != nil {
		return api.Failure(err)
	}
	return api.Success(nil)
}

// Handles a Stripe checkout session expiring.
func handleCheckoutSessionExpired(event *stripe.Event) api.Response {
	var checkoutSession stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &checkoutSession); err != nil {
		err := errors.Wrap(400, "Invalid request: unable to unmarshall event data", "", err)
		return api.Failure(err)
	}
	log.Debugf("Checkout session expired: %s", spew.Sdump(checkoutSession))

	checkoutType := checkoutSession.Metadata["type"]
	switch checkoutType {
	case string(payment.CheckoutSessionType_Coaching):
		return handleCoachingSessionExpired(&checkoutSession)
	}

	log.Debugf("Unhandled checkout session type: %s", checkoutType)
	return api.Success(nil)
}

// Handles a Stripe checkout session for a coaching lesson expiring.
func handleCoachingSessionExpired(checkoutSession *stripe.CheckoutSession) api.Response {
	username := checkoutSession.Metadata["username"]
	coachUsername := checkoutSession.Metadata["coachUsername"]
	eventId := checkoutSession.Metadata["eventId"]

	if username == "" || coachUsername == "" || eventId == "" {
		return api.Failure(errors.New(400, "Invalid request: username, coachUsername and eventId are required metadata", ""))
	}

	participant := database.Participant{
		Username: username,
	}
	event := database.Event{
		Id:    eventId,
		Owner: coachUsername,
		Participants: map[string]*database.Participant{
			username: &participant,
		},
	}
	_, err := repository.LeaveEvent(&event, &participant, true)
	if err != nil {
		var lerr *errors.Error
		if errors.As(err, &lerr) {
			if _, ok := lerr.Cause.(*dynamodb.ConditionalCheckFailedException); ok {
				return api.Success(nil)
			}
		}
		return api.Failure(errors.Wrap(500, "Temporary server error", "Failed to leave event", err))
	}

	return api.Success(nil)
}

// Handles deleting a subscription on the user in the subscription metadata.
func handleSubscriptionDeletion(event *stripe.Event) api.Response {
	var subscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
		err := errors.Wrap(400, "Invalid request: unable to unmarshal event data", "", err)
		return api.Failure(err)
	}

	str := spew.Sdump(subscription)
	log.Debugf("Got subscription: %s", str)

	username := subscription.Metadata["username"]
	if username == "" {
		return api.Failure(errors.New(400, "Invalid request: no username in subscription metadata", ""))
	}

	paymentInfo := database.PaymentInfo{
		CustomerId:     subscription.Customer.ID,
		SubscriptionId: subscription.ID,
		UpdatedAt:      time.Now().Format(time.RFC3339),
	}
	update := database.UserUpdate{
		PaymentInfo:        &paymentInfo,
		SubscriptionStatus: stripe.String(string(database.SubscriptionStatus_Canceled)),
		SubscriptionTier:   stripe.String(string(database.SubscriptionTier_Free)),
	}

	user, err := repository.UpdateUser(username, &update)
	if err != nil {
		return api.Failure(err)
	}
	if err := discord.SetCohortRole(user); err != nil {
		log.Errorf("Failed to set Discord roles: %v", err)
	}
	return api.Success(nil)
}

// Handles updating a subscription on the user in the subscription metadata.
func handleSubscriptionUpdated(event *stripe.Event) api.Response {
	var subscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
		err := errors.Wrap(400, "Invalid request: unable to unmarshal event data", "", err)
		return api.Failure(err)
	}

	str := spew.Sdump(subscription)
	log.Debugf("Got subscription: %s", str)

	if subscription.Status != "active" {
		log.Infof("Subscription has status %q, so no action is necessary", subscription.Status)
		return api.Success(nil)
	}

	username := subscription.Metadata["username"]
	if username == "" {
		return api.Failure(errors.New(400, "Invalid request: no username in subscription metadata", ""))
	}
	tier, err := getTier(&subscription)
	if err != nil {
		return api.Failure(err)
	}

	paymentInfo := database.PaymentInfo{
		CustomerId:     subscription.Customer.ID,
		SubscriptionId: subscription.ID,
		UpdatedAt:      time.Now().Format(time.RFC3339),
	}
	update := database.UserUpdate{
		PaymentInfo:        &paymentInfo,
		SubscriptionStatus: stripe.String(string(database.SubscriptionStatus_Subscribed)),
		SubscriptionTier:   stripe.String(string(tier)),
	}

	user, err := repository.UpdateUser(username, &update)
	if err != nil {
		return api.Failure(err)
	}
	if err := discord.SetCohortRole(user); err != nil {
		log.Errorf("Failed to set Discord roles: %v", err)
	}

	return api.Success(nil)
}

// Returns the tier for the given stripe subscription by checking the metadata of its first price.
func getTier(subscription *stripe.Subscription) (database.SubscriptionTier, error) {
	if subscription.Items == nil {
		return "", errors.New(400, "no items in subscription", "")
	}
	if len(subscription.Items.Data) == 0 {
		return "", errors.New(400, "no data in subscription.items", "")
	}
	if subscription.Items.Data[0].Price == nil {
		return "", errors.New(400, "no price in subscription.items.data[0]", "")
	}
	tier := subscription.Items.Data[0].Price.Metadata["tier"]
	if tier == "" {
		return "", errors.New(400, "no tier in subscription.items.data[0].price.metadata", "")
	}
	return database.SubscriptionTier(tier), nil
}
