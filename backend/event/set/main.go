package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
)

var repository database.EventSetter = database.DynamoDB

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, request api.Request) (api.Response, error) {
	log.SetRequestId(request.RequestContext.RequestID)
	log.Infof("Request: %#v", request)

	info := api.GetUserInfo(request)
	if info.Username == "" {
		err := errors.New(403, "Invalid request: username is required", "")
		return api.Failure(err), nil
	}

	event := &database.Event{}
	if err := json.Unmarshal([]byte(request.Body), event); err != nil {
		err := errors.Wrap(400, "Invalid request: body format is invalid", "Unable to unmarshal body", err)
		return api.Failure(err), nil
	}

	switch event.Type {
	case database.EventType_Availability:
		return handleAvailability(info, event), nil
	case database.EventType_Dojo:
		return handleDojoEvent(info, event), nil
	case database.EventType_Coaching:
		return handleCoachingEvent(info, event), nil
	case database.EventType_LectureTier, database.EventType_GameReviewTier:
		return handleLiveClass(info, event), nil
	}

	err := errors.New(400, fmt.Sprintf("Invalid request: event type `%s` is not supported", event.Type), "")
	return api.Failure(err), nil
}

func handleAvailability(info *api.UserInfo, event *database.Event) api.Response {
	if event.Owner != info.Username {
		err := errors.New(403, "Invalid request: username does not match availability owner", "")
		return api.Failure(err)
	}

	if event.Status != database.SchedulingStatus_Scheduled {
		err := errors.New(400, fmt.Sprintf("Invalid request: event status must be set to `%s`", database.SchedulingStatus_Scheduled), "")
		return api.Failure(err)
	}

	if event.OwnerDisplayName == "" {
		err := errors.New(400, "Invalid request: ownerDisplayName is required", "")
		return api.Failure(err)
	}

	if event.MaxParticipants < 1 {
		err := errors.New(400, "Invalid request: maxParticipants must be at least one", "")
		return api.Failure(err)
	}

	if !database.IsValidCohort(event.OwnerCohort) {
		err := errors.New(400, fmt.Sprintf("Invalid request: ownerCohort `%s` is invalid", event.OwnerCohort), "")
		return api.Failure(err)
	}

	if err := checkTimes(event); err != nil {
		return api.Failure(err)
	}

	if err := checkAvailabilityTypes(event.Types); err != nil {
		return api.Failure(err)
	}

	if event.InviteOnly && len(event.Invited) == 0 {
		return api.Failure(errors.New(400, "Invalid request: invited is required if inviteOnly is set", ""))
	}

	if err := checkCohorts(event.Cohorts); !event.InviteOnly && err != nil {
		return api.Failure(err)
	}

	if event.Id == "" {
		event.Id = uuid.New().String()
		if err := repository.RecordEventCreation(event); err != nil {
			log.Error("Failed RecordEventCreation: ", err)
		}
	}

	if strings.TrimSpace(event.Location) == "" {
		event.Location = "Discord"
	}

	if err := repository.SetEvent(event); err != nil {
		return api.Failure(err)
	}

	if len(event.Invited) > 0 {
		if err := database.SendCalendarInviteEvent(event); err != nil {
			log.Error("Failed to send calendar invite notification: ", err)
		}
	}

	if msgId, err := discord.SendAvailabilityNotification(event); err != nil {
		log.Error("Failed SendAvailabilityNotification: ", err)
	} else if event.DiscordMessageId != msgId {
		// We have to save the event a second time in order to avoid first
		// sending the Discord notification and then failing to save the event.
		// If this save fails, we just log the error and return success since it is non-critical.
		event.DiscordMessageId = msgId
		if err := repository.SetEvent(event); err != nil {
			log.Error("Failed to set event.DiscordMessageId: ", err)
		}
	}

	return api.Success(event)
}

func handleDojoEvent(info *api.UserInfo, event *database.Event) api.Response {
	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err)
	}
	if !user.IsAdmin && !user.IsCalendarAdmin {
		err := errors.New(403, "You do not have permission to create Dojo events", "")
		return api.Failure(err)
	}

	if event.Title == "" {
		err := errors.New(400, "Invalid request: title is required", "")
		return api.Failure(err)
	}

	if event.Status != database.SchedulingStatus_Scheduled {
		err := errors.New(400, fmt.Sprintf("Invalid request: event status must be set to `%s`", database.SchedulingStatus_Scheduled), "")
		return api.Failure(err)
	}

	if err := checkTimes(event); err != nil {
		return api.Failure(err)
	}

	if err := checkCohorts(event.Cohorts); len(event.Cohorts) > 0 && err != nil {
		return api.Failure(err)
	}

	if event.Id == "" {
		event.Id = uuid.New().String()
		if err := repository.RecordEventCreation(event); err != nil {
			log.Error("Failed RecordEventCreation: ", err)
		}
	}

	event.Owner = database.EventTypeDojoOwner
	event.OwnerDisplayName = database.EventTypeDojoOwner
	event.OwnerCohort = ""
	event.OwnerPreviousCohort = ""
	event.BookedStartTime = ""
	event.Types = nil
	event.BookedType = ""
	event.MaxParticipants = 0
	event.DiscordMessageId = ""

	if strings.TrimSpace(event.Location) == "" {
		event.Location = "No Location Provided"
	}

	if err := repository.SetEvent(event); err != nil {
		return api.Failure(err)
	}

	if privateEventId, publicEventId, err := discord.SetEvent(event); err != nil {
		log.Error("Failed SendAvailabilityNotification: ", err)
	} else if event.PrivateDiscordEventId != privateEventId || event.PublicDiscordEventId != publicEventId {
		// We have to save the event a second time in order to avoid first
		// pushing the Discord event and then failing to save the event in our database.
		// If this save fails, we just log the error and return success since it is non-critical.
		event.PrivateDiscordEventId, event.PublicDiscordEventId = privateEventId, publicEventId
		if err := repository.SetEvent(event); err != nil {
			log.Error("Failed to set event.DiscordEventIds: ", err)
		}
	}

	return api.Success(event)
}

func handleCoachingEvent(info *api.UserInfo, event *database.Event) api.Response {
	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err)
	}

	if !user.IsCoach {
		err := errors.New(403, "You must be a coach to create Coaching events", "")
		return api.Failure(err)
	}
	if user.CoachInfo == nil || !user.CoachInfo.OnboardingComplete || user.CoachInfo.StripeId == "" {
		err := errors.New(400, "Invalid request: your coach account must be updated in the coach portal", "")
		return api.Failure(err)
	}

	if strings.TrimSpace(event.Title) == "" {
		err := errors.New(400, "Invalid request: title cannot be empty", "")
		return api.Failure(err)
	}
	if strings.TrimSpace(event.Description) == "" {
		err := errors.New(400, "Invalid request: description cannot be empty", "")
		return api.Failure(err)
	}
	if strings.TrimSpace(event.Location) == "" {
		err := errors.New(400, "Invalid request: location cannot be empty", "")
		return api.Failure(err)
	}

	if event.Status != database.SchedulingStatus_Scheduled {
		err := errors.New(400, fmt.Sprintf("Invalid request: event status must be set to `%s`", database.SchedulingStatus_Scheduled), "")
		return api.Failure(err)
	}

	if event.MaxParticipants < 1 {
		err := errors.New(400, "Invalid request: maxParticipants must be at least one", "")
		return api.Failure(err)
	}

	if err := checkTimes(event); err != nil {
		return api.Failure(err)
	}

	if err := checkCohorts(event.Cohorts); err != nil {
		return api.Failure(err)
	}

	if event.Coaching == nil || event.Coaching.FullPrice < 500 || (event.Coaching.CurrentPrice > 0 && event.Coaching.CurrentPrice < 500) {
		err := errors.New(400, "Invalid request: coaching sessions must be at least $5", "")
		return api.Failure(err)
	}
	if event.Coaching.CurrentPrice > event.Coaching.FullPrice {
		err := errors.New(400, "Invalid request: currentPrice must be less than fullPrice", "")
		return api.Failure(err)
	}

	if event.Id == "" {
		event.Id = uuid.NewString()
	}

	event.Owner = user.Username
	event.OwnerDisplayName = user.DisplayName
	event.OwnerCohort = user.DojoCohort
	event.OwnerPreviousCohort = user.PreviousCohort
	event.BookedStartTime = ""
	event.Types = nil
	event.BookedType = ""
	event.Coaching.StripeId = user.CoachInfo.StripeId

	if err := repository.SetEvent(event); err != nil {
		return api.Failure(err)
	}

	if msgId, err := discord.SendCoachingNotification(event); err != nil {
		log.Error("Failed SendCoachingNotification: ", err)
	} else if event.DiscordMessageId != msgId {
		// We have to save the event a second time in order to avoid first
		// sending the Discord notification and then failing to save the event.
		// If this save fails, we just log the error and return success since it is non-critical.
		event.DiscordMessageId = msgId
		if err := repository.SetEvent(event); err != nil {
			log.Error("Failed to set event.DiscordMessageId: ", err)
		}
	}

	return api.Success(event)
}

func handleLiveClass(info *api.UserInfo, event *database.Event) api.Response {
	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err)
	}

	if strings.TrimSpace(event.Title) == "" {
		err := errors.New(400, "Invalid request: title is required", "")
		return api.Failure(err)
	}
	if strings.TrimSpace(event.Description) == "" {
		err := errors.New(400, "Invalid request: description cannot be empty", "")
		return api.Failure(err)
	}
	if strings.TrimSpace(event.Location) == "" {
		err := errors.New(400, "Invalid request: location cannot be empty", "")
		return api.Failure(err)
	}

	if event.Status != database.SchedulingStatus_Scheduled {
		err := errors.New(400, fmt.Sprintf("Invalid request: event status must be set to `%s`", database.SchedulingStatus_Scheduled), "")
		return api.Failure(err)
	}

	if err := checkTimes(event); err != nil {
		return api.Failure(err)
	}

	if event.Id == "" {
		if !user.GetIsCalendarAdmin() {
			err := errors.New(403, "You do not have permission to create live class events", "")
			return api.Failure(err)
		}

		event.Id = uuid.NewString()
		event.Owner = user.Username
		event.OwnerDisplayName = user.DisplayName
		event.OwnerCohort = user.DojoCohort
		event.OwnerPreviousCohort = user.PreviousCohort
	} else {
		existing, err := repository.GetEvent(event.Id)
		if err != nil {
			return api.Failure(err)
		}

		if event.Owner != user.Username && !user.GetIsCalendarAdmin() {
			err := errors.New(403, "You do not have permission to edit this live class", "")
			return api.Failure(err)
		}

		event.Owner = existing.Owner
		event.OwnerDisplayName = existing.OwnerDisplayName
		event.OwnerCohort = existing.OwnerCohort
		event.OwnerPreviousCohort = existing.OwnerPreviousCohort
	}

	event.BookedStartTime = ""
	event.Types = nil
	event.BookedType = ""
	event.MaxParticipants = 0
	event.DiscordMessageId = ""
	event.Cohorts = nil

	if err := repository.SetEvent(event); err != nil {
		return api.Failure(err)
	}

	return api.Success(event)
}

func checkAvailabilityTypes(types []database.AvailabilityType) error {
	if len(types) == 0 {
		return errors.New(400, "Invalid request: availability must include at least one type", "")
	}

	for _, t := range types {
		if !t.IsValid() {
			return errors.New(400, fmt.Sprintf("Invalid request: availability type `%s` is invalid", t), "")
		}
	}
	return nil
}

func checkCohorts(cohorts []database.DojoCohort) error {
	if len(cohorts) == 0 {
		return errors.New(400, "Invalid request: event must include at least one cohort", "")
	}

	for _, c := range cohorts {
		if !database.IsValidCohort(c) {
			return errors.New(400, fmt.Sprintf("Invalid request: cohort `%s` is invalid", c), "")
		}
	}
	return nil
}

func checkTimes(event *database.Event) error {
	if err := database.ValidateEventTimes(event); err != nil {
		return err
	}

	// Non-recurring events (no RRULE FREQ) expire 48h after they end.
	// DTSTART-only rrules still count as non-recurring.
	if event.RRule == "" || !strings.Contains(event.RRule, "RRULE:") {
		endTime, err := database.GetEventEnd(event)
		if err != nil {
			return err
		}
		expirationTime := endTime.Add(48 * time.Hour)
		event.ExpirationTime = expirationTime.Unix()
	}
	return nil
}
