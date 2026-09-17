package main

import (
	"context"
	"encoding/json"
	"fmt"
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

	notifyPurchase(&checkoutSession)

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

// Sends a Discord notification for every completed Stripe checkout session.
// Failures are logged only so the webhook still returns success to Stripe.
func notifyPurchase(checkoutSession *stripe.CheckoutSession) {
	msg := formatPurchaseMessage(checkoutSession)
	if err := discord.SendPurchaseNotification(msg); err != nil {
		log.Errorf("Failed to send purchase Discord notification: %v", err)
	}
}

// Formats a human-readable Discord message for the given checkout session.
func formatPurchaseMessage(checkoutSession *stripe.CheckoutSession) string {
	purchaseType := checkoutSession.Metadata["type"]
	if purchaseType == "" {
		purchaseType = "UNKNOWN"
	}

	username := checkoutSession.ClientReferenceID
	if username == "" {
		username = checkoutSession.Metadata["username"]
	}
	if username == "" {
		username = "anonymous"
	}

	email := ""
	if checkoutSession.CustomerDetails != nil {
		email = checkoutSession.CustomerDetails.Email
	}

	amount := float32(checkoutSession.AmountTotal) / 100
	currency := strings.ToUpper(string(checkoutSession.Currency))
	if currency == "" {
		currency = "USD"
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("💰 New purchase: **%s** — $%.2f %s", purchaseType, amount, currency))
	sb.WriteString(fmt.Sprintf("\n**User:** %s", username))
	if email != "" {
		sb.WriteString(fmt.Sprintf(" (%s)", email))
	}

	switch purchaseType {
	case string(payment.CheckoutSessionType_Subscription):
		if tier := checkoutSession.Metadata["tier"]; tier != "" {
			sb.WriteString(fmt.Sprintf("\n**Tier:** %s", tier))
		}
	case string(payment.CheckoutSessionType_Course):
		if ids := checkoutSession.Metadata["courseIds"]; ids != "" {
			sb.WriteString(fmt.Sprintf("\n**Courses:** %s", ids))
		}
	case string(payment.CheckoutSessionType_Coaching):
		if eventId := checkoutSession.Metadata["eventId"]; eventId != "" {
			sb.WriteString(fmt.Sprintf("\n**Event:** %s", eventId))
		}
		if coach := checkoutSession.Metadata["coachUsername"]; coach != "" {
			sb.WriteString(fmt.Sprintf(" with coach %s", coach))
		}
	case string(payment.CheckoutSessionType_GameReview):
		if reviewType := checkoutSession.Metadata["reviewType"]; reviewType != "" {
			sb.WriteString(fmt.Sprintf("\n**Review type:** %s", reviewType))
		}
		if cohort, id := checkoutSession.Metadata["cohort"], checkoutSession.Metadata["id"]; cohort != "" || id != "" {
			sb.WriteString(fmt.Sprintf(" (%s/%s)", cohort, id))
		}
	}

	sb.WriteString(fmt.Sprintf("\n**Session:** `%s`", checkoutSession.ID))
	return sb.String()
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

	user, shouldSendGameReviewSignup, err := updateSubscriptionAndDetectGameReviewSignup(
		repository,
		checkoutSession.ClientReferenceID,
		&update,
	)
	if err != nil {
		return api.Failure(err)
	}
	if err := discord.SetCohortRole(user); err != nil {
		log.Errorf("Failed to set Discord roles: %v", err)
	}

	if err := database.SendSubscriptionCreatedEvent(user.Username); err != nil {
		log.Errorf("Failed to send subscription created notification: %v", err)
	}
	if shouldSendGameReviewSignup {
		sendGameReviewSignupNotification(user.Username)
	}

	analytics.PurchaseEvent(user, checkoutSession)
	return api.Success(nil)
}

type gameReviewSignupSubscriptionUpdater interface {
	UpdateUser(username string, update *database.UserUpdate) (*database.User, error)
	UpdateUserIfNotGameReview(username string, update *database.UserUpdate) (*database.User, error)
}

func updateSubscriptionAndDetectGameReviewSignup(
	repo gameReviewSignupSubscriptionUpdater,
	username string,
	update *database.UserUpdate,
) (*database.User, bool, error) {
	if update.SubscriptionTier == nil || database.SubscriptionTier(*update.SubscriptionTier) != database.SubscriptionTier_GameReview {
		user, err := repo.UpdateUser(username, update)
		return user, false, err
	}

	user, err := repo.UpdateUserIfNotGameReview(username, update)
	if err == nil {
		return user, true, nil
	}
	if !isConditionalCheckFailed(err) {
		return nil, false, err
	}

	user, err = repo.UpdateUser(username, update)
	return user, false, err
}

func isConditionalCheckFailed(err error) bool {
	var conditionalErr *dynamodb.ConditionalCheckFailedException
	return errors.As(err, &conditionalErr)
}

func sendGameReviewSignupNotification(username string) {
	if err := database.SendGameReviewSignupEvent(username); err != nil {
		log.Errorf("Failed to send game review signup notification: %v", err)
	}
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
	game, err := repository.UpdateGame(cohort, id, &update)
	if err != nil {
		return api.Failure(err)
	}

	if err := database.SendGameReviewSubmittedEvent(game); err != nil {
		log.Errorf("Failed to send game review submitted notification: %v", err)
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

	user, shouldSendGameReviewSignup, err := updateSubscriptionAndDetectGameReviewSignup(
		repository,
		username,
		&update,
	)
	if err != nil {
		return api.Failure(err)
	}
	if err := discord.SetCohortRole(user); err != nil {
		log.Errorf("Failed to set Discord roles: %v", err)
	}
	if shouldSendGameReviewSignup {
		sendGameReviewSignupNotification(user.Username)
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
