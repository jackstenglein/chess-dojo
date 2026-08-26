package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
	payment "github.com/jackstenglein/chess-dojo-scheduler/backend/paymentService"
)

var repository database.EventLeaver = database.DynamoDB
var frontendHost = os.Getenv("frontendHost")

const newOwnerPrefix = "Hello, the owner of your upcoming meeting has canceled, and you have been made the new owner of the meeting. "
const noParticipantsSuffix = "The meeting currently has no other participants but is available for others to book. You can edit the meeting from the [Calendar](%s)."
const sameOwnerPrefix = "Hello, a member of your upcoming meeting has canceled. "
const withParticipantsSuffix = "There are still %d participants in the meeting. View it [here](%s)."

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, request api.Request) (api.Response, error) {
	log.SetRequestId(request.RequestContext.RequestID)
	log.Infof("Request: %#v", request)

	info := api.GetUserInfo(request)
	if info.Username == "" {
		err := errors.New(403, "Invalid request: not authenticated", "Username from Cognito token was empty")
		return api.Failure(err), nil
	}

	id, ok := request.PathParameters["id"]
	if !ok {
		err := errors.New(400, "Invalid request: id is required", "")
		return api.Failure(err), nil
	}

	event, err := repository.GetEvent(id)
	if err != nil {
		return api.Failure(err), nil
	}

	var newEvent *database.Event

	if event.Type == database.EventType_Coaching {
		if info.Username == event.Owner {
			newEvent, err = cancelCoachingSession(event)
		} else {
			newEvent, err = leaveCoachingSession(info.Username, event)
		}
	} else if event.Type == database.EventType_Availability {
		newEvent, err = leaveAvailability(info.Username, event)
	} else {
		err = errors.New(400, "Invalid request: this event type is not supported", "")
	}

	if err != nil {
		return api.Failure(err), nil
	}

	if msgId, err := discord.SendEventNotification(newEvent); err != nil {
		log.Error("Failed SendEventNotification: ", err)
	} else if newEvent.DiscordMessageId != msgId {
		// We have to save the event a second time in order to avoid first
		// sending the Discord notification and then failing to save the event.
		// If this save fails, we just log the error and return success since it is non-critical.
		newEvent.DiscordMessageId = msgId
		if err := repository.SetEvent(newEvent); err != nil {
			log.Error("Failed to set event.DiscordMessageId: ", err)
		}
	}

	return api.Success(newEvent), nil
}

// Leaves a regular availability.
func leaveAvailability(username string, event *database.Event) (*database.Event, error) {
	if len(event.Participants) == 0 {
		err := errors.New(400, "Invalid request: nobody has booked this availability. Delete it instead", "")
		return nil, err
	}

	participant := event.Participants[username]
	if event.Owner != username && participant == nil {
		err := errors.New(403, "Invalid request: user is not a participant in this meeting", "")
		return nil, err
	}

	newEvent, err := repository.LeaveEvent(event, participant, false)
	if err != nil {
		return nil, err
	}
	sendNotification(event, newEvent)
	return newEvent, nil
}

// Handles a coach canceling a session that has been booked. Any users who have paid are issued
// a full refund.
func cancelCoachingSession(event *database.Event) (*database.Event, error) {
	newEvent, err := repository.CancelEvent(event)
	if err != nil {
		return nil, err
	}

	for _, p := range newEvent.Participants {
		_, err := payment.CreateEventRefund(event, p, 100)
		if err != nil {
			log.Errorf("Failed to create refund: %v", err)
		}
	}

	return newEvent, nil
}

// Handles a user leaving a coaching session that they have booked. The user may need a refund
// depending on whether they have already paid and how far in advance they are canceling.
func leaveCoachingSession(username string, event *database.Event) (*database.Event, error) {
	participant := event.Participants[username]
	if participant == nil {
		err := errors.New(403, "Invalid request: user is not a participant in this meeting", "")
		return nil, err
	}

	now := time.Now()
	eventStart, err := database.GetEventStart(event)
	if err != nil {
		return nil, err
	}
	cancelationTime := eventStart.Add(-23 * time.Hour).Add(-55 * time.Minute)

	var newEvent *database.Event

	if !participant.HasPaid || now.After(cancelationTime) {
		newEvent, err = repository.LeaveEvent(event, participant, false)
	} else {
		_, err = payment.CreateEventRefund(event, participant, 100)
		if err != nil {
			return nil, err
		}
		newEvent, err = repository.LeaveEvent(event, participant, false)
	}

	if err != nil {
		return nil, err
	}

	sendNotification(event, newEvent)
	return newEvent, nil
}

func sendNotification(event, newEvent *database.Event) {
	var msg string

	if newEvent.Owner != event.Owner {
		msg = newOwnerPrefix
	} else {
		msg = sameOwnerPrefix
	}

	if len(newEvent.Participants) == 0 {
		url := fmt.Sprintf("%s/calendar", frontendHost)
		msg += fmt.Sprintf(noParticipantsSuffix, url)
	} else {
		url := fmt.Sprintf("%s/meeting/%s", frontendHost, newEvent.Id)
		msg += fmt.Sprintf(withParticipantsSuffix, len(newEvent.Participants), url)
	}

	if err := discord.SendCancellationNotification(newEvent.Owner, msg); err != nil {
		log.Error("Failed SendCancellationNotification: ", err)
	}
}
