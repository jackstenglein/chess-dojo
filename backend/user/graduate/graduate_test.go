package main

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"fmt"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

const (
	testUsername      = "test-graduate"
	testRequirementId = "38f46441-7a4e-4506-8632-166bcbe78baf"
)

var testUser = &database.User{
	Username:        testUsername,
	Email:           "test@chess-dojo-scheduler.com",
	Name:            "Test Name",
	DisplayName:     "testDisplayName",
	DiscordUsername: "testDiscord",
	RatingSystem:    database.Chesscom,
	Ratings: map[database.RatingSystem]*database.Rating{
		database.Chesscom: {
			StartRating:   2300,
			CurrentRating: 2400,
		},
	},
	DojoCohort:          "2300-2400",
	LastGraduatedAt:     "testLastGraduatedAt",
	NumberOfGraduations: 2,
	PreviousCohort:      "2200-2300",
	Progress: map[string]*database.RequirementProgress{
		testRequirementId: {
			RequirementId: testRequirementId,
			Counts: map[database.DojoCohort]int{
				"2300-2400": 25,
			},
		},
	},
}

var testUserAfterGraduation = &database.User{
	Username:        testUsername,
	DisplayName:     "testDisplayName",
	DiscordUsername: "testDiscord",
	RatingSystem:    database.Chesscom,
	Ratings: map[database.RatingSystem]*database.Rating{
		database.Chesscom: {
			StartRating:   2300,
			CurrentRating: 2400,
		},
	},
	DojoCohort:          "2400+",
	CohortVersion:       "2026",
	LastGraduatedAt:     "Unknown",
	NumberOfGraduations: 3,
	PreviousCohort:      "2300-2400",
	GraduationCohorts:   []database.DojoCohort{"2300-2400"},
	Progress: map[string]*database.RequirementProgress{
		testRequirementId: {
			RequirementId: testRequirementId,
			Counts: map[database.DojoCohort]int{
				"2300-2400": 25,
			},
		},
	},
	UpdatedAt: "Unknown",
}

type fakeGraduationRepository struct {
	users           map[string]*database.User
	requirements    []*database.Requirement
	graduation      *database.Graduation
	timelineEntry   *database.TimelineEntry
	updatedUsername string
	updatedUser     *database.User
}

func newFakeGraduationRepository(user *database.User) *fakeGraduationRepository {
	users := map[string]*database.User{}
	if user != nil {
		users[user.Username] = cloneUser(user)
	}

	return &fakeGraduationRepository{
		users: users,
		requirements: []*database.Requirement{
			{
				Id:              testRequirementId,
				Counts:          map[database.DojoCohort]int{"2300-2400": 25},
				NumberOfCohorts: -1,
				UnitScore:       1,
			},
		},
	}
}

func (r *fakeGraduationRepository) GetUser(username string) (*database.User, error) {
	user := r.users[username]
	if user == nil {
		return nil, errors.New(404, "Not found", "")
	}
	return cloneUser(user), nil
}

func (r *fakeGraduationRepository) UpdateUser(username string, update *database.UserUpdate) (*database.User, error) {
	user := r.users[username]
	if user == nil {
		return nil, errors.New(404, "Not found", "")
	}

	updated := cloneUser(user)
	if update.NumberOfGraduations != nil {
		updated.NumberOfGraduations = *update.NumberOfGraduations
	}
	if update.LastGraduatedAt != nil {
		updated.LastGraduatedAt = *update.LastGraduatedAt
	}
	if update.DojoCohort != nil {
		updated.DojoCohort = *update.DojoCohort
	}
	if update.PreviousCohort != nil {
		updated.PreviousCohort = *update.PreviousCohort
	}
	if update.GraduationCohorts != nil {
		updated.GraduationCohorts = append([]database.DojoCohort(nil), (*update.GraduationCohorts)...)
	}
	if update.CohortVersion != nil {
		updated.CohortVersion = *update.CohortVersion
	}

	r.users[username] = cloneUser(updated)
	r.updatedUsername = username
	r.updatedUser = cloneUser(updated)
	return updated, nil
}

func (r *fakeGraduationRepository) RecordSubscriptionCancelation(cohort database.DojoCohort) error {
	return nil
}

func (r *fakeGraduationRepository) RecordFreeTierConversion(cohort database.DojoCohort) error {
	return nil
}

func (r *fakeGraduationRepository) ListTimelineEntries(owner string, startKey string) ([]*database.TimelineEntry, string, error) {
	return nil, "", nil
}

func (r *fakeGraduationRepository) ListRequirements(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error) {
	return r.requirements, "", nil
}

func (r *fakeGraduationRepository) ScanRequirements(cohort database.DojoCohort, startKey string) ([]*database.Requirement, string, error) {
	return r.requirements, "", nil
}

func (r *fakeGraduationRepository) PutTimelineEntry(entry *database.TimelineEntry) error {
	r.timelineEntry = entry
	return nil
}

func (r *fakeGraduationRepository) PutTimelineEntries(entries []*database.TimelineEntry) (int, error) {
	return len(entries), nil
}

func (r *fakeGraduationRepository) DeleteTimelineEntries(entries []*database.TimelineEntry) (int, error) {
	return len(entries), nil
}

func (r *fakeGraduationRepository) ListGamesByCohort(cohort, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	return nil, "", nil
}

func (r *fakeGraduationRepository) ListGamesByOwner(isOwner bool, owner, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	return nil, "", nil
}

func (r *fakeGraduationRepository) ListGamesByPlayer(player string, color database.PlayerColor, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	return nil, "", nil
}

func (r *fakeGraduationRepository) ListFeaturedGames(date, startKey string) ([]*database.Game, string, error) {
	return nil, "", nil
}

func (r *fakeGraduationRepository) ListGamesByEco(eco, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	return nil, "", nil
}

func (r *fakeGraduationRepository) ScanCohort(cohort database.DojoCohort, startKey string) ([]*database.Game, string, error) {
	return nil, "", nil
}

func (r *fakeGraduationRepository) PutGraduation(graduation *database.Graduation) error {
	r.graduation = graduation
	return nil
}

func cloneUser(user *database.User) *database.User {
	if user == nil {
		return nil
	}

	result := *user
	if user.Progress != nil {
		result.Progress = make(map[string]*database.RequirementProgress, len(user.Progress))
		for id, progress := range user.Progress {
			progressCopy := *progress
			if progress.Counts != nil {
				progressCopy.Counts = make(map[database.DojoCohort]int, len(progress.Counts))
				for cohort, count := range progress.Counts {
					progressCopy.Counts[cohort] = count
				}
			}
			if progress.MinutesSpent != nil {
				progressCopy.MinutesSpent = make(map[database.DojoCohort]int, len(progress.MinutesSpent))
				for cohort, minutes := range progress.MinutesSpent {
					progressCopy.MinutesSpent[cohort] = minutes
				}
			}
			result.Progress[id] = &progressCopy
		}
	}
	if user.GraduationCohorts != nil {
		result.GraduationCohorts = append([]database.DojoCohort(nil), user.GraduationCohorts...)
	}
	return &result
}

func getEvent(testName string, username string, comments string) api.Request {
	return api.Request{
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			RequestID: testName,
			Authorizer: &events.APIGatewayV2HTTPRequestContextAuthorizerDescription{
				JWT: &events.APIGatewayV2HTTPRequestContextAuthorizerJWTDescription{
					Claims: map[string]string{
						"cognito:username": username,
					},
				},
			},
		},
		Body: fmt.Sprintf("{\"comments\":\"%s\"}", comments),
	}
}

func TestGraduate(t *testing.T) {
	ctx := context.Background()
	originalRepository := repository
	originalSetCohortRole := setCohortRole
	originalSendGraduationAnnouncement := sendGraduationAnnouncement
	defer func() {
		repository = originalRepository
		setCohortRole = originalSetCohortRole
		sendGraduationAnnouncement = originalSendGraduationAnnouncement
	}()

	setCohortRole = func(*database.User) error {
		return nil
	}

	var announcedGraduation *database.Graduation
	var announcedUser *database.User
	sendGraduationAnnouncement = func(graduation *database.Graduation, user *database.User) error {
		announcedGraduation = graduation
		announcedUser = user
		return stderrors.New("discord unavailable")
	}

	table := []struct {
		name             string
		username         string
		comments         string
		user             *database.User
		wantCode         int
		wantErr          bool
		wantGraduation   *database.Graduation
		wantUser         *database.User
		wantAnnouncement bool
	}{
		{
			name:     "MissingUsername",
			username: "",
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "NonexistentUser",
			username: "nonexistentUser",
			wantCode: 404,
			wantErr:  true,
		},
		{
			name:     "SuccessfulRequest",
			username: testUsername,
			comments: "These are the comments",
			user:     testUser,
			wantCode: 200,
			wantGraduation: &database.Graduation{
				Type:                "GRADUATION",
				Username:            testUsername,
				DisplayName:         testUser.DisplayName,
				PreviousCohort:      testUser.DojoCohort,
				NewCohort:           "2400+",
				Score:               25,
				RatingSystem:        database.Chesscom,
				StartRating:         2300,
				CurrentRating:       2400,
				Comments:            "These are the comments",
				Progress:            testUser.Progress,
				StartedAt:           testUser.LastGraduatedAt,
				CreatedAt:           "Unknown",
				NumberOfGraduations: 3,
				GraduationCohorts:   []database.DojoCohort{"2300-2400"},
			},
			wantUser:         testUserAfterGraduation,
			wantAnnouncement: true,
		},
		{
			name:     "InvalidCohort",
			username: testUsername,
			comments: "These are the comments",
			user: &database.User{
				Username:   testUsername,
				DojoCohort: "2400+",
			},
			wantCode: 400,
			wantErr:  true,
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			repository = newFakeGraduationRepository(tc.user)
			announcedGraduation = nil
			announcedUser = nil

			event := getEvent(tc.name, tc.username, tc.comments)
			got, err := Handler(ctx, event)

			if err != nil {
				t.Errorf("Graduate(%v) got err: %v", event, err)
			}

			if got.StatusCode != tc.wantCode {
				t.Errorf("Graduate(%v) response: %v", event, got)
				t.Fatalf("Graduate(%v) got status: %d; want status: %d", event, got.StatusCode, tc.wantCode)
			}

			if !tc.wantErr {
				gotResp := &GraduationResponse{}
				json.Unmarshal([]byte(got.Body), gotResp)

				if diff := cmp.Diff(tc.wantGraduation, gotResp.Graduation, cmpopts.IgnoreFields(database.Graduation{}, "CreatedAt")); diff != "" {
					t.Errorf("Graduate(%v) diff (-want +got):\n%s", event, diff)
				}
				if diff := cmp.Diff(tc.wantUser, gotResp.UserUpdate, cmpopts.EquateEmpty(), cmpopts.IgnoreFields(database.User{}, "LastGraduatedAt", "UpdatedAt")); diff != "" {
					t.Errorf("Graduate(%v) diff (-want +got):\n%s", event, diff)
				}
				if gotResp.Graduation.CreatedAt != gotResp.UserUpdate.LastGraduatedAt {
					t.Errorf("Graduate(%v) Graduation.CreatedAt: %s; UserUpdate.LastGraduatedAt: %s", event, gotResp.Graduation.CreatedAt, gotResp.UserUpdate.LastGraduatedAt)
				}
				if tc.wantAnnouncement {
					if announcedGraduation == nil {
						t.Fatalf("sendGraduationAnnouncement was not called")
					}
					if announcedGraduation.NewCohort != tc.wantGraduation.NewCohort {
						t.Errorf("announced graduation new cohort = %s, want %s", announcedGraduation.NewCohort, tc.wantGraduation.NewCohort)
					}
					if announcedUser == nil {
						t.Fatalf("sendGraduationAnnouncement user was nil")
					}
					if announcedUser.DojoCohort != tc.wantUser.DojoCohort {
						t.Errorf("announced user cohort = %s, want %s", announcedUser.DojoCohort, tc.wantUser.DojoCohort)
					}
				} else if announcedGraduation != nil {
					t.Errorf("sendGraduationAnnouncement was called for unsuccessful request")
				}
			}
		})
	}
}
