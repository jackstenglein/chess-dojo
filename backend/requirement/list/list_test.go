package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type mockRequirementLister struct {
	requirements []*database.Requirement
}

func (m mockRequirementLister) ListRequirements(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
	if scoreboardOnly {
		return nil, "", nil
	}
	return m.requirements, "", nil
}

func (m mockRequirementLister) ScanRequirements(cohort database.DojoCohort, startKey string) ([]*database.Requirement, string, error) {
	return m.requirements, "", nil
}

const testRequirementId = "test-requirement-id"

var goldenRequirement = &database.Requirement{
	Id:          testRequirementId,
	Status:      database.Active,
	Category:    "Test Category",
	Name:        "Test Name",
	Description: "Test Description",
	Counts: map[database.DojoCohort]int{
		"testCohort1": 25,
		"testCohort2": 50,
	},
	NumberOfCohorts:   2,
	UnitScore:         1,
	VideoUrls:         []string{"Test Video Urls"},
	ScoreboardDisplay: database.Hidden,
	UpdatedAt:         "2023-03-01T12:00:00Z",
	SortPriority:      "0.0.0",
}

func getEvent(testName, cohort, scoreboardOnly string) api.Request {
	return api.Request{
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			RequestID: testName,
		},
		PathParameters: map[string]string{
			"cohort": cohort,
		},
		QueryStringParameters: map[string]string{
			"scoreboardOnly": scoreboardOnly,
		},
	}
}

func TestListRequirements(t *testing.T) {
	original := repository
	repository = mockRequirementLister{requirements: []*database.Requirement{goldenRequirement}}
	t.Cleanup(func() { repository = original })

	ctx := context.Background()

	table := []struct {
		name           string
		cohort         string
		scoreboardOnly string
		wantCode       int
		wantErr        bool
		wantReqs       []*database.Requirement
	}{
		{
			name:     "MissingCohort",
			wantCode: 200,
			wantReqs: []*database.Requirement{goldenRequirement},
		},
		{
			name:           "ScoreboardOnly",
			cohort:         "testCohort1",
			scoreboardOnly: "true",
			wantCode:       200,
		},
		{
			name:     "HiddenRequirements",
			cohort:   "testCohort1",
			wantCode: 200,
			wantReqs: []*database.Requirement{goldenRequirement},
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			event := getEvent(tc.name, tc.cohort, tc.scoreboardOnly)
			got, err := Handler(ctx, event)

			if err != nil {
				t.Errorf("ListRequirements(%v) got err: %v", event, err)
			}

			if got.StatusCode != tc.wantCode {
				t.Errorf("ListRequirements(%v) response: %v", event, got)
				t.Fatalf("ListRequirements(%v) got status: %d; want status: %d", event, got.StatusCode, tc.wantCode)
			}

			if !tc.wantErr {
				gotResp := &ListRequirementsResponse{}
				json.Unmarshal([]byte(got.Body), gotResp)

				if diff := cmp.Diff(tc.wantReqs, gotResp.Requirements, cmpopts.EquateEmpty()); diff != "" {
					t.Errorf("ListRequirements(%v) diff (-want +got):\n%s", event, diff)
				}
			}
		})
	}
}
