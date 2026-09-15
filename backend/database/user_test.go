package database

import (
	"testing"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
)

func TestIsValidCohort(t *testing.T) {
	for _, c := range Cohorts {
		if !IsValidCohort(c) {
			t.Errorf("IsValidCohort(%s) got false; want true", c)
		}
	}
	if !IsValidCohort(AllCohorts) {
		t.Errorf("IsValidCohort(%s) got false; want true", AllCohorts)
	}
	if IsValidCohort(DojoCohort("fakeCohort")) {
		t.Errorf("IsValidCohort(fakeCohort) got true; want false")
	}
}

func TestGetNextCohort(t *testing.T) {
	table := []struct {
		cohort string
		want   string
	}{
		{
			cohort: "0-400",
			want:   "NO_COHORT",
		},
		{
			cohort: "0-300",
			want:   "300-400",
		},
		{
			cohort: "300-400",
			want:   "400-500",
		},
		{
			cohort: "400-500",
			want:   "500-600",
		},
		{
			cohort: "500-600",
			want:   "600-700",
		},
		{
			cohort: "600-700",
			want:   "700-800",
		},
		{
			cohort: "700-800",
			want:   "800-900",
		},
		{
			cohort: "800-900",
			want:   "900-1000",
		},
		{
			cohort: "900-1000",
			want:   "1000-1100",
		},
		{
			cohort: "1000-1100",
			want:   "1100-1200",
		},
		{
			cohort: "1100-1200",
			want:   "1200-1300",
		},
		{
			cohort: "1200-1300",
			want:   "1300-1400",
		},
		{
			cohort: "1300-1400",
			want:   "1400-1500",
		},
		{
			cohort: "1400-1500",
			want:   "1500-1600",
		},
		{
			cohort: "1500-1600",
			want:   "1600-1700",
		},
		{
			cohort: "1600-1700",
			want:   "1700-1800",
		},
		{
			cohort: "1700-1800",
			want:   "1800-1900",
		},
		{
			cohort: "1800-1900",
			want:   "1900-2000",
		},
		{
			cohort: "1900-2000",
			want:   "2000-2100",
		},
		{
			cohort: "2000-2100",
			want:   "2100-2200",
		},
		{
			cohort: "2100-2200",
			want:   "2200-2300",
		},
		{
			cohort: "2200-2300",
			want:   "2300-2400",
		},
		{
			cohort: "2300-2400",
			want:   "2400+",
		},
		{
			cohort: "2400+",
			want:   "NO_COHORT",
		},
		{
			cohort: "nonexistentCohort",
			want:   "NO_COHORT",
		},
	}

	for _, tc := range table {
		t.Run(tc.cohort, func(t *testing.T) {
			got := DojoCohort(tc.cohort).GetNextCohort()

			if string(got) != tc.want {
				t.Errorf("GetNextCohort(%s) got %s; want %s", tc.cohort, got, tc.want)
			}
		})
	}
}

func TestGetRatings(t *testing.T) {
	table := []struct {
		name        string
		user        *User
		wantStart   int
		wantCurrent int
	}{
		{
			name: "NilUser",
		},
		{
			name: "Chesscom",
			user: &User{
				RatingSystem: Chesscom,
				// StartChesscomRating:   1500,
				// CurrentChesscomRating: 1572,
				// StartLichessRating:    1400,
				// CurrentLichessRating:  1472,
				// StartFideRating:       1300,
				// CurrentFideRating:     1372,
				// StartUscfRating:       1200,
				// CurrentUscfRating:     1272,
			},
			wantStart:   1500,
			wantCurrent: 1572,
		},
		{
			name: "Lichess",
			user: &User{
				RatingSystem: Lichess,
				// StartChesscomRating:   1500,
				// CurrentChesscomRating: 1572,
				// StartLichessRating:    1400,
				// CurrentLichessRating:  1472,
				// StartFideRating:       1300,
				// CurrentFideRating:     1372,
				// StartUscfRating:       1200,
				// CurrentUscfRating:     1272,
			},
			wantStart:   1400,
			wantCurrent: 1472,
		},
		{
			name: "Fide",
			user: &User{
				RatingSystem: Fide,
				// StartChesscomRating:   1500,
				// CurrentChesscomRating: 1572,
				// StartLichessRating:    1400,
				// CurrentLichessRating:  1472,
				// StartFideRating:       1300,
				// CurrentFideRating:     1372,
				// StartUscfRating:       1200,
				// CurrentUscfRating:     1272,
			},
			wantStart:   1300,
			wantCurrent: 1372,
		},
		{
			name: "Uscf",
			user: &User{
				RatingSystem: Uscf,
				// StartChesscomRating:   1500,
				// CurrentChesscomRating: 1572,
				// StartLichessRating:    1400,
				// CurrentLichessRating:  1472,
				// StartFideRating:       1300,
				// CurrentFideRating:     1372,
				// StartUscfRating:       1200,
				// CurrentUscfRating:     1272,
			},
			wantStart:   1200,
			wantCurrent: 1272,
		},
		{
			name: "Nonexistent",
			user: &User{
				RatingSystem: "Nonexistent",
				// StartChesscomRating:   1500,
				// CurrentChesscomRating: 1572,
				// StartLichessRating:    1400,
				// CurrentLichessRating:  1472,
				// StartFideRating:       1300,
				// CurrentFideRating:     1372,
				// StartUscfRating:       1200,
				// CurrentUscfRating:     1272,
			},
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			gotStart, gotCurrent := tc.user.GetRatings()

			if gotStart != tc.wantStart {
				t.Errorf("GetRatings(%v) gotStart: %d; wantStart: %d", tc.user, gotStart, tc.wantStart)
			}
			if gotCurrent != tc.wantCurrent {
				t.Errorf("GetRatings(%v) gotCurrent: %d; wantCurrent: %d", tc.user, gotCurrent, tc.wantCurrent)
			}
		})
	}
}

func TestBatchStatementsError(t *testing.T) {
	table := []struct {
		name      string
		responses []*dynamodb.BatchStatementResponse
		wantErr   bool
	}{
		{name: "NilResponses", responses: nil, wantErr: false},
		{
			name:      "AllSuccessful",
			responses: []*dynamodb.BatchStatementResponse{{}, {}},
			wantErr:   false,
		},
		{
			name: "OneFailed",
			responses: []*dynamodb.BatchStatementResponse{
				{},
				{Error: &dynamodb.BatchStatementError{
					Code:    aws.String("ValidationError"),
					Message: aws.String("Item size exceeded"),
				}},
			},
			wantErr: true,
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			err := batchStatementsError(tc.responses)
			if (err != nil) != tc.wantErr {
				t.Errorf("batchStatementsError() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}

func TestListUserRatingsInput_Limit(t *testing.T) {
	input := listUserRatingsInput("1000-1100", 50)
	if input.Limit == nil || *input.Limit != 50 {
		t.Errorf("expected Limit 50, got %v", input.Limit)
	}

	input = listUserRatingsInput("1000-1100", 0)
	if input.Limit != nil {
		t.Errorf("expected no Limit for 0, got %v", input.Limit)
	}
	if aws.StringValue(input.IndexName) != "CohortIdx" {
		t.Errorf("expected CohortIdx index, got %v", input.IndexName)
	}
}

func TestCalculateScoreUser(t *testing.T) {
	table := []struct {
		name         string
		user         *User
		requirements []*Requirement
		want         float32
	}{
		{
			name: "NilUser",
		},
		{
			name: "EmptyRequirements",
			user: &User{
				DojoCohort: "1500-1600",
				Progress: map[string]*RequirementProgress{
					"test-requirement": {
						RequirementId: "test-requirement",
						Counts: map[DojoCohort]int{
							"1400-1500": 7,
							"1500-1600": 10,
						},
					},
				},
			},
		},
		{
			name: "EmptyProgress",
			user: &User{
				DojoCohort: "1500-1600",
			},
			requirements: []*Requirement{
				{
					Id: "test-requirement",
					Counts: map[DojoCohort]int{
						"1400-1500": 7,
						"1500-1600": 10,
					},
					UnitScore:       0.5,
					NumberOfCohorts: 2,
				},
			},
		},
		{
			name: "TwoRequirements",
			user: &User{
				DojoCohort: "1500-1600",
				Progress: map[string]*RequirementProgress{
					"test-requirement": {
						RequirementId: "test-requirement",
						Counts: map[DojoCohort]int{
							"ALL_COHORTS": 7,
						},
					},
					"test-requirement-2": {
						RequirementId: "test-requirement",
						Counts: map[DojoCohort]int{
							"1500-1600": 4,
						},
					},
				},
			},
			requirements: []*Requirement{
				{
					Id: "test-requirement",
					Counts: map[DojoCohort]int{
						"1400-1500": 7,
						"1500-1600": 10,
					},
					UnitScore:       0.5,
					NumberOfCohorts: 1,
				},
				{
					Id: "test-requirement-2",
					Counts: map[DojoCohort]int{
						"1400-1500": 7,
						"1500-1600": 10,
					},
					UnitScore:       1,
					NumberOfCohorts: 2,
				},
			},
			want: 7.5,
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.user.CalculateScore(tc.requirements)

			if got != tc.want {
				t.Errorf("CalculateScore(%v, %v) got: %f; want: %f", tc.user, tc.requirements, got, tc.want)
			}
		})
	}
}
