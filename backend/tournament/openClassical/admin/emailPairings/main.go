// This package implements a Lambda handler which sends pairing emails
// for the provided round in the Dojo Open Classical.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type EmailPairingsRequest struct {
	// The round to send pairing emails for. 1-based index.
	Round int `json:"round"`
}

type EmailPairingsResponse struct {
	// The open classical after updating
	OpenClassical *database.OpenClassical `json:"openClassical"`

	// The number of emails successfully sent
	EmailsSent int `json:"emailsSent"`
}

var repository = database.DynamoDB
var Ses = ses.New(session.Must(session.NewSession()))

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	var request EmailPairingsRequest
	if err := json.Unmarshal([]byte(event.Body), &request); err != nil {
		err = errors.Wrap(400, "Invalid request: failed to unmarshal body", "", err)
		return api.Failure(err), nil
	}

	info := api.GetUserInfo(event)
	if info.Username == "" {
		err := errors.New(400, "Invalid request: username is required", "")
		return api.Failure(err), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	if !user.IsAdmin && !user.IsTournamentAdmin {
		err := errors.New(403, "Invalid request: you are not a tournament admin", "")
		return api.Failure(err), nil
	}

	openClassical, err := repository.GetOpenClassical(database.CurrentLeaderboard)
	if err != nil {
		return api.Failure(err), nil
	}

	for name, section := range openClassical.Sections {
		if len(section.Rounds) != request.Round {
			err = errors.New(400, fmt.Sprintf("Invalid request: section %q has latest round %d. Send emails only for the latest round after all sections have pairings.", name, len(section.Rounds)), "")
			return api.Failure(err), nil
		}
	}

	// Mark the emails as sent before sending, in order to ensure that we don't double-send
	result, err := repository.SetPairingEmailsSent(openClassical, request.Round)
	if err != nil {
		return api.Failure(err), nil
	}

	emailsSent := 0
	for name, section := range openClassical.Sections {
		round := section.Rounds[request.Round-1]
		if round.PairingEmailsSent {
			log.Infof("Skipping section %s because PairingEmailsSent is already true", name)
			continue
		}

		for _, pairing := range round.Pairings {
			emailsSent += sendPairingEmail(&section, &pairing, request.Round)
		}
	}

	return api.Success(EmailPairingsResponse{OpenClassical: result, EmailsSent: emailsSent}), nil
}

func sendPairingEmail(section *database.OpenClassicalSection, pairing *database.OpenClassicalPairing, round int) int {
	white, ok := section.Players[pairing.White.Username]
	if !ok {
		log.Debugf("Skipping pairing because white player not found: %v", pairing)
		return 0
	}
	black, ok := section.Players[pairing.Black.Username]
	if !ok {
		log.Debugf("Skipping pairing because black player not found: %v", pairing)
		return 0
	}

	var emails []*string
	if e := strings.TrimSpace(white.Email); e != "" {
		emails = append(emails, new(e))
	}
	if e := strings.TrimSpace(black.Email); e != "" {
		emails = append(emails, new(e))
	}

	timeControl := "60+30"
	if section.Section == "Open" {
		timeControl = "90+30"
	}

	templateData := struct {
		Round       int    `json:"round"`
		TimeControl string `json:"timeControl"`
		Region      string `json:"region"`
		RatingRange string `json:"ratingRange"`

		WhiteUsername    string `json:"whiteUsername"`
		WhiteDisplayName string `json:"whiteDisplayName"`
		WhiteLichess     string `json:"whiteLichess"`
		WhiteDiscordId   string `json:"whiteDiscordId"`
		WhiteDiscord     string `json:"whiteDiscord"`

		BlackUsername    string `json:"blackUsername"`
		BlackDisplayName string `json:"blackDisplayName"`
		BlackLichess     string `json:"blackLichess"`
		BlackDiscordId   string `json:"blackDiscordId"`
		BlackDiscord     string `json:"blackDiscord"`
	}{
		Round:       round,
		TimeControl: timeControl,
		Region:      section.Region,
		RatingRange: section.Section,

		WhiteUsername:    white.Username,
		WhiteDisplayName: white.DisplayName,
		WhiteLichess:     white.LichessUsername,
		WhiteDiscordId:   white.DiscordId,
		WhiteDiscord:     white.DiscordUsername,

		BlackUsername:    black.Username,
		BlackDisplayName: black.DisplayName,
		BlackLichess:     black.LichessUsername,
		BlackDiscordId:   black.DiscordId,
		BlackDiscord:     black.DiscordUsername,
	}

	templateDataStr, err := json.Marshal(templateData)
	if err != nil {
		log.Errorf("Failed to marshal template data: %v", err)
		return 0
	}

	input := &ses.SendTemplatedEmailInput{
		Destination: &ses.Destination{
			BccAddresses: emails,
		},
		Source:       new("ChessDojo Open Classical <openclassical@mail.chessdojo.club>"),
		Template:     new("openClassicalPairing"),
		TemplateData: new(string(templateDataStr)),
	}
	if _, err := Ses.SendTemplatedEmail(input); err != nil {
		log.Errorf("Failed to send templated email: %v", err)
		return 0
	}

	return len(emails)
}
