package database

import (
	"testing"
)

func TestCalculateScore(t *testing.T) {
	table := []struct {
		name        string
		requirement *Requirement
		cohort      DojoCohort
		progress    *RequirementProgress
		want        float32
	}{
		{
			name:   "NilRequirement",
			cohort: DojoCohort("1400-1500"),
			progress: &RequirementProgress{
				RequirementId: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
			},
		},
		{
			name: "InvalidCohort",
			requirement: &Requirement{
				Id: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
				UnitScore: 0.5,
			},
			cohort: DojoCohort("InvalidCohort"),
			progress: &RequirementProgress{
				RequirementId: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 5,
					"1500-1600": 10,
				},
			},
		},
		{
			name: "NilProgress",
			requirement: &Requirement{
				Id: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
				UnitScore: 0.5,
			},
			cohort: DojoCohort("1400-1500"),
		},
		{
			name: "ZeroCohorts",
			requirement: &Requirement{
				Id: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
				UnitScore: 0.5,
			},
			cohort: DojoCohort("1400-1500"),
			progress: &RequirementProgress{
				RequirementId: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500":   5,
					"ALL_COHORTS": 7,
				},
			},
			want: 3.5,
		},
		{
			name: "OneCohort",
			requirement: &Requirement{
				Id: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
				UnitScore:       0.5,
				NumberOfCohorts: 1,
			},
			cohort: DojoCohort("1400-1500"),
			progress: &RequirementProgress{
				RequirementId: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500":   5,
					"ALL_COHORTS": 7,
				},
			},
			want: 3.5,
		},
		{
			name: "TwoCohortsOneComplete",
			requirement: &Requirement{
				Id: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
				UnitScore:       0.5,
				NumberOfCohorts: 2,
			},
			cohort: DojoCohort("1400-1500"),
			progress: &RequirementProgress{
				RequirementId: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 4,
				},
			},
			want: 2,
		},
		{
			name: "TwoCohortsBothComplete",
			requirement: &Requirement{
				Id: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
				UnitScore:       0.5,
				NumberOfCohorts: 2,
			},
			cohort: DojoCohort("1400-1500"),
			progress: &RequirementProgress{
				RequirementId: "test-requirement",
				Counts: map[DojoCohort]int{
					"1400-1500": 7,
					"1500-1600": 10,
				},
			},
			want: 5,
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.requirement.CalculateScore(tc.cohort, tc.progress)

			if got != tc.want {
				t.Errorf("CalculateScore(%v, %s, %v) got: %f; want: %f", tc.requirement, tc.cohort, tc.progress, got, tc.want)
			}
		})
	}
}

func TestGetTotalScore(t *testing.T) {
	table := []struct {
		name         string
		cohort       DojoCohort
		requirements []*Requirement
		want         float32
	}{
		{
			name:   "EmptyRequirements",
			cohort: "1400-1500",
			want:   0,
		},
		{
			name:   "CohortNotInRequirement",
			cohort: "2400+",
			requirements: []*Requirement{
				{
					Id:        "req1",
					Counts:    map[DojoCohort]int{"1400-1500": 10},
					UnitScore: 1,
				},
			},
			want: 0,
		},
		{
			name:   "NonDojoSkipped",
			cohort: "1400-1500",
			requirements: []*Requirement{
				{
					Id:                "req1",
					Counts:            map[DojoCohort]int{"1400-1500": 10},
					UnitScore:         1,
					ScoreboardDisplay: NonDojo,
				},
			},
			want: 0,
		},
		{
			name:   "UnitScoreRequirement",
			cohort: "1400-1500",
			requirements: []*Requirement{
				{
					Id:        "req1",
					Counts:    map[DojoCohort]int{"1400-1500": 10},
					UnitScore: 0.5,
				},
			},
			want: 5,
		},
		{
			name:   "UnitScoreOverride",
			cohort: "1400-1500",
			requirements: []*Requirement{
				{
					Id:                "req1",
					Counts:            map[DojoCohort]int{"1400-1500": 10},
					UnitScore:         0.5,
					UnitScoreOverride: map[DojoCohort]float32{"1400-1500": 2},
				},
			},
			want: 20,
		},
		{
			name:   "TotalScoreRequirement",
			cohort: "1400-1500",
			requirements: []*Requirement{
				{
					Id:         "req1",
					Counts:     map[DojoCohort]int{"1400-1500": 10},
					TotalScore: 25,
				},
			},
			want: 25,
		},
		{
			name:   "StartCountSubtracted",
			cohort: "1400-1500",
			requirements: []*Requirement{
				{
					Id:         "req1",
					Counts:     map[DojoCohort]int{"1400-1500": 20},
					StartCount: 5,
					UnitScore:  1,
				},
			},
			want: 15,
		},
		{
			name:   "MultipleRequirements",
			cohort: "1400-1500",
			requirements: []*Requirement{
				{
					Id:        "req1",
					Counts:    map[DojoCohort]int{"1400-1500": 10},
					UnitScore: 1,
				},
				{
					Id:         "req2",
					Counts:     map[DojoCohort]int{"1400-1500": 5},
					TotalScore: 10,
				},
				{
					Id:                "req3",
					Counts:            map[DojoCohort]int{"1400-1500": 8},
					ScoreboardDisplay: NonDojo,
					UnitScore:         1,
				},
			},
			want: 20,
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			got := GetTotalScore(tc.cohort, tc.requirements)
			if got != tc.want {
				t.Errorf("GetTotalScore(%s, ...) got %f; want %f", tc.cohort, got, tc.want)
			}
		})
	}
}

func TestGetPercentComplete(t *testing.T) {
	table := []struct {
		name         string
		user         *User
		requirements []*Requirement
		want         float32
	}{
		{
			name: "NilUser",
			requirements: []*Requirement{
				{Id: "req1", Counts: map[DojoCohort]int{"1400-1500": 10}, UnitScore: 1},
			},
			want: 0,
		},
		{
			name: "InvalidCohort",
			user: &User{
				DojoCohort: "invalid",
			},
			requirements: []*Requirement{
				{Id: "req1", Counts: map[DojoCohort]int{"1400-1500": 10}, UnitScore: 1},
			},
			want: 0,
		},
		{
			name: "ZeroTotalScore",
			user: &User{
				DojoCohort: "1400-1500",
			},
			requirements: []*Requirement{},
			want:         0,
		},
		{
			name: "ZeroProgress",
			user: &User{
				DojoCohort: "1400-1500",
			},
			requirements: []*Requirement{
				{Id: "req1", Counts: map[DojoCohort]int{"1400-1500": 10}, UnitScore: 1},
			},
			want: 0,
		},
		{
			name: "FiftyPercent",
			user: &User{
				DojoCohort: "1400-1500",
				Progress: map[string]*RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[DojoCohort]int{AllCohorts: 5},
					},
				},
			},
			requirements: []*Requirement{
				{Id: "req1", Counts: map[DojoCohort]int{"1400-1500": 10}, UnitScore: 1},
			},
			want: 50,
		},
		{
			name: "EightyFivePercent",
			user: &User{
				DojoCohort: "1400-1500",
				Progress: map[string]*RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[DojoCohort]int{AllCohorts: 85},
					},
				},
			},
			requirements: []*Requirement{
				{Id: "req1", Counts: map[DojoCohort]int{"1400-1500": 100}, UnitScore: 1},
			},
			want: 85,
		},
		{
			name: "HundredPercent",
			user: &User{
				DojoCohort: "1400-1500",
				Progress: map[string]*RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[DojoCohort]int{AllCohorts: 10},
					},
				},
			},
			requirements: []*Requirement{
				{Id: "req1", Counts: map[DojoCohort]int{"1400-1500": 10}, UnitScore: 1},
			},
			want: 100,
		},
		{
			name: "MultipleRequirementsPartialProgress",
			user: &User{
				DojoCohort: "1400-1500",
				Progress: map[string]*RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[DojoCohort]int{AllCohorts: 10},
					},
				},
			},
			requirements: []*Requirement{
				{Id: "req1", Counts: map[DojoCohort]int{"1400-1500": 10}, UnitScore: 1},
				{Id: "req2", Counts: map[DojoCohort]int{"1400-1500": 10}, UnitScore: 1},
			},
			want: 50,
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			got := GetPercentComplete(tc.user, tc.requirements)
			if got != tc.want {
				t.Errorf("GetPercentComplete(...) got %f; want %f", got, tc.want)
			}
		})
	}
}
