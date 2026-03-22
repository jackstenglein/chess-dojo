package main

import (
	"errors"
	"fmt"
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

type mockRepository struct {
	user              *database.User
	requirement       *database.Requirement
	getRequirementErr error
	updateProgressErr error
	capturedProgress  []*database.RequirementProgress
}

func (m *mockRepository) GetUser(username string) (*database.User, error) {
	return m.user, nil
}

func (m *mockRepository) GetRequirement(id string) (*database.Requirement, error) {
	if m.getRequirementErr != nil {
		return nil, m.getRequirementErr
	}
	return m.requirement, nil
}

func (m *mockRepository) UpdateUserProgress(username string, progress *database.RequirementProgress) (*database.User, error) {
	m.capturedProgress = append(m.capturedProgress, progress)
	if m.updateProgressErr != nil {
		return m.user, m.updateProgressErr
	}
	return m.user, nil
}

func (m *mockRepository) PutTimelineEntry(entry *database.TimelineEntry) error {
	return nil
}

// Stubs to satisfy UserProgressUpdater interface
func (m *mockRepository) UpdateUser(username string, update *database.UserUpdate) (*database.User, error) {
	return m.user, nil
}
func (m *mockRepository) RecordSubscriptionCancelation(cohort database.DojoCohort) error {
	return nil
}
func (m *mockRepository) RecordFreeTierConversion(cohort database.DojoCohort) error {
	return nil
}
func (m *mockRepository) ListTimelineEntries(owner string, startKey string) ([]*database.TimelineEntry, string, error) {
	return nil, "", nil
}
func (m *mockRepository) PutTimelineEntries(entries []*database.TimelineEntry) (int, error) {
	return 0, nil
}
func (m *mockRepository) DeleteTimelineEntries(entries []*database.TimelineEntry) (int, error) {
	return 0, nil
}
func (m *mockRepository) AddSentMilestoneNotification(username string, milestoneKey string) error {
	return nil
}

var _ = fmt.Errorf
var _ = testing.T{}

func newTestUser() *database.User {
	return &database.User{
		Username:    "test-user",
		DisplayName: "Test User",
		Progress:    make(map[string]*database.RequirementProgress),
	}
}

func TestCascadeLinkedProgress_HappyPath(t *testing.T) {
	linkedReq := &database.Requirement{
		Id:              "linked-req-id",
		Counts:          map[database.DojoCohort]int{"1400-1500": 14},
		NumberOfCohorts: -1,
	}
	sourceReq := &database.Requirement{
		LinkedRequirementId: "linked-req-id",
	}
	user := newTestUser()
	mock := &mockRepository{user: user, requirement: linkedReq}
	repository = mock

	request := &ProgressUpdateRequest{Cohort: "1400-1500", PreviousCount: 2, NewCount: 3}
	result := cascadeLinkedProgress(request, user, sourceReq)

	if len(mock.capturedProgress) != 1 {
		t.Fatalf("expected 1 UpdateUserProgress call, got %d", len(mock.capturedProgress))
	}
	captured := mock.capturedProgress[0]
	if captured.RequirementId != "linked-req-id" {
		t.Errorf("expected requirementId linked-req-id, got %s", captured.RequirementId)
	}
	if captured.Counts["1400-1500"] != 1 {
		t.Errorf("expected count 1, got %d", captured.Counts["1400-1500"])
	}
	if result != user {
		t.Error("expected updated user to be returned")
	}
}

func TestCascadeLinkedProgress_SkipsWhenNoLinkedId(t *testing.T) {
	sourceReq := &database.Requirement{LinkedRequirementId: ""}
	user := newTestUser()
	mock := &mockRepository{user: user}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 0, NewCount: 1}
	cascadeLinkedProgress(request, user, sourceReq)
	if len(mock.capturedProgress) != 0 {
		t.Errorf("expected no UpdateUserProgress calls, got %d", len(mock.capturedProgress))
	}
}

func TestCascadeLinkedProgress_SkipsWhenDeltaZero(t *testing.T) {
	sourceReq := &database.Requirement{LinkedRequirementId: "linked-req-id"}
	user := newTestUser()
	mock := &mockRepository{user: user}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 3, NewCount: 3}
	cascadeLinkedProgress(request, user, sourceReq)
	if len(mock.capturedProgress) != 0 {
		t.Errorf("expected no calls, got %d", len(mock.capturedProgress))
	}
}

func TestCascadeLinkedProgress_SkipsWhenDeltaNegative(t *testing.T) {
	sourceReq := &database.Requirement{LinkedRequirementId: "linked-req-id"}
	user := newTestUser()
	mock := &mockRepository{user: user}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 5, NewCount: 3}
	cascadeLinkedProgress(request, user, sourceReq)
	if len(mock.capturedProgress) != 0 {
		t.Errorf("expected no calls, got %d", len(mock.capturedProgress))
	}
}

func TestCascadeLinkedProgress_SkipsForCustomTask(t *testing.T) {
	customTask := &database.CustomTask{Id: "custom-task-id"}
	user := newTestUser()
	mock := &mockRepository{user: user}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 0, NewCount: 1}
	cascadeLinkedProgress(request, user, customTask)
	if len(mock.capturedProgress) != 0 {
		t.Errorf("expected no calls, got %d", len(mock.capturedProgress))
	}
}

func TestCascadeLinkedProgress_SkipsWhenLinkedReqNotFound(t *testing.T) {
	sourceReq := &database.Requirement{LinkedRequirementId: "missing-req"}
	user := newTestUser()
	mock := &mockRepository{user: user, getRequirementErr: fmt.Errorf("not found")}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 0, NewCount: 1, Cohort: "1400-1500"}
	result := cascadeLinkedProgress(request, user, sourceReq)
	if result != user {
		t.Error("expected original user on error")
	}
	if len(mock.capturedProgress) != 0 {
		t.Errorf("expected no calls, got %d", len(mock.capturedProgress))
	}
}

func TestCascadeLinkedProgress_SkipsWhenCohortNotInLinkedReq(t *testing.T) {
	linkedReq := &database.Requirement{Id: "linked-req-id", Counts: map[database.DojoCohort]int{"1800-1900": 7}}
	sourceReq := &database.Requirement{LinkedRequirementId: "linked-req-id"}
	user := newTestUser()
	mock := &mockRepository{user: user, requirement: linkedReq}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 0, NewCount: 1, Cohort: "1400-1500"}
	cascadeLinkedProgress(request, user, sourceReq)
	if len(mock.capturedProgress) != 0 {
		t.Errorf("expected no calls, got %d", len(mock.capturedProgress))
	}
}

func TestCascadeLinkedProgress_UsesAllCohortsKey(t *testing.T) {
	linkedReq := &database.Requirement{Id: "linked-req-id", Counts: map[database.DojoCohort]int{"1400-1500": 14}, NumberOfCohorts: 1}
	sourceReq := &database.Requirement{LinkedRequirementId: "linked-req-id"}
	user := newTestUser()
	mock := &mockRepository{user: user, requirement: linkedReq}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 0, NewCount: 2, Cohort: "1400-1500"}
	cascadeLinkedProgress(request, user, sourceReq)
	if len(mock.capturedProgress) != 1 {
		t.Fatalf("expected 1 call, got %d", len(mock.capturedProgress))
	}
	if mock.capturedProgress[0].Counts[database.AllCohorts] != 2 {
		t.Errorf("expected AllCohorts count 2, got %d", mock.capturedProgress[0].Counts[database.AllCohorts])
	}
}

func TestCascadeLinkedProgress_ReturnsOriginalUserOnUpdateFailure(t *testing.T) {
	linkedReq := &database.Requirement{Id: "linked-req-id", Counts: map[database.DojoCohort]int{"1400-1500": 14}, NumberOfCohorts: -1}
	sourceReq := &database.Requirement{LinkedRequirementId: "linked-req-id"}
	user := newTestUser()
	mock := &mockRepository{user: user, requirement: linkedReq, updateProgressErr: fmt.Errorf("dynamodb error")}
	repository = mock
	request := &ProgressUpdateRequest{PreviousCount: 0, NewCount: 1, Cohort: "1400-1500"}
	result := cascadeLinkedProgress(request, user, sourceReq)
	if result != user {
		t.Error("expected original user on cascade failure")
	}
}
