// Implements a Lambda handler that allows the caller to set the pairings
// for a round of the open classical.
//
// The caller must be an admin or tournament admin.
package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

const MIN_ROUND = 1
const MAX_ROUND = 7

type SetPairingsRequest struct {
	CloseRegistrations bool   `json:"closeRegistrations"`
	Region             string `json:"region"`
	Section            string `json:"section"`
	Round              int    `json:"round"`
	CsvData            string `json:"csvData"`
}

var repository = database.DynamoDB

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	if !user.IsAdmin && !user.IsTournamentAdmin {
		return api.Failure(errors.New(403, "Invalid request: you are not a tournament admin", "")), nil
	}

	request := SetPairingsRequest{}
	if err := json.Unmarshal([]byte(event.Body), &request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: failed to unmarshal body", "", err)), nil
	}

	if request.CloseRegistrations {
		return handleCloseRegistrations(), nil
	}

	return handlePairings(request), nil
}

func handleCloseRegistrations() api.Response {
	openClassical, err := repository.OpenClassicalCloseRegistrations()
	if err != nil {
		return api.Failure(err)
	}
	return api.Success(openClassical)
}

func handlePairings(request SetPairingsRequest) api.Response {
	if request.Region == "" {
		return api.Failure(errors.New(400, "Invalid request: region is required", ""))
	}
	if request.Section == "" {
		return api.Failure(errors.New(400, "Invalid request: section is required", ""))
	}
	if request.Round < MIN_ROUND || request.Round > MAX_ROUND {
		return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: round must be between %d and %d", MIN_ROUND, MAX_ROUND), ""))
	}
	if request.CsvData == "" {
		return api.Failure(errors.New(400, "Invalid request: csvData is required", ""))
	}

	openClassical, err := repository.GetOpenClassical(database.CurrentLeaderboard)
	if err != nil {
		return api.Failure(err)
	}

	pairings, err := getPairings(request, openClassical)
	if err != nil {
		return api.Failure(err)
	}

	sectionName := fmt.Sprintf("%s_%s", request.Region, request.Section)
	section := openClassical.Sections[sectionName]
	if request.Round-1 >= len(section.Rounds) {
		openClassical, err = repository.OpenClassicalAddRound(request.Region, request.Section, pairings)
	} else {
		openClassical, err = repository.OpenClassicalSetRound(request.Region, request.Section, request.Round-1, pairings)
	}

	if err != nil {
		return api.Failure(err)
	}
	return api.Success(openClassical)
}

const whiteIndex = 4
const blackIndex = 10
const blackRatingIndex = 11
const noOpponent = "No Opponent"

func getPairings(request SetPairingsRequest, openClassical *database.OpenClassical) ([]database.OpenClassicalPairing, error) {
	sectionName := fmt.Sprintf("%s_%s", request.Region, request.Section)
	section, ok := openClassical.Sections[sectionName]
	if !ok {
		return nil, errors.New(400, fmt.Sprintf("Invalid request: section %q not found", sectionName), "")
	}

	reader := csv.NewReader(strings.NewReader(request.CsvData))
	lines, err := reader.ReadAll()
	if err != nil {
		return nil, errors.Wrap(400, "Invalid request: could not read CSV data", "", err)
	}

	if len(lines) < 2 {
		return nil, errors.New(400, "Invalid request: CSV data does not have enough data", "")
	}

	results := make([]database.OpenClassicalPairing, 0, len(lines)-1)
	for _, line := range lines[1:] {
		if len(line) < blackRatingIndex+1 {
			return nil, errors.New(400, fmt.Sprintf("Invalid request: CSV field length %d too short", len(line)), "")
		}

		whiteUsername, whiteLichess, _ := getUsernames(line[whiteIndex])
		blackUsername, blackLichess, _ := getUsernames(line[blackIndex])

		white, ok := section.Players[whiteUsername]
		if !ok {
			return nil, errors.New(400, fmt.Sprintf("Invalid request: player %q not found", whiteLichess), "")
		} else if white.Status != "" {
			return nil, errors.New(400, fmt.Sprintf("Invalid request: player %q has status %q", whiteLichess, white.Status), "")
		}

		black, ok := section.Players[blackUsername]
		if !ok {
			if blackLichess != noOpponent {
				return nil, errors.New(400, fmt.Sprintf("Invalid request: player %q not found", blackLichess), "")
			}
		} else if black.Status != "" {
			return nil, errors.New(400, fmt.Sprintf("Invalid request: player %q has status %q", blackLichess, black.Status), "")
		}

		var result string
		var resultVerified bool
		if blackLichess == noOpponent {
			result = "Bye"
			resultVerified = true
		}

		pairing := database.OpenClassicalPairing{
			White:    white.OpenClassicalPlayerSummary,
			Black:    black.OpenClassicalPlayerSummary,
			Result:   result,
			Verified: resultVerified,
		}
		results = append(results, pairing)
	}
	return results, nil
}

func getUsernames(s string) (dojo, lichess, discord string) {
	tokens := strings.Split(s, ",lichess:")
	if len(tokens) != 2 {
		return noOpponent, noOpponent, noOpponent
	}
	if !strings.HasPrefix(tokens[0], "username:") {
		return noOpponent, noOpponent, noOpponent
	}

	dojo = strings.TrimPrefix(tokens[0], "username:")

	s2 := tokens[1]
	tokens = strings.Split(s2, ",discord:")
	if len(tokens) != 2 {
		return noOpponent, noOpponent, noOpponent
	}

	lichess = tokens[0]
	discord = tokens[1]
	return
}
