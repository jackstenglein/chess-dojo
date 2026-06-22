package main

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type listGraduationsFakeRepo struct {
	cohortGraduations []database.Graduation
	ownerGraduations  []database.Graduation
	dateGraduations   []database.Graduation
	gamesByOwner      map[string][][]*database.Game

	gameCalls map[string]int
}

func (r *listGraduationsFakeRepo) ListGraduationsByCohort(cohort database.DojoCohort, startKey string) ([]database.Graduation, string, error) {
	return r.cohortGraduations, "", nil
}

func (r *listGraduationsFakeRepo) ListGraduationsByOwner(username, startKey string) ([]database.Graduation, string, error) {
	return r.ownerGraduations, "", nil
}

func (r *listGraduationsFakeRepo) ListGraduationsByDate(date, startKey string) ([]database.Graduation, string, error) {
	return r.dateGraduations, "", nil
}

func (r *listGraduationsFakeRepo) ListGamesByCohort(cohort, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	return nil, "", fmt.Errorf("unexpected ListGamesByCohort call")
}

func (r *listGraduationsFakeRepo) ListGamesByOwner(isOwner bool, owner, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	if isOwner {
		return nil, "", fmt.Errorf("expected public game query")
	}

	expectedStart := time.Now().AddDate(0, -2, 0).Format("2006.01.02")
	expectedEnd := time.Now().Format("2006.01.02")
	if startDate != expectedStart {
		return nil, "", fmt.Errorf("startDate = %q, want %q", startDate, expectedStart)
	}
	if endDate != expectedEnd {
		return nil, "", fmt.Errorf("endDate = %q, want %q", endDate, expectedEnd)
	}

	r.gameCalls[owner]++
	pages := r.gamesByOwner[owner]
	pageIndex := r.gameCalls[owner] - 1
	if pageIndex >= len(pages) {
		return nil, "", nil
	}
	nextKey := ""
	if pageIndex < len(pages)-1 {
		nextKey = fmt.Sprintf("page-%d", pageIndex+1)
	}
	return pages[pageIndex], nextKey, nil
}

func (r *listGraduationsFakeRepo) ListGamesByPlayer(player string, color database.PlayerColor, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	return nil, "", fmt.Errorf("unexpected ListGamesByPlayer call")
}

func (r *listGraduationsFakeRepo) ListFeaturedGames(date, startKey string) ([]*database.Game, string, error) {
	return nil, "", fmt.Errorf("unexpected ListFeaturedGames call")
}

func (r *listGraduationsFakeRepo) ListGamesByEco(eco, startDate, endDate, startKey string) ([]*database.Game, string, error) {
	return nil, "", fmt.Errorf("unexpected ListGamesByEco call")
}

func (r *listGraduationsFakeRepo) ScanCohort(cohort database.DojoCohort, startKey string) ([]*database.Game, string, error) {
	return nil, "", fmt.Errorf("unexpected ScanCohort call")
}

func listGraduationsRequest(pathParameters map[string]string) api.Request {
	return api.Request{
		PathParameters:        pathParameters,
		QueryStringParameters: map[string]string{},
	}
}

func decodeListGraduationsResponse(t *testing.T, resp api.Response) ListGraduationsResponse {
	t.Helper()

	var result ListGraduationsResponse
	if err := json.Unmarshal([]byte(resp.Body), &result); err != nil {
		t.Fatalf("failed to decode response body %q: %v", resp.Body, err)
	}
	return result
}

func TestByDateHandlerUsesDynamicRecentPublicGameCount(t *testing.T) {
	originalRepo := repository
	defer func() { repository = originalRepo }()

	repository = &listGraduationsFakeRepo{
		dateGraduations: []database.Graduation{
			{
				Username:       "graduate",
				DisplayName:    "Graduate",
				PreviousCohort: "1400-1500",
				NewCohort:      "1500-1600",
				GamesAnnotated: 0,
				CreatedAt:      time.Now().AddDate(0, 0, -3).Format(time.RFC3339),
			},
		},
		gamesByOwner: map[string][][]*database.Game{
			"graduate": {
				{
					&database.Game{Id: time.Now().AddDate(0, 0, -2).Format("2006.01.02") + "_after-graduation-1"},
					&database.Game{Id: time.Now().AddDate(0, 0, -1).Format("2006.01.02") + "_after-graduation-2"},
				},
			},
		},
		gameCalls: map[string]int{},
	}

	resp, err := Handler(t.Context(), listGraduationsRequest(nil))
	if err != nil {
		t.Fatalf("Handler returned error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("Handler status = %d, want 200. Body: %s", resp.StatusCode, resp.Body)
	}

	got := decodeListGraduationsResponse(t, resp)
	if got.Graduations[0].GamesAnnotated != 2 {
		t.Fatalf("gamesAnnotated = %d, want 2", got.Graduations[0].GamesAnnotated)
	}
}

func TestByDateHandlerCountsPaginatedGamesOncePerUniqueGraduate(t *testing.T) {
	originalRepo := repository
	defer func() { repository = originalRepo }()

	fake := &listGraduationsFakeRepo{
		dateGraduations: []database.Graduation{
			{Username: "duplicate", PreviousCohort: "1300-1400", NewCohort: "1400-1500", GamesAnnotated: 0},
			{Username: "duplicate", PreviousCohort: "1400-1500", NewCohort: "1500-1600", GamesAnnotated: 0},
		},
		gamesByOwner: map[string][][]*database.Game{
			"duplicate": {
				{&database.Game{Id: "2026.04.25_first"}},
				{&database.Game{Id: "2026.04.26_second"}, &database.Game{Id: "2026.04.26_third"}},
			},
		},
		gameCalls: map[string]int{},
	}
	repository = fake

	resp, err := Handler(t.Context(), listGraduationsRequest(nil))
	if err != nil {
		t.Fatalf("Handler returned error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("Handler status = %d, want 200. Body: %s", resp.StatusCode, resp.Body)
	}

	got := decodeListGraduationsResponse(t, resp)
	if diff := cmp.Diff([]int{3, 3}, []int{got.Graduations[0].GamesAnnotated, got.Graduations[1].GamesAnnotated}); diff != "" {
		t.Fatalf("gamesAnnotated mismatch (-want +got):\n%s", diff)
	}
	if fake.gameCalls["duplicate"] != 2 {
		t.Fatalf("ListGamesByOwner calls = %d, want 2 for two paginated pages", fake.gameCalls["duplicate"])
	}
}

func TestByCohortAndByOwnerHandlersKeepStoredGamesAnnotated(t *testing.T) {
	originalRepo := repository
	defer func() { repository = originalRepo }()

	fake := &listGraduationsFakeRepo{
		cohortGraduations: []database.Graduation{{Username: "cohort-grad", GamesAnnotated: 4}},
		ownerGraduations:  []database.Graduation{{Username: "owner-grad", GamesAnnotated: 5}},
		gamesByOwner: map[string][][]*database.Game{
			"cohort-grad": {{&database.Game{Id: "2026.04.25_dynamic"}}},
			"owner-grad":  {{&database.Game{Id: "2026.04.25_dynamic"}}},
		},
		gameCalls: map[string]int{},
	}
	repository = fake

	cohortResp, err := Handler(t.Context(), listGraduationsRequest(map[string]string{"cohort": "1400-1500"}))
	if err != nil {
		t.Fatalf("cohort Handler returned error: %v", err)
	}
	ownerResp, err := Handler(t.Context(), listGraduationsRequest(map[string]string{"username": "owner-grad"}))
	if err != nil {
		t.Fatalf("owner Handler returned error: %v", err)
	}

	cohortGot := decodeListGraduationsResponse(t, cohortResp)
	ownerGot := decodeListGraduationsResponse(t, ownerResp)

	if cohortGot.Graduations[0].GamesAnnotated != 4 {
		t.Fatalf("cohort gamesAnnotated = %d, want stored value 4", cohortGot.Graduations[0].GamesAnnotated)
	}
	if ownerGot.Graduations[0].GamesAnnotated != 5 {
		t.Fatalf("owner gamesAnnotated = %d, want stored value 5", ownerGot.Graduations[0].GamesAnnotated)
	}
	if len(fake.gameCalls) != 0 {
		t.Fatalf("non-date handlers should not query games, got calls: %#v", fake.gameCalls)
	}
}
