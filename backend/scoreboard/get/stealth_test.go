package main

import (
	"encoding/json"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"testing"
)

type cohortRepository struct {
	database.ScoreboardSummaryLister
	user database.User
}

func (r cohortRepository) GetCohort(string, string) ([]database.User, string, error) {
	return []database.User{r.user}, "next", nil
}

type requirementRepository struct {
	database.RequirementLister
	calls int
}

func (r *requirementRepository) ListRequirements(cohort database.DojoCohort, scoreboardOnly bool, start string) ([]*database.Requirement, string, error) {
	r.calls++
	if scoreboardOnly {
		panic("must match the frontend's full requirement set")
	}
	req := &database.Requirement{Id: "task", Counts: map[database.DojoCohort]int{cohort: 10}, UnitScore: 2, NumberOfCohorts: 1}
	if start == "" {
		return []*database.Requirement{req}, "page2", nil
	}
	return nil, "", nil
}
func TestCohortScoreCalculatedBeforeRedaction(t *testing.T) {
	old, oldReq := repository, requirementsRepository
	defer func() { repository, requirementsRepository = old, oldReq }()
	user := database.User{Username: "owner", DojoCohort: "1200-1300", Progress: map[string]*database.RequirementProgress{"task": {Counts: map[database.DojoCohort]int{database.AllCohorts: 3}}}}
	repository = cohortRepository{user: user}
	reqs := &requirementRepository{}
	requirementsRepository = reqs
	response := handleCohort("1200-1300", "")
	var body struct {
		Data    []database.User `json:"data"`
		LastKey string          `json:"lastEvaluatedKey"`
	}
	if err := json.Unmarshal([]byte(response.Body), &body); err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 200 || len(body.Data) != 1 || body.Data[0].CohortDojoScore == nil || *body.Data[0].CohortDojoScore != 6 || reqs.calls != 2 || body.LastKey != "next" {
		t.Fatal(response.Body, reqs.calls)
	}
}
