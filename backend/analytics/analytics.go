// Handles sending events to Google Analytics and the Meta Conversions API.
package analytics

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	stripe "github.com/stripe/stripe-go/v81"
)

var pixelId = os.Getenv("metaPixelId")
var accessToken = os.Getenv("metaAccessToken")
var frontendHost = os.Getenv("frontendHost")
var gaMeasurementId = os.Getenv("gaMeasurementId")
var gaMeasurementApikey = os.Getenv("gaMeasurementApiKey")

// Emits a Purchase event to Google Analytics and the Meta Conversions API for the given CheckoutSession.
func PurchaseEvent(user *database.User, checkoutSession *stripe.CheckoutSession) {
	if err := gaPurchaseEvent(user, checkoutSession); err != nil {
		log.Errorf("Failed to log Google Analytics event: %v", err)
	}
	if err := metaPurchaseEvent(checkoutSession); err != nil {
		log.Errorf("Failed to log Meta analytics event: %v", err)
	}
}

// A request to send data to Google Analytics.
type gaRequest struct {
	ClientId       string                    `json:"client_id"`
	IpOverride     string                    `json:"ip_override"`
	UserAgent      string                    `json:"user_agent"`
	UserId         string                    `json:"user_id"`
	UserProperties map[string]gaUserProperty `json:"user_properties"`
	UserData       gaUserData                `json:"user_data"`
	Events         []gaBaseEvent             `json:"events"`
}

type gaUserProperty struct {
	Value string `json:"value"`
}

type gaUserData struct {
	Address Address `json:"address"`
}

type Address struct {
	City    string `json:"city"`
	Region  string `json:"region"`
	Country string `json:"country"`
}

// A base Google Analytics event.
type gaBaseEvent struct {
	Name   string `json:"name"`
	Params any    `json:"params"`
}

// The parameters for a Google Analytics purchase event.
type gaPurchaseEventParams struct {
	Currency      string                `json:"currency"`
	Value         float32               `json:"value"`
	TransactionId string                `json:"transaction_id"`
	Items         []gaPurchaseEventItem `json:"items"`
}

type gaPurchaseEventItem struct {
	Id   string `json:"item_id"`
	Name string `json:"item_name"`
}

func getAddress(checkoutSession *stripe.CheckoutSession) Address {
	if checkoutSession == nil || checkoutSession.CustomerDetails == nil || checkoutSession.CustomerDetails.Address == nil {
		return Address{}
	}
	return Address{
		City:    checkoutSession.CustomerDetails.Address.City,
		Region:  checkoutSession.CustomerDetails.Address.State,
		Country: checkoutSession.CustomerDetails.Address.Country,
	}
}

// Emits a Purchase event to Google Analytics.
func gaPurchaseEvent(user *database.User, checkoutSession *stripe.CheckoutSession) error {
	url := fmt.Sprintf(
		"https://www.google-analytics.com/mp/collect?measurement_id=%s&api_secret=%s",
		gaMeasurementId,
		gaMeasurementApikey,
	)
	request := gaRequest{
		ClientId:   "chess_dojo_backend",
		IpOverride: checkoutSession.Metadata["ipAddress"],
		UserAgent:  checkoutSession.Metadata["userAgent"],
		UserId:     user.Username,
		UserProperties: map[string]gaUserProperty{
			"username":            {Value: user.Username},
			"dojo_cohort":         {Value: string(user.DojoCohort)},
			"subscription_status": {Value: string(user.GetSubscriptionStatus())},
			"subscription_tier":   {Value: string(user.GetSubscriptionTier())},
		},
		UserData: gaUserData{
			Address: getAddress(checkoutSession),
		},
		Events: []gaBaseEvent{
			{
				Name: "purchase",
				Params: gaPurchaseEventParams{
					Currency:      string(checkoutSession.Currency),
					Value:         float32(checkoutSession.AmountTotal) / 100,
					TransactionId: checkoutSession.ID,
					Items: []gaPurchaseEventItem{
						{
							Name: "Training Plan Subscription",
						},
					},
				},
			},
		},
	}

	body, err := json.Marshal(&request)
	if err != nil {
		return err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	log.Infof("Got response from Google Analytics: %v", resp)
	return nil
}

type metaBaseEvent struct {
	EventName      string `json:"event_name"`
	EventTime      int    `json:"event_time"`
	ActionSource   string `json:"action_source"`
	EventSourceUrl string `json:"event_source_url"`
}

type metaUserData struct {
	UserAgent string `json:"client_user_agent"`
	Email     string `json:"em,omitempty"`
	IpAddress string `json:"client_ip_address,omitempty"`
}

type metaPurchaseCustomData struct {
	Currency string  `json:"currency"`
	Value    float32 `json:"value"`
}

type metaPurchaseEventRequest struct {
	metaBaseEvent
	UserData   metaUserData           `json:"user_data"`
	CustomData metaPurchaseCustomData `json:"custom_data"`
}

type metaRequest struct {
	Data []any `json:"data"`
}

// Emits a Purchase event to the Meta Conversions API.
func metaPurchaseEvent(checkoutSession *stripe.CheckoutSession) error {
	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/events?access_token=%s", pixelId, accessToken)
	email := fmt.Sprintf("%x", sha256.Sum256([]byte(checkoutSession.CustomerDetails.Email)))
	request := metaRequest{
		Data: []any{
			metaPurchaseEventRequest{
				EventName:      "Purchase",
				EventTime:      int(time.Now().Unix()),
				ActionSource:   "website",
				EventSourceUrl: frontendHost,
				UserData: metaUserData{
					UserAgent: checkoutSession.Metadata["userAgent"],
					Email:     email,
					IpAddress: checkoutSession.Metadata["ipAddress"],
				},
				CustomData: metaPurchaseCustomData{
					Currency: string(checkoutSession.Currency),
					Value:    float32(checkoutSession.AmountTotal) / 100,
				},
			},
		},
	}

	body, err := json.Marshal(&request)
	if err != nil {
		return err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	log.Infof("Got response from Meta events: %v", resp)
	return nil
}
