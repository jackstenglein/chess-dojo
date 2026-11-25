package main

import (
	"context"
	"fmt"
	"testing"

	"github.com/aws/aws-sdk-go/aws"
	apierrors "github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

func TestValidateCustomPlans(t *testing.T) {
	validPlan := func() *database.CustomPlan {
		return &database.CustomPlan{
			Id:    "plan-1",
			Owner: "someone-else",
			Name:  "My Plan",
			Buckets: []*database.CustomPlanBucket{
				{Id: "bucket-1", Name: "Tactics", TaskIds: []string{"task-1"}},
			},
		}
	}

	tests := []struct {
		name          string
		plans         []*database.CustomPlan
		wantErrorCode int
	}{
		{
			name:  "empty",
			plans: []*database.CustomPlan{},
		},
		{
			name:  "valid",
			plans: []*database.CustomPlan{validPlan()},
		},
		{
			name:          "nilPlan",
			plans:         []*database.CustomPlan{nil},
			wantErrorCode: 400,
		},
		{
			name: "missingId",
			plans: []*database.CustomPlan{func() *database.CustomPlan {
				p := validPlan()
				p.Id = ""
				return p
			}()},
			wantErrorCode: 400,
		},
		{
			name: "emptyName",
			plans: []*database.CustomPlan{func() *database.CustomPlan {
				p := validPlan()
				p.Name = "   "
				return p
			}()},
			wantErrorCode: 400,
		},
		{
			name: "duplicatePlanIds",
			plans: []*database.CustomPlan{
				validPlan(),
				validPlan(),
			},
			wantErrorCode: 400,
		},
		{
			name: "nilBucket",
			plans: []*database.CustomPlan{func() *database.CustomPlan {
				p := validPlan()
				p.Buckets = []*database.CustomPlanBucket{nil}
				return p
			}()},
			wantErrorCode: 400,
		},
		{
			name: "emptyBucketName",
			plans: []*database.CustomPlan{func() *database.CustomPlan {
				p := validPlan()
				p.Buckets[0].Name = ""
				return p
			}()},
			wantErrorCode: 400,
		},
		{
			name: "duplicateBucketIds",
			plans: []*database.CustomPlan{func() *database.CustomPlan {
				p := validPlan()
				p.Buckets = append(p.Buckets, &database.CustomPlanBucket{Id: "bucket-1", Name: "Other"})
				return p
			}()},
			wantErrorCode: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateCustomPlans(testUsername, tt.plans)
			if tt.wantErrorCode == 0 {
				if err != nil {
					t.Fatalf("validateCustomPlans() error = %v, want nil", err)
				}
				for _, plan := range tt.plans {
					if plan.Owner != testUsername {
						t.Errorf("validateCustomPlans() owner = %q, want %q", plan.Owner, testUsername)
					}
				}
				return
			}
			apiErr, ok := err.(*apierrors.Error)
			if !ok {
				t.Fatalf("validateCustomPlans() error = %T, want *errors.Error", err)
			}
			if apiErr.Code != tt.wantErrorCode {
				t.Errorf("validateCustomPlans() error code = %d, want %d", apiErr.Code, tt.wantErrorCode)
			}
		})
	}
}

func TestValidateActivePlanId(t *testing.T) {
	user := &database.User{
		CustomPlans: []*database.CustomPlan{{Id: "plan-1"}},
	}

	tests := []struct {
		name          string
		user          *database.User
		update        *database.UserUpdate
		wantPlanId    string
		wantErrorCode int
	}{
		{
			name:       "emptySwitchesToDojo",
			user:       user,
			update:     &database.UserUpdate{ActivePlanId: new("")},
			wantPlanId: "",
		},
		{
			name:       "existingPlan",
			user:       user,
			update:     &database.UserUpdate{ActivePlanId: new("plan-1")},
			wantPlanId: "plan-1",
		},
		{
			name:          "unknownPlan",
			user:          user,
			update:        &database.UserUpdate{ActivePlanId: new("plan-2")},
			wantErrorCode: 400,
		},
		{
			name: "planCreatedInSameUpdate",
			user: &database.User{},
			update: &database.UserUpdate{
				ActivePlanId: new("plan-1"),
				CustomPlans:  &[]*database.CustomPlan{{Id: "plan-1"}},
			},
			wantPlanId: "plan-1",
		},
		{
			name: "planDeletedInSameUpdate",
			user: user,
			update: &database.UserUpdate{
				ActivePlanId: new("plan-1"),
				CustomPlans:  &[]*database.CustomPlan{},
			},
			wantErrorCode: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateActivePlanId(tt.user, tt.update)
			if tt.wantErrorCode != 0 {
				apiErr, ok := err.(*apierrors.Error)
				if !ok {
					t.Fatalf("validateActivePlanId() error = %T, want *errors.Error", err)
				}
				if apiErr.Code != tt.wantErrorCode {
					t.Errorf("validateActivePlanId() error code = %d, want %d", apiErr.Code, tt.wantErrorCode)
				}
				return
			}
			if err != nil {
				t.Fatalf("validateActivePlanId() error = %v, want nil", err)
			}
			if tt.update.ActivePlanId == nil || *tt.update.ActivePlanId != tt.wantPlanId {
				t.Errorf("validateActivePlanId() activePlanId = %v, want %q", tt.update.ActivePlanId, tt.wantPlanId)
			}
		})
	}
}

func TestUpdateUserCustomPlanFlow(t *testing.T) {
	repo := setupSuite(t)
	ctx := context.Background()

	plan := &database.CustomPlan{
		Id:        "plan-1",
		Name:      "My Plan",
		CreatedAt: "2026-01-01T00:00:00Z",
		UpdatedAt: "2026-01-01T00:00:00Z",
		Buckets: []*database.CustomPlanBucket{
			{Id: "bucket-1", Name: "Tactics", TaskIds: []string{"task-1"}},
		},
	}

	event := getEvent("CreatePlan", testUsername, &database.UserUpdate{
		CustomPlans:  &[]*database.CustomPlan{plan},
		ActivePlanId: aws.String("plan-1"),
	})
	got, err := Handler(ctx, event)
	if err != nil {
		t.Fatalf("Handler() err = %v", err)
	}
	if got.StatusCode != 200 {
		t.Fatalf("Handler() status = %d, want 200: %v", got.StatusCode, got)
	}

	user, err := repo.GetUser(testUsername)
	if err != nil {
		t.Fatalf("GetUser() err = %v", err)
	}
	if len(user.CustomPlans) != 1 || user.CustomPlans[0].Owner != testUsername {
		t.Errorf("GetUser() customPlans = %v, want one plan owned by %q", user.CustomPlans, testUsername)
	}
	if user.ActivePlanId != "plan-1" {
		t.Errorf("GetUser() activePlanId = %q, want plan-1", user.ActivePlanId)
	}

	event = getEvent("SwitchToDojo", testUsername, &database.UserUpdate{
		ActivePlanId: aws.String(""),
	})
	got, err = Handler(ctx, event)
	if err != nil {
		t.Fatalf("Handler() err = %v", err)
	}
	if got.StatusCode != 200 {
		t.Fatalf("Handler() status = %d, want 200: %v", got.StatusCode, got)
	}

	user, err = repo.GetUser(testUsername)
	if err != nil {
		t.Fatalf("GetUser() err = %v", err)
	}
	if user.ActivePlanId != "" {
		t.Errorf("GetUser() activePlanId = %q, want empty", user.ActivePlanId)
	}
	if len(user.CustomPlans) != 1 {
		t.Errorf("GetUser() customPlans = %v, want plan preserved", user.CustomPlans)
	}
}

func TestValidatePlanPins(t *testing.T) {
	user := &database.User{
		CustomPlans: []*database.CustomPlan{{Id: "plan-1", Name: "My Plan"}},
	}
	tooMany := make([]string, maxPlanPinnedTasks+1)

	tests := []struct {
		name    string
		pins    map[string]*database.PlanPins
		plans   *[]*database.CustomPlan
		wantErr bool
	}{
		{name: "dojo and existing plan", pins: map[string]*database.PlanPins{"dojo": {PinnedTasks: []string{"a"}}, "plan-1": {}}},
		{name: "unknown plan", pins: map[string]*database.PlanPins{"plan-2": {}}, wantErr: true},
		{name: "plan created in same update", pins: map[string]*database.PlanPins{"plan-2": {}}, plans: &[]*database.CustomPlan{{Id: "plan-2"}}},
		{name: "too many pins", pins: map[string]*database.PlanPins{"dojo": {PinnedTasks: tooMany}}, wantErr: true},
		{name: "nil pins", pins: map[string]*database.PlanPins{"dojo": nil}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePlanPins(user, &database.UserUpdate{PlanPins: &tt.pins, CustomPlans: tt.plans})
			if (err != nil) != tt.wantErr {
				t.Fatalf("validatePlanPins() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateCustomPlansBucketColor(t *testing.T) {
	tests := []struct {
		color   string
		wantErr bool
	}{
		{color: ""},
		{color: "#faa137"},
		{color: " #FAA137 "},
		{color: "red", wantErr: true},
		{color: "#fff", wantErr: true},
		{color: "#faa137; background: url(x)", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.color, func(t *testing.T) {
			plans := []*database.CustomPlan{{
				Id:      "plan-1",
				Name:    "My Plan",
				Buckets: []*database.CustomPlanBucket{{Id: "b1", Name: "Tactics", Color: tt.color}},
			}}
			err := validateCustomPlans("user", plans)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateCustomPlans() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateCustomPlansBucketCategory(t *testing.T) {
	for _, tt := range []struct {
		category string
		wantErr  bool
	}{{category: ""}, {category: "Opening"}, {category: "Middlegames + Strategy"}, {category: "Openings", wantErr: true}} {
		t.Run(tt.category, func(t *testing.T) {
			plans := []*database.CustomPlan{{
				Id:      "plan-1",
				Name:    "My Plan",
				Buckets: []*database.CustomPlanBucket{{Id: "b1", Name: "Openings", Category: tt.category}},
			}}
			if err := validateCustomPlans("user", plans); (err != nil) != tt.wantErr {
				t.Fatalf("validateCustomPlans() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateFreeTierPlans(t *testing.T) {
	bucket := func(tasks int) *database.CustomPlanBucket {
		ids := make([]string, tasks)
		for i := range ids {
			ids[i] = fmt.Sprintf("task-%d", i)
		}
		return &database.CustomPlanBucket{Id: fmt.Sprintf("b-%d", tasks), Name: "Bucket", TaskIds: ids}
	}
	plan := func(buckets ...*database.CustomPlanBucket) *database.CustomPlan {
		return &database.CustomPlan{Id: "p", Name: "Plan", Buckets: buckets}
	}

	tests := []struct {
		name    string
		plans   []*database.CustomPlan
		wantErr bool
	}{
		{name: "no plans", plans: nil},
		{name: "five buckets of three", plans: []*database.CustomPlan{plan(bucket(3), bucket(3), bucket(3), bucket(3), bucket(3))}},
		{name: "two plans", plans: []*database.CustomPlan{plan(), plan()}, wantErr: true},
		{name: "six buckets", plans: []*database.CustomPlan{plan(bucket(0), bucket(0), bucket(0), bucket(0), bucket(0), bucket(0))}, wantErr: true},
		{name: "four tasks in a bucket", plans: []*database.CustomPlan{plan(bucket(4))}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := validateFreeTierPlans(tt.plans); (err != nil) != tt.wantErr {
				t.Fatalf("validateFreeTierPlans() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
