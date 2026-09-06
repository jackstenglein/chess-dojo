// Package trainingprivacy enforces the audience for training data at API boundaries.
package trainingprivacy

import (
	"encoding/json"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type Repository interface {
	GetTrainingPrivacyUser(string) (*database.User, error)
	GetTrainingPrivacyUsers([]string) ([]*database.User, error)
	GetTrainingPrivacyFollower(string, string) (*database.FollowerEntry, error)
}

type Access struct {
	repo    Repository
	viewer  string
	users   map[string]*database.User
	allowed map[string]bool
}

func New(repo Repository, viewer string) *Access {
	return &Access{repo: repo, viewer: viewer, users: map[string]*database.User{}, allowed: map[string]bool{}}
}

func (a *Access) user(username string) (*database.User, error) {
	if u, ok := a.users[username]; ok {
		return u, nil
	}
	u, err := a.repo.GetTrainingPrivacyUser(username)
	if err != nil {
		return nil, err
	}
	a.users[username] = u
	return u, nil
}

func (a *Access) CanView(owner string) (bool, error) {
	if owner != "" && owner == a.viewer {
		return true, nil
	}
	if allowed, ok := a.allowed[owner]; ok {
		return allowed, nil
	}
	allowed, err := a.canView(owner)
	if err == nil {
		a.allowed[owner] = allowed
	}
	return allowed, err
}

func (a *Access) canView(owner string) (bool, error) {
	u, err := a.user(owner)
	var apiErr *errors.Error
	if errors.As(err, &apiErr) && apiErr.Code == 404 {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if u == nil {
		return false, nil
	}
	if u.TrainingVisibility == "" || u.TrainingVisibility == database.TrainingVisibilityPublic {
		return true, nil
	}
	if a.viewer == "" {
		return false, nil
	}
	viewer, err := a.user(a.viewer)
	if err != nil {
		return false, err
	}
	if viewer == nil {
		return false, nil
	}
	if viewer.IsAdmin {
		return true, nil
	}
	switch u.TrainingVisibility {
	case database.TrainingVisibilityMembers:
		return viewer.IsSubscribed(), nil
	case database.TrainingVisibilityMutuals:
		forward, err := a.repo.GetTrainingPrivacyFollower(owner, a.viewer)
		if err != nil || forward == nil {
			return false, err
		}
		reverse, err := a.repo.GetTrainingPrivacyFollower(a.viewer, owner)
		return reverse != nil, err
	default:
		return false, nil
	}
}

func (a *Access) Require(owner string) error {
	if owner == "" {
		return errors.New(400, "Owner is required", "")
	}
	allowed, err := a.CanView(owner)
	if err != nil {
		return err
	}
	if !allowed {
		return errors.New(403, "Training activity is private", "")
	}
	return nil
}

// NoStore prevents a response for one audience being reused for another.
func NoStore(response api.Response) api.Response {
	if response.Headers == nil {
		response.Headers = map[string]string{}
	}
	response.Headers["Cache-Control"] = "private, no-store"
	return response
}

// Training fields are omitted at the serialization boundary, never zeroed on stored users.
var trainingFields = []string{
	"progress", "customTasks", "pinnedTasks", "openingProgress", "minutesSpent", "totalDojoScore",
	"numberOfGraduations", "previousCohort", "graduationCohorts", "lastGraduatedAt", "gamesCreated",
	"workGoal", "workGoalHistory", "weeklyPlan", "gameSchedule", "timerSeconds", "timerStartedAt", "timerTaskId",
	"exams", "puzzles", "squareColorRating", "mateInOneRating", "timeManagementRating", "sentMilestoneNotifications",
}

func (a *Access) redactUser(user map[string]any) error {
	owner, ok := user["username"].(string)
	if !ok || owner == "" {
		return nil
	}
	allowed, err := a.CanView(owner)
	if err != nil {
		return err
	}
	user["canViewTraining"] = allowed
	if !allowed {
		for _, field := range trainingFields {
			delete(user, field)
		}
	}
	return nil
}

// ProtectUsers handles the existing user, cohort, scoreboard and club response envelopes.
func (a *Access) ProtectUsers(response api.Response) api.Response {
	if response.StatusCode != 200 {
		return NoStore(response)
	}
	var payload any
	if err := json.Unmarshal([]byte(response.Body), &payload); err != nil {
		return NoStore(api.Failure(err))
	}

	var users []map[string]any
	appendRows := func(rows []any) {
		for _, row := range rows {
			if user, ok := row.(map[string]any); ok {
				users = append(users, user)
			}
		}
	}
	switch body := payload.(type) {
	case []any:
		appendRows(body)
	case map[string]any:
		if _, ok := body["username"]; ok {
			users = append(users, body)
		}
		for _, key := range []string{"users", "data", "scoreboard"} {
			if rows, ok := body[key].([]any); ok {
				appendRows(rows)
			}
		}
	}
	owners := make([]string, 0, len(users))
	for _, user := range users {
		if owner, ok := user["username"].(string); ok {
			owners = append(owners, owner)
		}
	}
	if err := a.prime(owners); err != nil {
		return NoStore(api.Failure(err))
	}
	for _, user := range users {
		if err := a.redactUser(user); err != nil {
			return NoStore(api.Failure(err))
		}
	}
	return NoStore(api.Success(payload))
}

func (a *Access) prime(owners []string) error {
	pending := map[string]bool{}
	for _, owner := range owners {
		if owner != "" && owner != a.viewer {
			if _, ok := a.users[owner]; !ok {
				pending[owner] = true
			}
		}
	}
	if len(pending) == 0 {
		return nil
	}
	if a.viewer != "" {
		if _, ok := a.users[a.viewer]; !ok {
			pending[a.viewer] = true
		}
	}
	names := make([]string, 0, len(pending))
	for name := range pending {
		names = append(names, name)
	}
	users, err := a.repo.GetTrainingPrivacyUsers(names)
	if err != nil {
		return err
	}
	for _, name := range names {
		a.users[name] = nil
	}
	for _, user := range users {
		a.users[user.Username] = user
	}
	return nil
}

func Filter[T any](a *Access, rows []T, owner func(T) string) ([]T, error) {
	owners := make([]string, 0, len(rows))
	for _, row := range rows {
		owners = append(owners, owner(row))
	}
	if err := a.prime(owners); err != nil {
		return nil, err
	}
	result := make([]T, 0, len(rows))
	for _, row := range rows {
		allowed, err := a.CanView(owner(row))
		if err != nil {
			return nil, err
		}
		if allowed {
			result = append(result, row)
		}
	}
	return result, nil
}
