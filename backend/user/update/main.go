package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"slices"
	"strings"
	"time"

	goaway "github.com/TwiN/go-away"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/discord"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/ratings"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

type userRepository interface {
	GetUser(username string) (*database.User, error)
	UpdateUser(username string, update *database.UserUpdate) (*database.User, error)
	ListTimelineEntries(owner string, startKey string) ([]*database.TimelineEntry, string, error)
	PutTimelineEntries(entries []*database.TimelineEntry) (int, error)
}

var repository userRepository = database.DynamoDB
var mediaStore database.MediaStore = database.S3
var stage = os.Getenv("stage")
var profanityDetector = goaway.NewProfanityDetector().WithExactWord(true)

const (
	referralSheetId = "198Me8Qm7YVKEtlY0Y56PbePaJz-Quqr4cA6hhhdRkgc"
	sheetRange      = "Sheet1"
)

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

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}

	update := &database.UserUpdate{}
	if err := json.Unmarshal([]byte(event.Body), update); err != nil {
		return api.Failure(errors.Wrap(400, "Invalid request: unable to unmarshal request body", "", err)), nil
	}

	autopickCohort := event.QueryStringParameters["autopickCohort"]
	if autopickCohort == "true" {
		return handleAutopickCohort(user, update), nil
	}

	if update.DisplayName != nil {
		displayName := strings.TrimSpace(*update.DisplayName)
		update.DisplayName = &displayName
		if *update.DisplayName == "" {
			return api.Failure(errors.New(400, "Invalid request: displayName cannot be empty", "")), nil
		}
	}
	if update.RatingSystem != nil {
		ratingSystem := strings.TrimSpace(string(*update.RatingSystem))
		update.RatingSystem = (*database.RatingSystem)(&ratingSystem)
		if *update.RatingSystem == "" {
			return api.Failure(errors.New(400, "Invalid request: ratingSystem cannot be empty", "")), nil
		}
	}
	if update.DojoCohort != nil {
		cohort := strings.TrimSpace(string(*update.DojoCohort))
		update.DojoCohort = (*database.DojoCohort)(&cohort)
		if *update.DojoCohort == "" {
			return api.Failure(errors.New(400, "Invalid request: dojoCohort cannot be empty", "")), nil
		}
	}
	// Validates that the bio does not contain profanity
	if update.Bio != nil {
		if profanityDetector.IsProfane(*update.Bio) {
			flagged := profanityDetector.ExtractProfanity(*update.Bio)
			return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: bio contains inappropriate language: %q", flagged), "")), nil
		}
	}
	if err := validateMainClubId(user, update); err != nil {
		return api.Failure(err), nil
	}
	if update.CustomPlans != nil {
		if err := validateCustomPlans(info.Username, *update.CustomPlans); err != nil {
			return api.Failure(err), nil
		}
		if !user.IsSubscribed() {
			if err := validateFreeTierPlans(*update.CustomPlans); err != nil {
				return api.Failure(err), nil
			}
		}
	}
	if update.ActivePlanId != nil {
		if err := validateActivePlanId(user, update); err != nil {
			return api.Failure(err), nil
		}
	}
	if update.PlanPins != nil {
		if err := validatePlanPins(user, update); err != nil {
			return api.Failure(err), nil
		}
	}
	if err := saveReferralSource(ctx, user, update); err != nil {
		return api.Failure(err), nil
	}

	if err := fetchRatings(user, update); err != nil {
		return api.Failure(err), nil
	}

	if update.ProfilePictureData != nil {
		if *update.ProfilePictureData == "" {
			err = mediaStore.DeleteImage(fmt.Sprintf("/profile/%s", info.Username))
		} else {
			err = mediaStore.UploadImage(fmt.Sprintf("/profile/%s", info.Username), *update.ProfilePictureData)
		}
		if err != nil {
			return api.Failure(err), nil
		}
		update.ProfilePictureSet = new(true)
	}

	update.SearchKey = new(database.GetSearchKey(user, update))
	newUser, err := repository.UpdateUser(info.Username, update)
	if err != nil {
		return api.Failure(err), nil
	}

	if update.CustomTasks != nil {
		handleCustomTaskUpdate(user, newUser)
	}
	if update.DojoCohort != nil {
		if err := discord.SetCohortRole(newUser); err != nil {
			log.Errorf("Failed to set Discord roles: %v", err)
		}
	}

	return api.Success(newUser), nil
}

// validateMainClubId returns an error if the update sets mainClubId to a club
// the user is not a member of. An empty string is allowed and clears the designation.
func validateMainClubId(user *database.User, update *database.UserUpdate) error {
	if update.MainClubId == nil {
		return nil
	}
	clubId := strings.TrimSpace(*update.MainClubId)
	update.MainClubId = &clubId
	if clubId == "" {
		return nil
	}
	if !slices.Contains(user.Clubs, clubId) {
		return errors.New(400, "Invalid request: mainClubId must be a club you are a member of", "")
	}
	return nil
}

// hexColorRegex matches a 6-digit hex color like #faa137.
var hexColorRegex = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// bucketCategories are the Dojo categories a custom plan bucket can stand for.
var bucketCategories = map[string]bool{
	"Welcome to the Dojo":    true,
	"Games + Analysis":       true,
	"Tactics":                true,
	"Middlegames + Strategy": true,
	"Endgame":                true,
	"Opening":                true,
	"Non-Dojo":               true,
}

const (
	maxCustomPlans  = 10
	maxPlanBuckets  = 50
	maxBucketTasks  = 500
	maxPlanNameSize = 100
)

// validateCustomPlans checks the user's custom plans and normalizes their names
// and owners.
func validateCustomPlans(username string, plans []*database.CustomPlan) error {
	if len(plans) > maxCustomPlans {
		return errors.New(400, fmt.Sprintf("Invalid request: no more than %d custom plans are allowed", maxCustomPlans), "")
	}
	planIds := make(map[string]bool, len(plans))
	for _, plan := range plans {
		if plan == nil {
			return errors.New(400, "Invalid request: custom plan cannot be null", "")
		}
		plan.Owner = username
		plan.Name = strings.TrimSpace(plan.Name)
		if plan.Id == "" {
			return errors.New(400, "Invalid request: custom plan id cannot be empty", "")
		}
		if plan.Name == "" {
			return errors.New(400, "Invalid request: custom plan name cannot be empty", "")
		}
		if len(plan.Name) > maxPlanNameSize {
			return errors.New(400, fmt.Sprintf("Invalid request: custom plan name cannot exceed %d characters", maxPlanNameSize), "")
		}
		if planIds[plan.Id] {
			return errors.New(400, "Invalid request: custom plan ids must be unique", "")
		}
		planIds[plan.Id] = true

		if len(plan.Buckets) > maxPlanBuckets {
			return errors.New(400, fmt.Sprintf("Invalid request: no more than %d buckets are allowed per plan", maxPlanBuckets), "")
		}
		bucketIds := make(map[string]bool, len(plan.Buckets))
		for _, bucket := range plan.Buckets {
			if bucket == nil {
				return errors.New(400, "Invalid request: custom plan bucket cannot be null", "")
			}
			bucket.Name = strings.TrimSpace(bucket.Name)
			if bucket.Id == "" {
				return errors.New(400, "Invalid request: custom plan bucket id cannot be empty", "")
			}
			if bucket.Name == "" {
				return errors.New(400, "Invalid request: custom plan bucket name cannot be empty", "")
			}
			if len(bucket.Name) > maxPlanNameSize {
				return errors.New(400, fmt.Sprintf("Invalid request: custom plan bucket name cannot exceed %d characters", maxPlanNameSize), "")
			}
			if bucketIds[bucket.Id] {
				return errors.New(400, "Invalid request: custom plan bucket ids must be unique within a plan", "")
			}
			bucketIds[bucket.Id] = true
			if bucket.Category != "" && !bucketCategories[bucket.Category] {
				return errors.New(400, "Invalid request: custom plan bucket category is not a Dojo category", "")
			}
			bucket.Color = strings.TrimSpace(bucket.Color)
			if bucket.Color != "" && !hexColorRegex.MatchString(bucket.Color) {
				return errors.New(400, "Invalid request: custom plan bucket color must be a hex color like #faa137", "")
			}
			if len(bucket.TaskIds) > maxBucketTasks {
				return errors.New(400, fmt.Sprintf("Invalid request: no more than %d tasks are allowed per bucket", maxBucketTasks), "")
			}
		}
	}
	return nil
}

const (
	// freeTierMaxPlans is the number of custom plans a free-tier user can have.
	freeTierMaxPlans = 1
	// freeTierMaxBuckets is the number of buckets in a free-tier user's plan.
	freeTierMaxBuckets = 5
	// freeTierMaxBucketTasks is the number of tasks in each bucket of a free-tier user's plan.
	freeTierMaxBucketTasks = 3
)

// validateFreeTierPlans checks the smaller limits on a free-tier user's custom
// plans: one plan of up to 5 buckets with up to 3 tasks each.
func validateFreeTierPlans(plans []*database.CustomPlan) error {
	if len(plans) > freeTierMaxPlans {
		return errors.New(403, fmt.Sprintf("Free-tier users can have at most %d custom plan", freeTierMaxPlans), "")
	}
	for _, plan := range plans {
		if len(plan.Buckets) > freeTierMaxBuckets {
			return errors.New(403, fmt.Sprintf("Free-tier plans can have at most %d buckets", freeTierMaxBuckets), "")
		}
		for _, bucket := range plan.Buckets {
			if len(bucket.TaskIds) > freeTierMaxBucketTasks {
				return errors.New(403, fmt.Sprintf("Free-tier plans can have at most %d tasks per bucket", freeTierMaxBucketTasks), "")
			}
		}
	}
	return nil
}

// validateActivePlanId checks that the active plan id is empty (the default Dojo
// plan) or refers to one of the user's custom plans.
func validateActivePlanId(user *database.User, update *database.UserUpdate) error {
	id := strings.TrimSpace(*update.ActivePlanId)
	update.ActivePlanId = &id
	if id == "" {
		return nil
	}
	plans := user.CustomPlans
	if update.CustomPlans != nil {
		plans = *update.CustomPlans
	}
	for _, plan := range plans {
		if plan != nil && plan.Id == id {
			return nil
		}
	}
	return errors.New(400, "Invalid request: activePlanId must be empty or the id of one of your custom plans", "")
}

// The maximum number of pinned tasks saved for a single inactive plan.
const maxPlanPinnedTasks = 100

// validatePlanPins checks that every key of the saved plan pins is the Dojo plan
// or one of the user's custom plans, and that no plan has too many pins.
func validatePlanPins(user *database.User, update *database.UserUpdate) error {
	plans := user.CustomPlans
	if update.CustomPlans != nil {
		plans = *update.CustomPlans
	}
	planIds := make(map[string]bool, len(plans)+1)
	planIds[database.DojoPlanPinsKey] = true
	for _, plan := range plans {
		if plan != nil {
			planIds[plan.Id] = true
		}
	}

	for id, pins := range *update.PlanPins {
		if !planIds[id] {
			return errors.New(400, "Invalid request: planPins keys must be `dojo` or the id of one of your custom plans", "")
		}
		if pins != nil && len(pins.PinnedTasks) > maxPlanPinnedTasks {
			return errors.New(400, fmt.Sprintf("Invalid request: no more than %d pinned tasks are allowed per plan", maxPlanPinnedTasks), "")
		}
	}
	return nil
}

func fetchCurrentRating(rating *database.Rating, fetcher ratings.RatingFetchFunc) error {
	rating.Username = strings.TrimSpace(rating.Username)
	if rating.Username == "" {
		rating.CurrentRating = 0
		rating.StartRating = 0
		return nil
	}

	data, err := fetcher(rating.Username)
	if err != nil {
		return err
	}

	rating.CurrentRating = data.CurrentRating
	rating.Deviation = data.Deviation
	rating.NumGames = data.NumGames
	if rating.StartRating == 0 {
		rating.StartRating = data.CurrentRating
	}
	return nil
}

func fetchRatings(user *database.User, update *database.UserUpdate) error {
	if update.Ratings == nil {
		return nil
	}

	for system, rating := range *update.Ratings {
		existingRating := user.Ratings[system]
		if system != database.Custom && system != database.Custom2 && system != database.Custom3 && (existingRating == nil || rating.Username != existingRating.Username || rating.CurrentRating == 0 || rating.StartRating == 0) {
			if err := fetchCurrentRating(rating, ratings.RatingFetchFuncs[system]); err != nil {
				return err
			}
		}
	}
	return nil
}

func handleAutopickCohort(user *database.User, update *database.UserUpdate) api.Response {
	if update.RatingSystem == nil || *update.RatingSystem == "" {
		return api.Failure(errors.New(400, "Invalid request: ratingSystem is required when autopickCohort is true", ""))
	}
	if *update.RatingSystem == database.Custom || *update.RatingSystem == database.Custom2 || *update.RatingSystem == database.Custom3 {
		return api.Failure(errors.New(400, "Invalid request: ratingSystem cannot be CUSTOM when autopickCohort is true", ""))
	}

	if err := fetchRatings(user, update); err != nil {
		return api.Failure(err)
	}
	if cohort := update.AutopickCohort(); cohort == database.NoCohort {
		return api.Failure(errors.New(500, "Unable to choose cohort. Please contact support", fmt.Sprintf("Autopick cohort returned NoCohort for update %#v", update)))
	}

	user, err := repository.UpdateUser(user.Username, update)
	if err != nil {
		return api.Failure(err)
	}
	return api.Success(user)
}

func saveReferralSource(ctx context.Context, user *database.User, update *database.UserUpdate) error {
	if update.ReferralSource == nil {
		return nil
	}

	source := strings.TrimSpace(*update.ReferralSource)
	update.ReferralSource = &source

	if *update.ReferralSource == "" {
		return errors.New(400, "Invalid request: referralSource cannot be empty", "")
	}

	// Do not return any further errors as not being able to write to the spreadsheet shouldn't block users
	// from signing up. Instead just log all errors

	client, err := getSheetsClient(ctx)
	if err != nil {
		log.Errorf("Failed to get sheets client: %v", err)
		return nil
	}

	valueRange := &sheets.ValueRange{
		MajorDimension: "ROWS",
		Values: [][]any{
			{
				time.Now().Format(time.RFC3339),
				user.Username,
				user.Email,
				*update.ReferralSource,
				user.SubscriptionStatus,
			},
		},
	}
	call := client.Spreadsheets.Values.Append(referralSheetId, sheetRange, valueRange).ValueInputOption("RAW").Context(ctx)
	_, err = call.Do()
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed Spreadsheet append call", err)
		log.Error(err)
	}

	if err := os.Remove("/tmp/openClassicalServiceAccountKey.json"); err != nil {
		log.Error(errors.Wrap(500, "Failed to remove JSON file: %v", "", err))
	}

	return nil
}

// Gets a client for Google Sheets.
func getSheetsClient(ctx context.Context) (*sheets.Service, error) {
	f, err := os.Create("/tmp/openClassicalServiceAccountKey.json")
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create file for service account key", err)
	}

	if err = mediaStore.Download(fmt.Sprintf("chess-dojo-%s-secrets", stage), "openClassicalServiceAccountKey.json", f); err != nil {
		return nil, err
	}
	if err = f.Close(); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to close file for service account key", err)
	}

	client, err := sheets.NewService(ctx, option.WithCredentialsFile("/tmp/openClassicalServiceAccountKey.json"))
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create Sheets client", err)
	}
	return client, nil
}

// Handles updating the user's timeline for a custom task update, if necessary.
// Note that we assume the user can only update a single custom task at a time,
// as that is currently the only flow supported by the frontend.
func handleCustomTaskUpdate(before *database.User, after *database.User) {
	for _, t := range before.CustomTasks {
		for _, t2 := range after.CustomTasks {
			if t.Id == t2.Id && t.Category != t2.Category {
				updateTimeline(after, t2)
				return
			}
		}
	}
}

// Updates the timeline for the given user so that entries matching the given
// task have the correct requirement category and scoreboard display.
func updateTimeline(user *database.User, task *database.CustomTask) {
	log.Infof("Updating timeline for task %q: %v", task.Id, task)

	startKey := ""
	for loop := true; loop; loop = (startKey != "") {
		entries, lastKey, err := repository.ListTimelineEntries(user.Username, startKey)
		if err != nil {
			log.Errorf("Failed to fetch timeline entries: %v", err)
			return
		}
		log.Infof("Checking %d entries: %v", len(entries), entries)

		updatedEntries := make([]*database.TimelineEntry, 0)
		for _, entry := range entries {
			if entry.RequirementId == task.Id && (entry.RequirementCategory != task.Category || entry.ScoreboardDisplay != task.ScoreboardDisplay) {
				entry.RequirementCategory = task.Category
				entry.ScoreboardDisplay = task.ScoreboardDisplay
				updatedEntries = append(updatedEntries, entry)
			}
		}

		log.Infof("Updating %d entries: %v", len(updatedEntries), updatedEntries)
		_, err = repository.PutTimelineEntries(updatedEntries)
		if err != nil {
			log.Errorf("Failed to update timeline entries: %v", err)
			return
		}

		startKey = lastKey
	}
}
