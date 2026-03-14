package main

import (
	"errors"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

func TestCheckMilestoneNotification(t *testing.T) {
	table := []struct {
		name             string
		user             *database.User
		requirements     []*database.Requirement
		wantNotifyCalled bool
		wantPersistKey   string
	}{
		{
			name: "NilUser",
		},
		{
			name: "InvalidCohort",
			user: &database.User{
				DojoCohort: "invalid",
			},
		},
		{
			name: "AlreadyNotified",
			user: &database.User{
				Username:                   "test-user",
				DojoCohort:                 "1400-1500",
				SentMilestoneNotifications: []string{"85_1400-1500"},
			},
		},
		{
			name: "BelowThreshold",
			user: &database.User{
				Username:   "test-user",
				DojoCohort: "1400-1500",
				Progress: map[string]*database.RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[database.DojoCohort]int{database.AllCohorts: 40},
					},
				},
			},
			requirements: []*database.Requirement{
				{
					Id:        "req1",
					Counts:    map[database.DojoCohort]int{"1400-1500": 100},
					UnitScore: 1,
				},
			},
		},
		{
			name: "ExactlyAtThreshold",
			user: &database.User{
				Username:    "test-user",
				DisplayName: "Test Player",
				DojoCohort:  "1400-1500",
				Progress: map[string]*database.RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[database.DojoCohort]int{database.AllCohorts: 85},
					},
				},
			},
			requirements: []*database.Requirement{
				{
					Id:        "req1",
					Counts:    map[database.DojoCohort]int{"1400-1500": 100},
					UnitScore: 1,
				},
			},
			wantNotifyCalled: true,
			wantPersistKey:   "85_1400-1500",
		},
		{
			name: "AboveThreshold",
			user: &database.User{
				Username:    "test-user",
				DisplayName: "Test Player",
				DojoCohort:  "1400-1500",
				Progress: map[string]*database.RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[database.DojoCohort]int{database.AllCohorts: 95},
					},
				},
			},
			requirements: []*database.Requirement{
				{
					Id:        "req1",
					Counts:    map[database.DojoCohort]int{"1400-1500": 100},
					UnitScore: 1,
				},
			},
			wantNotifyCalled: true,
			wantPersistKey:   "85_1400-1500",
		},
		{
			name: "MultipleRequirementsAtThreshold",
			user: &database.User{
				Username:    "test-user",
				DisplayName: "Test Player",
				DojoCohort:  "1400-1500",
				Progress: map[string]*database.RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[database.DojoCohort]int{database.AllCohorts: 10},
					},
					"req2": {
						RequirementId: "req2",
						Counts:        map[database.DojoCohort]int{database.AllCohorts: 7},
					},
				},
			},
			requirements: []*database.Requirement{
				{
					Id:        "req1",
					Counts:    map[database.DojoCohort]int{"1400-1500": 10},
					UnitScore: 1,
				},
				{
					Id:        "req2",
					Counts:    map[database.DojoCohort]int{"1400-1500": 10},
					UnitScore: 1,
				},
			},
			wantNotifyCalled: true,
			wantPersistKey:   "85_1400-1500",
		},
		{
			name: "DifferentCohortNotificationNotBlocked",
			user: &database.User{
				Username:                   "test-user",
				DisplayName:               "Test Player",
				DojoCohort:                 "1500-1600",
				SentMilestoneNotifications: []string{"85_1400-1500"},
				Progress: map[string]*database.RequirementProgress{
					"req1": {
						RequirementId: "req1",
						Counts:        map[database.DojoCohort]int{database.AllCohorts: 90},
					},
				},
			},
			requirements: []*database.Requirement{
				{
					Id:        "req1",
					Counts:    map[database.DojoCohort]int{"1500-1600": 100},
					UnitScore: 1,
				},
			},
			wantNotifyCalled: true,
			wantPersistKey:   "85_1500-1600",
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			notifyCalled := false
			var notifyUser *database.User
			var notifyPercent int

			persistCalled := false
			var persistUsername string
			var persistKey string

			mc := milestoneChecker{
				notifySenseis: func(user *database.User, percent int) error {
					notifyCalled = true
					notifyUser = user
					notifyPercent = percent
					return nil
				},
				recordMilestone: func(username string, milestoneKey string) error {
					persistCalled = true
					persistUsername = username
					persistKey = milestoneKey
					return nil
				},
				listRequirements: func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
					return tc.requirements, "", nil
				},
			}

			mc.checkNotification(tc.user)

			if notifyCalled != tc.wantNotifyCalled {
				t.Errorf("notifyCalled = %v; want %v", notifyCalled, tc.wantNotifyCalled)
			}
			if tc.wantNotifyCalled {
				if notifyUser != tc.user {
					t.Errorf("notifyUser = %v; want %v", notifyUser, tc.user)
				}
				if notifyPercent != milestoneThreshold {
					t.Errorf("notifyPercent = %d; want %d", notifyPercent, milestoneThreshold)
				}
			}

			if persistCalled != tc.wantNotifyCalled {
				t.Errorf("persistCalled = %v; want %v", persistCalled, tc.wantNotifyCalled)
			}
			if tc.wantPersistKey != "" {
				if persistUsername != tc.user.Username {
					t.Errorf("persistUsername = %s; want %s", persistUsername, tc.user.Username)
				}
				if persistKey != tc.wantPersistKey {
					t.Errorf("persistKey = %s; want %s", persistKey, tc.wantPersistKey)
				}
			}
		})
	}
}

func TestCheckNotification_NotifySenseisError_RecordMilestoneNotCalled(t *testing.T) {
	recordMilestoneCalled := false

	mc := milestoneChecker{
		listRequirements: func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
			return []*database.Requirement{
				{
					Id:     "test-req",
					Status: database.Active,
					Counts: map[database.DojoCohort]int{"0-300": 1},
				},
			}, "", nil
		},
		notifySenseis: func(user *database.User, percent int) error {
			return errors.New("discord unavailable")
		},
		recordMilestone: func(username string, milestoneKey string) error {
			recordMilestoneCalled = true
			return nil
		},
	}

	user := &database.User{
		Username:   "testuser",
		DojoCohort: database.DojoCohort("0-300"),
		Progress: map[string]*database.RequirementProgress{
			"test-req": {
				RequirementId: "test-req",
				Counts:        map[database.DojoCohort]int{"0-300": 1},
			},
		},
	}

	mc.checkNotification(user)

	if recordMilestoneCalled {
		t.Error("recordMilestone should NOT be called when notifySenseis returns an error")
	}
}

func TestCheckNotification_FetchRequirementsError_BailsOutCleanly(t *testing.T) {
	notifySenseisCalled := false
	recordMilestoneCalled := false

	mc := milestoneChecker{
		listRequirements: func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
			return nil, "", errors.New("dynamodb timeout")
		},
		notifySenseis: func(user *database.User, percent int) error {
			notifySenseisCalled = true
			return nil
		},
		recordMilestone: func(username string, milestoneKey string) error {
			recordMilestoneCalled = true
			return nil
		},
	}

	user := &database.User{
		Username:   "testuser",
		DojoCohort: database.DojoCohort("0-300"),
	}

	mc.checkNotification(user)

	if notifySenseisCalled {
		t.Error("notifySenseis should NOT be called when fetchAllRequirements returns an error")
	}
	if recordMilestoneCalled {
		t.Error("recordMilestone should NOT be called when fetchAllRequirements returns an error")
	}
}

func TestCheckNotification_PartialSenseiFailure_ErrorPropagation(t *testing.T) {
	recordMilestoneCalled := false

	mc := milestoneChecker{
		listRequirements: func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
			return []*database.Requirement{
				{
					Id:     "test-req",
					Status: database.Active,
					Counts: map[database.DojoCohort]int{"0-300": 1},
				},
			}, "", nil
		},
		notifySenseis: func(user *database.User, percent int) error {
			return errors.New("failed to send DM to 2 of 5 senseis")
		},
		recordMilestone: func(username string, milestoneKey string) error {
			recordMilestoneCalled = true
			return nil
		},
	}

	user := &database.User{
		Username:   "testuser",
		DojoCohort: database.DojoCohort("0-300"),
		Progress: map[string]*database.RequirementProgress{
			"test-req": {
				RequirementId: "test-req",
				Counts:        map[database.DojoCohort]int{"0-300": 1},
			},
		},
	}

	mc.checkNotification(user)

	if recordMilestoneCalled {
		t.Error("recordMilestone should NOT be called when notifySenseis returns a partial failure error")
	}
}

func TestFetchAllRequirements_ErrorOnFirstPage(t *testing.T) {
	mc := milestoneChecker{
		listRequirements: func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
			return nil, "", errors.New("dynamodb error")
		},
	}

	reqs, err := mc.fetchAllRequirements("0-300")
	if err == nil {
		t.Error("fetchAllRequirements should return an error when listRequirements fails")
	}
	if reqs != nil {
		t.Errorf("fetchAllRequirements should return nil requirements on error, got %v", reqs)
	}
}

func TestFetchAllRequirements_ErrorOnSecondPage(t *testing.T) {
	callCount := 0
	mc := milestoneChecker{
		listRequirements: func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
			callCount++
			if callCount == 1 {
				return []*database.Requirement{{Id: "req-1"}}, "next-page", nil
			}
			return nil, "", errors.New("dynamodb error on page 2")
		},
	}

	reqs, err := mc.fetchAllRequirements("0-300")
	if err == nil {
		t.Error("fetchAllRequirements should return an error when second page fails")
	}
	if reqs != nil {
		t.Errorf("fetchAllRequirements should return nil requirements on error, got %v", reqs)
	}
}

func TestCheckNotification_RecordMilestoneError_DoesNotPanic(t *testing.T) {
	mc := milestoneChecker{
		listRequirements: func(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
			return []*database.Requirement{
				{
					Id:     "test-req",
					Status: database.Active,
					Counts: map[database.DojoCohort]int{"0-300": 1},
				},
			}, "", nil
		},
		notifySenseis: func(user *database.User, percent int) error {
			return nil
		},
		recordMilestone: func(username string, milestoneKey string) error {
			return errors.New("dynamodb write failed")
		},
	}

	user := &database.User{
		Username:   "testuser",
		DojoCohort: database.DojoCohort("0-300"),
		Progress: map[string]*database.RequirementProgress{
			"test-req": {
				RequirementId: "test-req",
				Counts:        map[database.DojoCohort]int{"0-300": 1},
			},
		},
	}

	mc.checkNotification(user)
}
