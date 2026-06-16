// This package implements a Lambda handler which sets the result of a pairing
// in the current round of the current open classical and marks it as verified.
//
// The caller must an admin or tournament admin.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var repository = database.DynamoDB

type VerifyResultRequest struct {
	// The region the pairing is in
	Region string `json:"region"`

	// The section the pairing is in
	Section string `json:"section"`

	// The round the pairing is in, 1-based indexing.
	Round int `json:"round"`

	// The Lichess username of the player with white
	White string `json:"white"`

	// The Lichess username of the player with black
	Black string `json:"black"`

	// The result to set
	Result string `json:"result"`
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	request := &VerifyResultRequest{}
	if err := json.Unmarshal([]byte(event.Body), request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: failed to unmarshal body", "", err)), nil
	}
	if request.Region == "" {
		return api.Failure(errors.New(400, "Invalid request: region is required", "")), nil
	}
	if request.Section == "" {
		return api.Failure(errors.New(400, "Invalid request: section is required", "")), nil
	}
	if request.Round == 0 {
		return api.Failure(errors.New(400, "Invalid request: round is required", "")), nil
	}
	if request.White == "" {
		return api.Failure(errors.New(400, "Invalid request: white is required", "")), nil
	}
	if request.Black == "" {
		return api.Failure(errors.New(400, "Invalid request: black is required", "")), nil
	}
	if request.Result == "" {
		return api.Failure(errors.New(400, "Invalid request: result is required", "")), nil
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

	update, err := getPairingUpdate(openClassical, request)
	if err != nil {
		return api.Failure(err), nil
	}

	openClassical, err = repository.UpdateOpenClassicalResult(update)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(openClassical), nil
}

func getPairingUpdate(openClassical *database.OpenClassical, request *VerifyResultRequest) (*database.OpenClassicalPairingUpdate, error) {
	section, ok := openClassical.Sections[fmt.Sprintf("%s_%s", request.Region, request.Section)]
	if !ok {
		return nil, errors.New(400, fmt.Sprintf("Invalid request: region %q and section %q not found", request.Region, request.Section), "")
	}

	roundIdx := request.Round - 1
	if roundIdx >= len(section.Rounds) {
		return nil, errors.New(400, fmt.Sprintf("Invalid request: round %d specified, but this section only has %d rounds", request.Round, len(section.Rounds)), "")
	}

	round := section.Rounds[roundIdx]
	for idx, pairing := range round.Pairings {
		if strings.EqualFold(request.White, pairing.White.LichessUsername) && strings.EqualFold(request.Black, pairing.Black.LichessUsername) {
			return &database.OpenClassicalPairingUpdate{
				Region:            request.Region,
				Section:           request.Section,
				Round:             roundIdx,
				PairingIndex:      idx,
				OverwriteVerified: true,
				Pairing: &database.OpenClassicalPairing{
					White:          pairing.White,
					Black:          pairing.Black,
					Result:         request.Result,
					GameUrl:        pairing.GameUrl,
					Verified:       true,
					ReportOpponent: pairing.ReportOpponent,
					Notes:          pairing.Notes,
					Screenshots:    pairing.Screenshots,
				},
			}, nil
		}
	}
	return nil, errors.New(400, fmt.Sprintf("Invalid request: round %d does not contain a pairing for %s (white) vs %s (black)", request.Round, request.White, request.Black), "")
}
