package main

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
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

var repository database.UserProgressUpdater = database.DynamoDB

type ProgressUpdateRequest struct {
	RequirementId           string              `json:"requirementId"`
	Cohort                  database.DojoCohort `json:"cohort"`
	PreviousCount           int                 `json:"previousCount"`
	NewCount                int                 `json:"newCount"`
	IncrementalMinutesSpent int                 `json:"incrementalMinutesSpent"`
	Date                    string              `json:"date"`
	Notes                   string              `json:"notes"`
}

type ProgressUpdateResponse struct {
	// The updated user
	User *database.User `json:"user"`
	// The new timeline entry
	TimelineEntry *database.TimelineEntry `json:"timelineEntry"`
}

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: username is required", "")), nil
	}

	if strings.HasSuffix(event.RawPath, "/v3") {
		return handlerV3(info, event)
	}

	return api.Failure(errors.New(400, "You are using an outdated version of the website. Please refresh and try again", "")), nil
}

func handlerV3(info *api.UserInfo, event api.Request) (api.Response, error) {
	request := &ProgressUpdateRequest{}
	if err := json.Unmarshal([]byte(event.Body), request); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)), nil
	}
	if request.RequirementId == "" {
		return api.Failure(errors.New(400, "Invalid request: requirementId is required", "")), nil
	}
	if request.Cohort == "" {
		return api.Failure(errors.New(400, "Invalid request: cohort is required", "")), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	for _, t := range user.CustomTasks {
		if t.Id == request.RequirementId {
			return handleTask(event, request, user, t)
		}
	}

	return handleDefaultTask(event, request, user)
}

func handleDefaultTask(event api.Request, request *ProgressUpdateRequest, user *database.User) (api.Response, error) {
	requirement, err := repository.GetRequirement(request.RequirementId)
	if err != nil {
		return api.Failure(err), nil
	}
	return handleTask(event, request, user, requirement)
}

func handleTask(event api.Request, request *ProgressUpdateRequest, user *database.User, task database.Task) (api.Response, error) {
	totalCount, ok := task.GetCounts()[request.Cohort]
	if !ok {
		return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: cohort `%s` does not apply to this requirement", request.Cohort), "")), nil
	}

	progress, ok := user.Progress[request.RequirementId]
	if !ok {
		progress = &database.RequirementProgress{
			RequirementId: request.RequirementId,
			Counts:        make(map[database.DojoCohort]int),
			MinutesSpent:  make(map[database.DojoCohort]int),
		}
	}
	if progress.Counts == nil {
		progress.Counts = make(map[database.DojoCohort]int)
	}

	if task.GetNumberOfCohorts() == 1 || task.GetNumberOfCohorts() == 0 {
		progress.Counts[database.AllCohorts] = request.NewCount
	} else {
		progress.Counts[request.Cohort] = request.NewCount
	}
	progress.MinutesSpent[request.Cohort] += request.IncrementalMinutesSpent

	now := time.Now()
	updatedAt := now.Format(time.RFC3339)
	progress.UpdatedAt = updatedAt

	date := now
	if request.Date != "" {
		d, err := time.Parse(time.RFC3339, request.Date)
		if err != nil {
			log.Errorf("Failed to parse request.Date: %v", err)
		} else {
			date = d
		}
	}

	originalScore := task.CalculateScoreCount(request.Cohort, request.PreviousCount)
	newScore := task.CalculateScoreCount(request.Cohort, request.NewCount)

	timelineEntry := &database.TimelineEntry{
		TimelineEntryKey: database.TimelineEntryKey{
			Owner: user.Username,
			Id:    fmt.Sprintf("%s_%s", date.Format(time.DateOnly), uuid.NewString()),
		},
		OwnerDisplayName:    user.DisplayName,
		RequirementId:       request.RequirementId,
		RequirementName:     task.GetName(),
		RequirementCategory: task.GetCategory(),
		IsCustomRequirement: task.IsCustom(),
		ScoreboardDisplay:   task.GetScoreboardDisplay(),
		ProgressBarSuffix:   task.GetProgressBarSuffix(),
		Cohort:              request.Cohort,
		TotalCount:          totalCount,
		PreviousCount:       request.PreviousCount,
		NewCount:            request.NewCount,
		DojoPoints:          newScore - originalScore,
		TotalDojoPoints:     newScore,
		MinutesSpent:        request.IncrementalMinutesSpent,
		TotalMinutesSpent:   progress.MinutesSpent[request.Cohort],
		Date:                date.Format(time.RFC3339),
		CreatedAt:           updatedAt,
		Notes:               request.Notes,
	}

	if err := repository.PutTimelineEntry(timelineEntry); err != nil {
		return api.Failure(err), nil
	}

	user, err := repository.UpdateUserProgress(user.Username, progress)
	if err != nil {
		return api.Failure(err), nil
	}

	checkMilestoneNotification(user)

	return api.Success(ProgressUpdateResponse{User: user, TimelineEntry: timelineEntry}), nil
}

const milestoneThreshold = 85

// checkMilestoneNotification checks if the user has reached the 85% completion
// milestone and, if so, sends a Discord DM to all senseis.
func checkMilestoneNotification(user *database.User) {
	if user == nil || !user.DojoCohort.IsValid() {
		return
	}

	milestoneKey := fmt.Sprintf("%d_%s", milestoneThreshold, user.DojoCohort)
	if slices.Contains(user.SentMilestoneNotifications, milestoneKey) {
		return
	}

	requirements, err := fetchAllRequirements(user.DojoCohort)
	if err != nil {
		log.Errorf("Failed to fetch requirements for milestone check: %v", err)
		return
	}

	percent := database.GetPercentComplete(user, requirements)
	if percent < float32(milestoneThreshold) {
		return
	}

	log.Infof("User %s reached %d%% completion in cohort %s, notifying senseis",
		user.Username, milestoneThreshold, user.DojoCohort)

	if err := discord.SendMilestoneNotificationToSenseis(user, milestoneThreshold); err != nil {
		log.Errorf("Failed to send milestone notification to senseis for %s: %v", user.Username, err)
	}

	if err := database.DynamoDB.AddSentMilestoneNotification(user.Username, milestoneKey); err != nil {
		log.Errorf("Failed to record milestone notification for %s: %v", user.Username, err)
	}
}

func fetchAllRequirements(cohort database.DojoCohort) ([]*database.Requirement, error) {
	var requirements []*database.Requirement
	var startKey string
	for ok := true; ok; ok = startKey != "" {
		reqs, nextKey, err := database.DynamoDB.ListRequirements(cohort, true, startKey)
		if err != nil {
			return nil, err
		}
		requirements = append(requirements, reqs...)
		startKey = nextKey
	}
	return requirements, nil
}
