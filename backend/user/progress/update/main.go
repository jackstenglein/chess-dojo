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

var milestone = milestoneChecker{
	notifySenseis:    discord.SendMilestoneNotificationToSenseis,
	recordMilestone:  database.DynamoDB.AddSentMilestoneNotification,
	listRequirements: database.DynamoDB.ListRequirements,
}

type milestoneChecker struct {
	notifySenseis    func(user *database.User, percent int) error
	recordMilestone  func(username string, milestoneKey string) error
	listRequirements func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error)
}

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

	user = cascadeLinkedProgress(request, user, task)
	milestone.checkNotification(user)

	return api.Success(ProgressUpdateResponse{User: user, TimelineEntry: timelineEntry}), nil
}

const milestoneThreshold = 85

// checkNotification checks if the user has reached the 85% completion
// milestone and, if so, sends a Discord DM to all senseis.
func (mc *milestoneChecker) checkNotification(user *database.User) {
	if user == nil || !user.DojoCohort.IsValid() {
		return
	}

	milestoneKey := fmt.Sprintf("%d_%s", milestoneThreshold, user.DojoCohort)
	if slices.Contains(user.SentMilestoneNotifications, milestoneKey) {
		return
	}

	requirements, err := mc.fetchAllRequirements(user.DojoCohort)
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

	if err := mc.notifySenseis(user, milestoneThreshold); err != nil {
		log.Errorf("Failed to send milestone notification to senseis for %s: %v", user.Username, err)
		return
	}

	if err := mc.recordMilestone(user.Username, milestoneKey); err != nil {
		log.Errorf("Failed to record milestone notification for %s: %v", user.Username, err)
	}
}

func (mc *milestoneChecker) fetchAllRequirements(cohort database.DojoCohort) ([]*database.Requirement, error) {
	var requirements []*database.Requirement
	var startKey string
	for ok := true; ok; ok = startKey != "" {
		reqs, nextKey, err := mc.listRequirements(cohort, true, startKey)
		if err != nil {
			return nil, err
		}
		requirements = append(requirements, reqs...)
		startKey = nextKey
	}
	return requirements, nil
}

// cascadeLinkedProgress updates the linked requirement's progress when the
// source requirement has a LinkedRequirementId set. This is a one-way cascade:
// incrementing the source also increments the linked target by the same delta.
// No timeline entry is written for the linked requirement; only the raw
// progress count and minutes are updated.
// Errors are logged but do not block the primary update.
func cascadeLinkedProgress(request *ProgressUpdateRequest, user *database.User, task database.Task) *database.User {
	req, ok := task.(*database.Requirement)
	if !ok || req.LinkedRequirementId == "" {
		return user
	}

	delta := request.NewCount - request.PreviousCount
	if delta <= 0 && request.IncrementalMinutesSpent <= 0 {
		return user
	}

	linkedReq, err := repository.GetRequirement(req.LinkedRequirementId)
	if err != nil {
		log.Errorf("Cascade: failed to get linked requirement %s for user %s (source: %s): %v", req.LinkedRequirementId, user.Username, req.Id, err)
		return user
	}

	if _, ok := linkedReq.Counts[request.Cohort]; !ok {
		log.Infof("Cascade: cohort %s not in linked requirement %s counts, skipping", request.Cohort, req.LinkedRequirementId)
		return user
	}

	linkedProgress, ok := user.Progress[req.LinkedRequirementId]
	if !ok {
		linkedProgress = &database.RequirementProgress{
			RequirementId: req.LinkedRequirementId,
			Counts:        make(map[database.DojoCohort]int),
			MinutesSpent:  make(map[database.DojoCohort]int),
		}
	}
	if linkedProgress.Counts == nil {
		linkedProgress.Counts = make(map[database.DojoCohort]int)
	}
	if linkedProgress.MinutesSpent == nil {
		linkedProgress.MinutesSpent = make(map[database.DojoCohort]int)
	}

	if delta > 0 {
		maxCount := linkedReq.Counts[request.Cohort]
		if linkedReq.NumberOfCohorts == 1 || linkedReq.NumberOfCohorts == 0 {
			linkedProgress.Counts[database.AllCohorts] = min(linkedProgress.Counts[database.AllCohorts]+delta, maxCount)
		} else {
			linkedProgress.Counts[request.Cohort] = min(linkedProgress.Counts[request.Cohort]+delta, maxCount)
		}
	}

	if request.IncrementalMinutesSpent > 0 {
		linkedProgress.MinutesSpent[request.Cohort] += request.IncrementalMinutesSpent
	}

	linkedProgress.UpdatedAt = time.Now().Format(time.RFC3339)

	updatedUser, err := repository.UpdateUserProgress(user.Username, linkedProgress)
	if err != nil {
		log.Errorf("Cascade: failed to update linked progress for user %s, requirement %s: %v", user.Username, req.LinkedRequirementId, err)
		return user
	}

	return updatedUser
}
