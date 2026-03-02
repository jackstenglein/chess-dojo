package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
)

var repository database.GraduationCreator = database.DynamoDB
const annotatedGamesRequirementID = "4d23d689-1284-46e6-b2a2-4b4bfdc37174"

type GraduationRequest struct {
	Comments string `json:"comments"`
}

type GraduationResponse struct {
	Graduation *database.Graduation `json:"graduation"`
	UserUpdate *database.User       `json:"userUpdate"`
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	request := &GraduationRequest{}
	if err := json.Unmarshal([]byte(event.Body), request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	nextCohort := user.DojoCohort.GetNextCohort()
	if nextCohort == database.NoCohort {
		return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: cohort `%s` cannot graduate", user.DojoCohort), "")), nil
	}

	var requirements []*database.Requirement
	var startKey string
	for ok := true; ok; ok = (startKey != "") {
		reqs, lastKey, err := repository.ListRequirements(user.DojoCohort, true, startKey)
		if err != nil {
			return api.Failure(err), nil
		}
		requirements = append(requirements, reqs...)
		startKey = lastKey
	}

	startedAt := user.LastGraduatedAt
	if startedAt == "" {
		startedAt = user.CreatedAt
	}
	now := time.Now()
	createdAt := now.Format(time.RFC3339)

	startRating, currentRating := user.GetRatings()

	graduationCohorts := append(user.GraduationCohorts, user.DojoCohort)
	var numberOfGraduations = user.NumberOfGraduations + 1

	score := user.CalculateScore(requirements)
	totalTime := user.TimeSpent()
	dojoTime := user.TimeSpentOnReqs(requirements)
	nonDojoTime := totalTime - dojoTime
	gamesAnnotated := 0
	if progress, ok := user.Progress[annotatedGamesRequirementID]; ok && progress != nil {
		gamesAnnotated = progress.Counts[user.DojoCohort]
	}

	log.Debugf("Total Time: %d, Dojo Time: %d, NonDojo Time: %d", totalTime, dojoTime, nonDojoTime)

	ratingHistories := make(map[database.RatingSystem][]database.RatingHistory)
	for rs, history := range user.RatingHistories {
		for _, item := range history {
			if item.Date >= createdAt {
				ratingHistories[rs] = append(ratingHistories[rs], item)
			}
		}
	}

	if len(ratingHistories) == 0 {
		ratingHistories = user.RatingHistories
	}

	graduation := database.Graduation{
		Type:                "GRADUATION",
		Username:            info.Username,
		DisplayName:         user.DisplayName,
		PreviousCohort:      user.DojoCohort,
		NewCohort:           nextCohort,
		Score:               score,
		RatingSystem:        user.RatingSystem,
		StartRating:         startRating,
		CurrentRating:       currentRating,
		Comments:            request.Comments,
		Progress:            user.Progress,
		StartedAt:           startedAt,
		CreatedAt:           createdAt,
		NumberOfGraduations: numberOfGraduations,
		GraduationCohorts:   graduationCohorts,
		DojoMinutes:         dojoTime,
		NonDojoMinutes:      nonDojoTime,
		RatingHistories:     ratingHistories,
	}
	if err := repository.PutGraduation(&graduation); err != nil {
		return api.Failure(err), nil
	}

	timelineEntry := database.TimelineEntry{
		TimelineEntryKey: database.TimelineEntryKey{
			Owner: info.Username,
			Id:    fmt.Sprintf("%s_%s", now.Format(time.DateOnly), uuid.NewString()),
		},
		OwnerDisplayName:    user.DisplayName,
		RequirementId:       "Graduation",
		RequirementName:     fmt.Sprintf("Graduated from %s", user.DojoCohort),
		RequirementCategory: "Graduation",
		ScoreboardDisplay:   database.Hidden,
		Cohort:              user.DojoCohort,
		CreatedAt:           createdAt,
		GraduationInfo: &database.TimelineGraduationInfo{
			Comments:       request.Comments,
			DojoScore:      score,
			NewCohort:      nextCohort,
			DojoMinutes:    dojoTime,
			NonDojoMinutes: nonDojoTime,
			GamesAnnotated: gamesAnnotated,
		},
	}
	if err := repository.PutTimelineEntry(&timelineEntry); err != nil {
		log.Debugf("Failed to create timeline entry: %v", err)
	}

	update := database.UserUpdate{
		NumberOfGraduations: &numberOfGraduations,
		LastGraduatedAt:     &createdAt,
		DojoCohort:          &nextCohort,
		PreviousCohort:      &user.DojoCohort,
		GraduationCohorts:   &graduationCohorts,
	}
	user, err = repository.UpdateUser(info.Username, &update)
	if err != nil {
		return api.Failure(err), nil
	}

	if err := discord.SetCohortRole(user); err != nil {
		log.Errorf("Failed to update Discord role: %v", err)
	}

	return api.Success(&GraduationResponse{Graduation: &graduation, UserUpdate: user}), nil
}

func main() {
	lambda.Start(Handler)
}
