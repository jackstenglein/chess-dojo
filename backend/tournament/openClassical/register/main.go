package main

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/ratings"
)

var repository = database.DynamoDB

const maxByeLength = 7

var validTitles = []string{
	"",
	"GM",
	"WGM",
	"IM",
	"WIM",
	"FM",
	"WFM",
	"CM",
	"WCM",
}

type RegisterRequest struct {
	Username        string `json:"-"`
	DisplayName     string `json:"-"`
	Email           string `json:"-"`
	LichessUsername string `json:"lichessUsername"`
	LichessRating   int    `json:"-"`
	DiscordUsername string `json:"-"`
	DiscordId       string `json:"-"`
	Title           string `json:"title"`
	Region          string `json:"region"`
	Section         string `json:"section"`
	ByeRequests     []bool `json:"byeRequests"`
}

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(403, "Invalid request: user is not signed in", "")), nil
	}

	request := &RegisterRequest{}
	if err := json.Unmarshal([]byte(event.Body), request); err != nil {
		err = errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)
		return api.Failure(err), nil
	}
	request.Username = info.Username
	request.Email = info.Email

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	request.DisplayName = user.DisplayName
	request.DiscordUsername = user.DiscordUsername
	request.DiscordId = user.DiscordId

	if err := checkRequest(request); err != nil {
		return api.Failure(err), nil
	}

	openClassical, err := repository.GetOpenClassical(database.CurrentLeaderboard)
	if err != nil {
		return api.Failure(err), nil
	}

	if !openClassical.AcceptingRegistrations {
		err := errors.New(400, "Registration for this tournament is closed", "")
		return api.Failure(err), nil
	}

	if isBanned(request, openClassical) {
		err := errors.New(400, "You are currently not in good standing. Please contact TD Alex Dodd via Discord to register", "")
		return api.Failure(err), nil
	}

	if err := discord.SetOpenClassicalRole(user); err != nil {
		return api.Failure(err), nil
	}

	openClassicalPlayer := database.OpenClassicalPlayer{
		Username:        info.Username,
		DisplayName:     request.DisplayName,
		LichessUsername: request.LichessUsername,
		DiscordUsername: request.DiscordUsername,
		DiscordId:       request.DiscordId,
		Title:           request.Title,
		Rating:          request.LichessRating,
		Email:           request.Email,
		Region:          request.Region,
		Section:         request.Section,
		ByeRequests:     request.ByeRequests,
	}

	openClassical, err = repository.UpdateOpenClassicalRegistration(openClassical, &openClassicalPlayer)
	if err != nil {
		return api.Failure(err), nil
	}

	return api.Success(openClassical), nil
}

// Returns an error if the request is invalid.
func checkRequest(req *RegisterRequest) error {
	if strings.TrimSpace(req.DisplayName) == "" {
		return errors.New(400, "Invalid request: display name is required", "")
	}
	if strings.TrimSpace(req.Email) == "" {
		return errors.New(400, "Invalid request: email is required", "")
	}
	if strings.TrimSpace(req.LichessUsername) == "" {
		return errors.New(400, "Invalid request: lichessUsername is required", "")
	}
	if strings.TrimSpace(req.DiscordUsername) == "" {
		return errors.New(400, "Invalid request: you must have a linked Discord account to register", "")
	}
	if strings.TrimSpace(req.DiscordId) == "" {
		return errors.New(400, "Invalid request: you must have a linked Discord account to register", "")
	}
	if req.Region != "A" && req.Region != "B" {
		return errors.New(400, fmt.Sprintf("Invalid request: region `%s` is not supported", req.Region), "")
	}
	if req.Section != "Open" && req.Section != "U1900" {
		return errors.New(400, fmt.Sprintf("Invalid request: section `%s` is not supported", req.Section), "")
	}
	if len(req.ByeRequests) > maxByeLength {
		return errors.New(400, "Invalid request: byeRequests has too many items", "")
	}

	if !slices.Contains(validTitles, req.Title) {
		errors.New(400, "Invalid request: title is not in list of valid titles", "")
	}

	rating, err := ratings.FetchLichessRating(req.LichessUsername)
	if req.Section == "U1900" && rating.CurrentRating >= 1900 {
		return errors.New(400, "Your Lichess rating is above 1900. Please register for the open section instead.", "")
	}

	req.LichessRating = rating.CurrentRating
	return err
}

func isBanned(request *RegisterRequest, openClassical *database.OpenClassical) bool {
	lichessLowercase := strings.ToLower(request.LichessUsername)
	if _, ok := openClassical.BannedPlayers[lichessLowercase]; ok {
		return true
	}
	if _, ok := openClassical.BannedPlayers[request.Username]; ok {
		return true
	}
	return false
}
