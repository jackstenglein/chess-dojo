package main

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
	payment "github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService"
	"github.com/stripe/stripe-go/v81"
)

var repository database.EventBooker = database.DynamoDB

type BookEventRequest struct {
	StartTime string                    `json:"startTime"`
	Type      database.AvailabilityType `json:"type"`
}

type BookEventResponse struct {
	Event       *database.Event `json:"event"`
	CheckoutUrl string          `json:"checkoutUrl,omitempty"`
}

// checkTimes verifies that the provided startTime is contained within the provided Event.
func checkTimes(event *database.Event, startTime string) error {
	if startTime == "" {
		return errors.New(400, "Invalid request: startTime is required", "")
	}

	selected, err := time.Parse(time.RFC3339, startTime)
	if err != nil {
		return errors.Wrap(400, "Invalid request: startTime must be RFC3339 format", "", err)
	}

	eventStart, err := database.GetEventStart(event)
	if err != nil {
		return err
	}
	eventEnd, err := database.GetEventEnd(event)
	if err != nil {
		return err
	}

	if selected.Before(eventStart) {
		return errors.New(400, "Invalid request: startTime must be greater than or equal to availability start", "")
	}

	if selected.After(eventEnd) {
		return errors.New(400, "Invalid request: startTime must be less than or equal to availability end", "")
	}

	return nil
}

// checkType verifies that the provided meeting type is offered by the provided Event.
func checkType(event *database.Event, t database.AvailabilityType) error {
	if t == "" {
		return nil
	}
	if slices.Contains(event.Types, t) {
		return nil
	}
	return errors.New(400, fmt.Sprintf("Invalid request: type `%s` is not offered by this availability", t), "")
}

// checkCohort verifies that the provided cohort is bookable by the provided Event.
func checkCohort(event *database.Event, cohort database.DojoCohort) error {
	if slices.Contains(event.Cohorts, cohort) {
		return nil
	}
	return errors.New(400, fmt.Sprintf("Invalid request: cohort `%s` is not allowed to book this availability", cohort), "")
}

// Handler implements the BookAvailability endpoint.
func Handler(ctx context.Context, request api.Request) (api.Response, error) {
	log.SetRequestId(request.RequestContext.RequestID)
	log.Infof("Request: %#v", request)

	info := api.GetUserInfo(request)
	if info.Username == "" {
		err := errors.New(400, "Invalid request: username is required", "")
		return api.Failure(err), nil
	}

	id := request.PathParameters["id"]
	if id == "" {
		err := errors.New(400, "Invalid request: id is required", "")
		return api.Failure(err), nil
	}

	body := BookEventRequest{}
	if err := json.Unmarshal([]byte(request.Body), &body); err != nil {
		err = errors.Wrap(400, "Invalid request: unable to unmarshal body", "", err)
		return api.Failure(err), nil
	}

	originalEvent, err := repository.GetEvent(id)
	if err != nil {
		return api.Failure(err), nil
	}

	if info.Username == originalEvent.Owner {
		err := errors.New(400, "Invalid request: you cannot book your own availability", "")
		return api.Failure(err), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	if originalEvent.InviteOnly && !slices.ContainsFunc(
		originalEvent.Invited,
		func(invitee database.Participant) bool {
			return invitee.Username == info.Username
		},
	) {
		err := errors.New(400, "Invalid request: you must be invited to book this availability", "")
		return api.Failure(err), nil
	} else if !originalEvent.InviteOnly {
		if err := checkCohort(originalEvent, user.DojoCohort); err != nil {
			return api.Failure(err), nil
		}
	}

	if originalEvent.Type == database.EventType_Availability && originalEvent.MaxParticipants == 1 {
		if err := checkType(originalEvent, body.Type); err != nil {
			return api.Failure(err), nil
		}
		if err := checkTimes(originalEvent, body.StartTime); err != nil {
			return api.Failure(err), nil
		}
	}

	var checkoutSession *stripe.CheckoutSession
	if originalEvent.Type == database.EventType_Coaching {
		checkoutSession, err = payment.CoachingCheckoutSession(user, originalEvent)
		if err != nil {
			return api.Failure(err), nil
		}
	}

	newEvent, err := repository.BookEvent(originalEvent, user, body.StartTime, body.Type, checkoutSession)
	if err != nil {
		return api.Failure(err), nil
	}

	if err := repository.RecordEventBooking(newEvent); err != nil {
		log.Error("Failed RecordEventBooking: ", err)
	}

	if err := database.SendEventBookedNotification(newEvent); err != nil {
		log.Error("Failed SendBookingNotification: ", err)
	}

	if newEvent.Status == database.SchedulingStatus_Booked {
		if err := discord.DeleteEventNotification(originalEvent); err != nil {
			log.Error("Failed to delete Discord message: ", err)
		}
	} else if _, err := discord.SendEventNotification(newEvent); err != nil {
		log.Error("Failed SendEventNotification: ", err)
	}

	var checkoutUrl string
	if checkoutSession != nil {
		checkoutUrl = checkoutSession.URL
	}

	return api.Success(BookEventResponse{Event: newEvent, CheckoutUrl: checkoutUrl}), nil
}

func main() {
	lambda.Start(Handler)
}
