package payment

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService/secrets"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/account"
	"github.com/stripe/stripe-go/v81/accountlink"
	bpsession "github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/loginlink"
	"github.com/stripe/stripe-go/v81/refund"
	"github.com/stripe/stripe-go/v81/subscription"
)

var frontendHost = os.Getenv("frontendHost")

var quickGameReviewPriceId = os.Getenv("quickGameReviewPriceId")
var deepGameReviewPriceId = os.Getenv("deepGameReviewPriceId")

type CheckoutSessionType string

const (
	CheckoutSessionType_Course       CheckoutSessionType = "COURSE"
	CheckoutSessionType_Subscription CheckoutSessionType = "SUBSCRIPTION"
	CheckoutSessionType_Coaching     CheckoutSessionType = "COACHING"
	CheckoutSessionType_GameReview   CheckoutSessionType = "GAME_REVIEW"
)

func init() {
	key, err := secrets.GetApiKey()
	if err != nil {
		log.Error("Failed to get Stripe key: ", err)
		return
	}
	stripe.Key = key
}

func PurchaseCourseUrl(user *database.User, course *database.Course, purchaseOption database.CoursePurchaseOption, cancelUrl string) (string, error) {
	price := purchaseOption.FullPrice
	if purchaseOption.CurrentPrice > 0 {
		price = purchaseOption.CurrentPrice
	}

	courseIds := course.Id
	if len(purchaseOption.CourseIds) > 0 {
		courseIds = strings.Join(purchaseOption.CourseIds, ",")
	}

	courseUrl := fmt.Sprintf("%s/courses/%s/%s", frontendHost, course.Type, course.Id)

	if cancelUrl == "" {
		cancelUrl = courseUrl
	}

	params := &stripe.CheckoutSessionParams{
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency:   stripe.String("usd"),
					UnitAmount: stripe.Int64(int64(price)),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(purchaseOption.Name),
						Description: stripe.String(course.Description),
					},
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
			Metadata: map[string]string{
				"type":      string(CheckoutSessionType_Course),
				"courseIds": courseIds,
			},
			Description:         stripe.String("Course"),
			StatementDescriptor: stripe.String("ChessDojo Course"),
		},
		SuccessURL:          stripe.String(fmt.Sprintf("%s?checkout={CHECKOUT_SESSION_ID}", courseUrl)),
		CancelURL:           stripe.String(cancelUrl),
		AllowPromotionCodes: stripe.Bool(true),
		Metadata: map[string]string{
			"type":      string(CheckoutSessionType_Course),
			"courseIds": courseIds,
		},
	}

	if user != nil {
		params.ClientReferenceID = stripe.String(user.Username)
		params.AddMetadata("username", user.Username)
		params.PaymentIntentData.AddMetadata("username", user.Username)

		if user.PaymentInfo.GetCustomerId() != "" {
			params.Customer = stripe.String(user.PaymentInfo.GetCustomerId())
		}
	}

	checkoutSession, err := session.New(params)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to create Stripe checkout session", err)
	}

	return checkoutSession.URL, nil
}

var subscriptionPriceIds = map[database.SubscriptionTier]map[string]string{
	"": { // Empty string matches basic for legacy requests
		string(stripe.PriceRecurringIntervalMonth): os.Getenv("monthlyPriceId"),
		string(stripe.PriceRecurringIntervalYear):  os.Getenv("yearlyPriceId"),
	},
	database.SubscriptionTier_Basic: {
		string(stripe.PriceRecurringIntervalMonth): os.Getenv("monthlyPriceId"),
		string(stripe.PriceRecurringIntervalYear):  os.Getenv("yearlyPriceId"),
	},
	database.SubscriptionTier_Lecture: {
		string(stripe.PriceRecurringIntervalMonth): os.Getenv("lectureTierMonthlyPriceId"),
	},
	database.SubscriptionTier_GameReview: {
		string(stripe.PriceRecurringIntervalMonth): os.Getenv("gameReviewTierMonthlyPriceId"),
	},
}

var presalePriceIds = map[database.SubscriptionTier]string{
	database.SubscriptionTier_Lecture:    os.Getenv("lectureTierPresalePriceId"),
	database.SubscriptionTier_GameReview: os.Getenv("gameReviewTierPresalePriceId"),
}

type PurchaseSubscriptionRequest struct {
	Tier       database.SubscriptionTier `json:"tier"`
	Interval   string                    `json:"interval"`
	SuccessUrl string                    `json:"successUrl"`
	CancelUrl  string                    `json:"cancelUrl"`
}

func getPriceId(request *PurchaseSubscriptionRequest) (string, error) {
	tier, ok := subscriptionPriceIds[request.Tier]
	if !ok {
		return "", errors.New(400, fmt.Sprintf("Invalid request: tier %q is not recognized", request.Tier), "")
	}
	priceId, ok := tier[request.Interval]
	if !ok || priceId == "" {
		return "", errors.New(400, fmt.Sprintf("Invalid request: interval %q is not recognized for tier %q", request.Interval, request.Tier), "")
	}
	return priceId, nil
}

var jan1, _ = time.Parse(time.RFC3339, "2026-01-01T00:00:00Z")
var feb1, _ = time.Parse(time.RFC3339, "2026-02-01T00:00:00Z")

// TODO: delete this after Jan 1, 2026
func updateCheckoutSessionForPresale(request *PurchaseSubscriptionRequest, params *stripe.CheckoutSessionParams) {
	priceId := presalePriceIds[request.Tier]
	if priceId == "" {
		return
	}

	if time.Now().After(jan1) {
		return
	}

	params.LineItems = append(params.LineItems, &stripe.CheckoutSessionLineItemParams{
		Price:    stripe.String(priceId),
		Quantity: stripe.Int64(1),
	})
	params.SubscriptionData.TrialEnd = stripe.Int64(feb1.Unix())
}

func PurchaseSubscriptionUrl(user *database.User, request *PurchaseSubscriptionRequest, userAgent, ipAddress string) (string, error) {
	if user == nil {
		return "", errors.New(400, "Invalid request: user is not authenticated", "")
	}

	priceId, err := getPriceId(request)
	if err != nil {
		return "", err
	}

	successUrl := request.SuccessUrl
	if successUrl == "" {
		successUrl = frontendHost
	} else if !strings.HasPrefix(successUrl, frontendHost) {
		successUrl = frontendHost + successUrl
	}

	cancelUrl := request.CancelUrl
	if cancelUrl == "" {
		cancelUrl = frontendHost
	} else if !strings.HasPrefix(cancelUrl, frontendHost) {
		cancelUrl = frontendHost + cancelUrl
	}

	params := &stripe.CheckoutSessionParams{
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceId),
				Quantity: stripe.Int64(1),
			},
		},
		Mode:                stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL:          stripe.String(successUrl),
		CancelURL:           stripe.String(cancelUrl),
		ClientReferenceID:   stripe.String(user.Username),
		AllowPromotionCodes: stripe.Bool(true),
		Metadata: map[string]string{
			"type":      string(CheckoutSessionType_Subscription),
			"userAgent": userAgent,
			"ipAddress": ipAddress,
			"username":  user.Username,
			"tier":      string(request.Tier),
		},
		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			TrialSettings: &stripe.CheckoutSessionSubscriptionDataTrialSettingsParams{
				EndBehavior: &stripe.CheckoutSessionSubscriptionDataTrialSettingsEndBehaviorParams{
					MissingPaymentMethod: stripe.String(string(stripe.SubscriptionTrialSettingsEndBehaviorMissingPaymentMethodCancel)),
				},
			},
			Metadata: map[string]string{
				"username":     user.Username,
				"originalTier": string(request.Tier),
			},
		},
		PaymentMethodCollection: stripe.String(string(stripe.CheckoutSessionPaymentMethodCollectionAlways)),
	}

	if customerId := user.PaymentInfo.GetCustomerId(); customerId != "" && customerId != "WIX" && customerId != "OVERRIDE" {
		params.Customer = stripe.String(customerId)
	}

	// TODO: remove after Jan 1, 2026
	updateCheckoutSessionForPresale(request, params)

	checkoutSession, err := session.New(params)
	if err != nil {
		return "", errors.Wrap(500, "Temporary server error", "Failed to create Stripe checkout session", err)
	}
	return checkoutSession.URL, nil
}

func CoachingCheckoutSession(user *database.User, event *database.Event) (*stripe.CheckoutSession, error) {
	price := event.Coaching.FullPrice
	if event.Coaching.CurrentPrice > 0 {
		price = event.Coaching.CurrentPrice
	}
	fee := price / 5

	expiration := time.Now().Add(31 * time.Minute).Unix()

	params := &stripe.CheckoutSessionParams{
		ClientReferenceID: stripe.String(user.Username),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency:   stripe.String("usd"),
					UnitAmount: stripe.Int64(int64(price)),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(fmt.Sprintf("Coaching Session with %s", event.OwnerDisplayName)),
						Description: stripe.String(event.Description),
					},
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
			ApplicationFeeAmount: stripe.Int64(int64(fee)),
			TransferData: &stripe.CheckoutSessionPaymentIntentDataTransferDataParams{
				Destination: stripe.String(event.Coaching.StripeId),
			},
			Metadata: map[string]string{
				"type":          string(CheckoutSessionType_Coaching),
				"eventId":       event.Id,
				"coachStripeId": event.Coaching.StripeId,
				"coachUsername": event.Owner,
				"username":      user.Username,
			},
			Description:         stripe.String("Coaching Session"),
			StatementDescriptor: stripe.String("ChessDojo Coaching"),
		},
		ExpiresAt:  stripe.Int64(expiration),
		SubmitType: stripe.String(string(stripe.CheckoutSessionSubmitTypeBook)),
		SuccessURL: stripe.String(fmt.Sprintf("%s/meeting/%s", frontendHost, event.Id)),
		CancelURL:  stripe.String(fmt.Sprintf("%s/meeting/%s/cancel", frontendHost, event.Id)),
		Metadata: map[string]string{
			"type":          string(CheckoutSessionType_Coaching),
			"eventId":       event.Id,
			"coachStripeId": event.Coaching.StripeId,
			"coachUsername": event.Owner,
			"username":      user.Username,
		},
	}

	if user.PaymentInfo.GetCustomerId() != "" {
		params.Customer = stripe.String(user.PaymentInfo.GetCustomerId())
	}

	checkoutSession, err := session.New(params)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create Stripe checkout session", err)
	}
	return checkoutSession, nil
}

func GameReviewCheckoutSession(user *database.User, cohort, id string, reviewType database.GameReviewType) (*stripe.CheckoutSession, error) {
	var priceId string
	if reviewType == database.GameReviewType_Quick {
		priceId = quickGameReviewPriceId
	} else if reviewType == database.GameReviewType_DeepDive {
		priceId = deepGameReviewPriceId
	} else {
		return nil, errors.New(400, fmt.Sprintf("Invalid review type %q", reviewType), "")
	}

	params := &stripe.CheckoutSessionParams{
		ClientReferenceID: stripe.String(user.Username),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceId),
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(fmt.Sprintf("%s/games/%s/%s", frontendHost, cohort, id)),
		CancelURL:  stripe.String(fmt.Sprintf("%s/games/%s/%s", frontendHost, cohort, id)),
		Metadata: map[string]string{
			"type":       string(CheckoutSessionType_GameReview),
			"reviewType": string(reviewType),
			"cohort":     cohort,
			"id":         id,
			"username":   user.Username,
		},
	}

	if user.PaymentInfo.GetCustomerId() != "" {
		params.Customer = stripe.String(user.PaymentInfo.GetCustomerId())
	}

	checkoutSession, err := session.New(params)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create checkout session", err)
	}
	return checkoutSession, nil
}

func GetCheckoutSession(id string) (*stripe.CheckoutSession, error) {
	session, err := session.Get(id, nil)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to get Stripe checkout session", err)
	}
	return session, nil
}

func GetBillingPortalSession(paymentInfo *database.PaymentInfo, tier database.SubscriptionTier, interval string) (*stripe.BillingPortalSession, error) {
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(paymentInfo.GetCustomerId()),
		ReturnURL: stripe.String(fmt.Sprintf("%s/profile/edit", frontendHost)),
	}

	if tier != "" && interval != "" {
		result, err := subscription.Get(paymentInfo.GetSubscriptionId(), &stripe.SubscriptionParams{})
		if err != nil {
			return nil, errors.Wrap(500, "Failed to create Stripe Billing Portal session", "Failed to fetch current subscription", err)
		}

		params.FlowData = &stripe.BillingPortalSessionFlowDataParams{
			Type: stripe.String("subscription_update_confirm"),
			SubscriptionUpdateConfirm: &stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmParams{
				Subscription: stripe.String(paymentInfo.GetSubscriptionId()),
				Items: []*stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmItemParams{
					{
						ID:       stripe.String(result.Items.Data[0].ID),
						Quantity: stripe.Int64(1),
						Price:    stripe.String(subscriptionPriceIds[tier][interval]),
					},
				},
			},
		}
		params.ReturnURL = stripe.String(fmt.Sprintf("%s/profile", frontendHost))
	}

	session, err := bpsession.New(params)
	if err != nil && strings.Contains(err.Error(), "does not include the price") {
		params.FlowData = &stripe.BillingPortalSessionFlowDataParams{
			Type: stripe.String("subscription_update"),
			SubscriptionUpdate: &stripe.BillingPortalSessionFlowDataSubscriptionUpdateParams{
				Subscription: stripe.String(paymentInfo.GetSubscriptionId()),
			},
		}
		session, err = bpsession.New(params)
	}
	if err != nil {
		return nil, errors.Wrap(500, "Failed to create Stripe Billing Portal session", "", err)
	}
	return session, nil
}

func CreateConnectedAccount(username, email string) (*stripe.Account, error) {
	params := &stripe.AccountParams{
		Type:         stripe.String(string(stripe.AccountTypeExpress)),
		BusinessType: stripe.String(string(stripe.AccountBusinessTypeIndividual)),
		BusinessProfile: &stripe.AccountBusinessProfileParams{
			ProductDescription: stripe.String("Chess courses and coaching"),
		},
		Email: stripe.String(email),
		Metadata: map[string]string{
			"username": username,
		},
	}
	account, err := account.New(params)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create Stripe account", err)
	}
	return account, nil
}

func DeleteConnectedAccount(stripeId string) error {
	params := &stripe.AccountParams{}
	_, err := account.Del(stripeId, params)
	return errors.Wrap(500, "Temporary server error", "Failed to delete Stripe account", err)
}

func GetConnectedAccount(stripeId string) (*stripe.Account, error) {
	account, err := account.GetByID(stripeId, nil)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to get Stripe account", err)
	}
	return account, nil
}

func AccountLink(id string) (*stripe.AccountLink, error) {
	params := &stripe.AccountLinkParams{
		Account:    stripe.String(id),
		RefreshURL: stripe.String(frontendHost + "/coach"),
		ReturnURL:  stripe.String(frontendHost + "/coach"),
		Type:       stripe.String(string(stripe.AccountLinkTypeAccountOnboarding)),
	}
	accountLink, err := accountlink.New(params)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create Stripe AccountLink", err)
	}
	return accountLink, nil
}

func LoginLink(stripeId string) (*stripe.LoginLink, error) {
	params := &stripe.LoginLinkParams{
		Account: stripe.String(stripeId),
	}
	link, err := loginlink.New(params)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create Stripe LoginLink", err)
	}
	return link, nil
}

func CreateEventRefund(event *database.Event, participant *database.Participant, percentage int64) (*stripe.Refund, error) {
	if percentage <= 0 {
		return nil, nil
	}
	if participant == nil || !participant.HasPaid {
		return nil, nil
	}

	amount := participant.CheckoutSession.AmountTotal * percentage / 100
	params := &stripe.RefundParams{
		PaymentIntent:        stripe.String(participant.CheckoutSession.PaymentIntent.ID),
		Amount:               stripe.Int64(amount),
		ReverseTransfer:      stripe.Bool(true),
		RefundApplicationFee: stripe.Bool(true),
		Metadata: map[string]string{
			"type":          string(CheckoutSessionType_Coaching),
			"eventId":       event.Id,
			"coachStripeId": event.Coaching.StripeId,
			"coachUsername": event.Owner,
			"username":      participant.Username,
		},
	}

	result, err := refund.New(params)
	if serr, ok := err.(*stripe.Error); ok {
		if serr.Code == stripe.ErrorCodeChargeAlreadyRefunded {
			return nil, nil
		}
	}
	return result, errors.Wrap(500, "Failed to create Stripe refund", "", err)
}
