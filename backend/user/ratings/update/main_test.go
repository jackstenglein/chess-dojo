package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go/aws"
	lambdasvc "github.com/aws/aws-sdk-go/service/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/ratings"
)

// fakeFetcher records calls and returns a fixed result.
type fakeFetcher struct {
	calls  int
	rating *database.Rating
	err    error
}

func (f *fakeFetcher) fetch(username string) (*database.Rating, error) {
	f.calls++
	return f.rating, f.err
}

func notFoundErr() error {
	return errors.Wrap(404, "Invalid request: not found", "", ratings.ErrNotFound)
}

func TestUpdateRating_SkipsAtNotFoundThreshold(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 1200}}
	rating := &database.Rating{Username: "gone", NotFoundCount: 3}

	changed, _ := updateRating(rating, database.Chesscom, fetcher.fetch)
	if changed {
		t.Error("expected no update for suppressed rating")
	}
	if fetcher.calls != 0 {
		t.Errorf("expected fetcher not to be called, got %d calls", fetcher.calls)
	}
}

func TestUpdateRating_IncrementsOnNotFound(t *testing.T) {
	fetcher := &fakeFetcher{err: notFoundErr()}
	rating := &database.Rating{Username: "gone", NotFoundCount: 1, CurrentRating: 900}

	changed, _ := updateRating(rating, database.Chesscom, fetcher.fetch)
	if !changed {
		t.Error("expected update=true so the increment persists")
	}
	if rating.NotFoundCount != 2 {
		t.Errorf("expected NotFoundCount 2, got %d", rating.NotFoundCount)
	}
	if rating.CurrentRating != 900 {
		t.Errorf("rating must not change on not-found, got %d", rating.CurrentRating)
	}
}

func TestUpdateRating_ResetsCounterOnSuccess(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 900}}
	rating := &database.Rating{Username: "back", NotFoundCount: 2, CurrentRating: 900, StartRating: 800}

	changed, _ := updateRating(rating, database.Chesscom, fetcher.fetch)
	if !changed {
		t.Error("expected update=true so the reset persists even with unchanged rating")
	}
	if rating.NotFoundCount != 0 {
		t.Errorf("expected NotFoundCount reset to 0, got %d", rating.NotFoundCount)
	}
}

func TestUpdateRating_OtherErrorLeavesCounter(t *testing.T) {
	fetcher := &fakeFetcher{err: errors.New(500, "Temporary server error", "")}
	rating := &database.Rating{Username: "flaky", NotFoundCount: 1}

	changed, _ := updateRating(rating, database.Chesscom, fetcher.fetch)
	if changed {
		t.Error("expected no update on transient error")
	}
	if rating.NotFoundCount != 1 {
		t.Errorf("expected NotFoundCount unchanged at 1, got %d", rating.NotFoundCount)
	}
}

func TestUpdateRating_UntrackedSystemIgnoresNotFound(t *testing.T) {
	fetcher := &fakeFetcher{err: notFoundErr()}
	rating := &database.Rating{Username: "12345", NotFoundCount: 0}

	changed, _ := updateRating(rating, database.Uscf, fetcher.fetch)
	if changed {
		t.Error("expected no update for untracked system")
	}
	if rating.NotFoundCount != 0 {
		t.Errorf("expected NotFoundCount unchanged at 0 for USCF, got %d", rating.NotFoundCount)
	}
}

func TestUpdateRating_UntrackedSystemNeverSkips(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 2000}}
	rating := &database.Rating{Username: "12345", NotFoundCount: 5}

	_, _ = updateRating(rating, database.Fide, fetcher.fetch)
	if fetcher.calls != 1 {
		t.Errorf("expected FIDE fetch despite NotFoundCount, got %d calls", fetcher.calls)
	}
}

func TestUpdateRating_ChangeDetectionStillWorks(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 1100, NumGames: 20}}
	rating := &database.Rating{Username: "player", CurrentRating: 1000, StartRating: 950, NumGames: 15}

	changed, _ := updateRating(rating, database.Chesscom, fetcher.fetch)
	if !changed {
		t.Error("expected update for changed rating")
	}
	if rating.CurrentRating != 1100 || rating.NumGames != 20 {
		t.Errorf("expected rating fields updated, got %+v", rating)
	}
}

func TestUpdateUser_EmptyHistorySliceDoesNotPanic(t *testing.T) {
	origNow := now
	t.Cleanup(func() { now = origNow })
	now = time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC) // a Monday

	user := &database.User{
		Username: "a",
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Chesscom: {Username: "a", CurrentRating: 1000, StartRating: 900},
		},
		RatingHistories: map[database.RatingSystem][]database.RatingHistory{
			database.Chesscom: {},
		},
	}
	fetchFuncs := map[database.RatingSystem]ratings.RatingFetchFunc{
		database.Chesscom: func(username string) (*database.Rating, error) {
			return &database.Rating{CurrentRating: 1000}, nil
		},
	}

	if !updateUser(user, fetchFuncs, func(string) bool { return false }, true, newMonthlyStats(nil, nil)) {
		t.Error("expected update from history append")
	}
	history := user.RatingHistories[database.Chesscom]
	if len(history) != 1 || history[0].Rating != 1000 {
		t.Errorf("expected one history entry with rating 1000, got %v", history)
	}
}

func fideUser(name string) *database.User {
	return &database.User{
		Username: name,
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Fide: {Username: name, CurrentRating: 1500, StartRating: 1400},
		},
	}
}

func TestUpdateUser_SkipsMonthlySystemsWhenNotIncluded(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 1600}}
	user := fideUser("a")
	fetchFuncs := map[database.RatingSystem]ratings.RatingFetchFunc{database.Fide: fetcher.fetch}

	if updateUser(user, fetchFuncs, func(string) bool { return false }, false, newMonthlyStats(nil, nil)) {
		t.Error("expected no update when monthly systems are skipped")
	}
	if fetcher.calls != 0 {
		t.Errorf("expected no FIDE fetch, got %d calls", fetcher.calls)
	}
	if user.Ratings[database.Fide].CurrentRating != 1500 {
		t.Error("stored rating must be untouched")
	}
}

func TestUpdateUser_FetchesMonthlySystemsWhenIncluded(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 1600}}
	user := fideUser("a")
	fetchFuncs := map[database.RatingSystem]ratings.RatingFetchFunc{database.Fide: fetcher.fetch}
	stats := newMonthlyStats(nil, nil)

	if !updateUser(user, fetchFuncs, func(string) bool { return false }, true, stats) {
		t.Error("expected update from changed FIDE rating")
	}
	if fetcher.calls != 1 {
		t.Errorf("expected 1 FIDE fetch, got %d", fetcher.calls)
	}
	if stats.Attempts[database.Fide] != 1 || stats.Failures[database.Fide] != 0 {
		t.Errorf("expected attempts=1 failures=0, got %+v", stats)
	}
}

func TestUpdateUser_DailySystemsUnaffectedByGate(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 1600}}
	user := chesscomUser("a", 0)
	fetchFuncs := map[database.RatingSystem]ratings.RatingFetchFunc{database.Chesscom: fetcher.fetch}

	if !updateUser(user, fetchFuncs, func(string) bool { return false }, false, newMonthlyStats(nil, nil)) {
		t.Error("expected chess.com update even when monthly systems are skipped")
	}
	if fetcher.calls != 1 {
		t.Errorf("expected 1 chess.com fetch, got %d", fetcher.calls)
	}
}

func TestUpdateUser_MonthlyFailureIsCounted(t *testing.T) {
	fetcher := &fakeFetcher{err: errors.New(500, "Temporary server error", "USCF down")}
	user := &database.User{
		Username: "a",
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Uscf: {Username: "12345", CurrentRating: 1500},
		},
	}
	fetchFuncs := map[database.RatingSystem]ratings.RatingFetchFunc{database.Uscf: fetcher.fetch}
	stats := newMonthlyStats(nil, nil)

	updateUser(user, fetchFuncs, func(string) bool { return false }, true, stats)
	if stats.Attempts[database.Uscf] != 1 || stats.Failures[database.Uscf] != 1 {
		t.Errorf("expected attempts=1 failures=1, got %+v", stats)
	}
}

func TestUpdateUser_MonthlyNotFoundNotCountedAsFailure(t *testing.T) {
	fetcher := &fakeFetcher{err: errors.New(404, "Invalid request: USCF member does not have a regular rating", "")}
	user := &database.User{
		Username: "a",
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Uscf: {Username: "12345", CurrentRating: 1500},
		},
	}
	fetchFuncs := map[database.RatingSystem]ratings.RatingFetchFunc{database.Uscf: fetcher.fetch}
	stats := newMonthlyStats(nil, nil)

	updateUser(user, fetchFuncs, func(string) bool { return false }, true, stats)
	if stats.Attempts[database.Uscf] != 1 || stats.Failures[database.Uscf] != 0 {
		t.Errorf("404 must count as attempt but not failure, got %+v", stats)
	}
}

func TestUpdateUser_EmptyUsernameNotCounted(t *testing.T) {
	fetcher := &fakeFetcher{rating: &database.Rating{CurrentRating: 1600}}
	user := &database.User{
		Username: "a",
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Fide: {Username: "   "},
		},
	}
	fetchFuncs := map[database.RatingSystem]ratings.RatingFetchFunc{database.Fide: fetcher.fetch}
	stats := newMonthlyStats(nil, nil)

	updateUser(user, fetchFuncs, func(string) bool { return false }, true, stats)
	if stats.Attempts[database.Fide] != 0 {
		t.Errorf("empty username must not count as attempt, got %+v", stats)
	}
}

func TestUpdateUser_MondayHistoryAppendsForSkippedMonthlySystem(t *testing.T) {
	origNow := now
	t.Cleanup(func() { now = origNow })
	now = time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC) // a Monday

	user := fideUser("a")
	if !updateUser(user, map[database.RatingSystem]ratings.RatingFetchFunc{}, func(string) bool { return false }, false, newMonthlyStats(nil, nil)) {
		t.Error("expected update from history append")
	}
	history := user.RatingHistories[database.Fide]
	if len(history) != 1 || history[0].Rating != 1500 {
		t.Errorf("expected history entry with stored rating 1500, got %v", history)
	}
}

type fakeRepo struct {
	pages     map[string]page
	limits    []int64
	updates   [][]*database.User
	updateErr error
}

type page struct {
	users   []*database.User
	nextKey string
}

func (f *fakeRepo) ListUserRatingsPage(cohort database.DojoCohort, startKey string, limit int64) ([]*database.User, string, error) {
	f.limits = append(f.limits, limit)
	p := f.pages[startKey]
	return p.users, p.nextKey, nil
}

func (f *fakeRepo) UpdateUserRatings(users []*database.User) error {
	if f.updateErr != nil {
		return f.updateErr
	}
	copied := make([]*database.User, len(users))
	copy(copied, users)
	f.updates = append(f.updates, copied)
	return nil
}

type fakeInvoker struct {
	inputs []*lambdasvc.InvokeInput
	err    error
}

func (f *fakeInvoker) Invoke(input *lambdasvc.InvokeInput) (*lambdasvc.InvokeOutput, error) {
	if f.err != nil {
		return nil, f.err
	}
	f.inputs = append(f.inputs, input)
	return &lambdasvc.InvokeOutput{StatusCode: aws.Int64(202)}, nil
}

// setupHandler installs fakes for every external dependency.
// remaining is consumed one value per remainingTime call; the last value repeats.
func setupHandler(t *testing.T, repo *fakeRepo, inv *fakeInvoker, remaining ...time.Duration) {
	t.Helper()

	origRepo, origInvoker, origRemaining, origBulk, origChesscom := repository, invoker, remainingTime, fetchBulkLichess, fetchChesscom
	origTimeNow, origBase := timeNow, baseFetchFuncs
	t.Cleanup(func() {
		repository, invoker, remainingTime, fetchBulkLichess, fetchChesscom = origRepo, origInvoker, origRemaining, origBulk, origChesscom
		timeNow, baseFetchFuncs = origTimeNow, origBase
	})

	repository = repo
	invoker = inv
	fetchBulkLichess = func(usernames []string) (map[string]ratings.LichessResponse, error) {
		return map[string]ratings.LichessResponse{}, nil
	}
	fetchChesscom = func(username string) (*database.Rating, error) {
		return &database.Rating{CurrentRating: 1500, Deviation: 50, NumGames: 1}, nil
	}
	timeNow = func() time.Time { return time.Date(2026, 1, 6, 0, 0, 0, 0, time.UTC) } // Tuesday the 6th: not Monday, not day 2
	baseFetchFuncs = map[database.RatingSystem]ratings.RatingFetchFunc{}
	calls := 0
	remainingTime = func(ctx context.Context) time.Duration {
		i := calls
		if i >= len(remaining) {
			i = len(remaining) - 1
		}
		calls++
		return remaining[i]
	}
}

func chesscomUser(name string, notFound int) *database.User {
	return &database.User{
		Username: name,
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Chesscom: {Username: name, NotFoundCount: notFound},
		},
	}
}

func scheduledEvent(t *testing.T, req RatingUpdateRequest) Event {
	t.Helper()
	detail, err := json.Marshal(req)
	if err != nil {
		t.Fatal(err)
	}
	return Event{ID: "StatsUpdate1000-1100", DetailType: "Scheduled Event", Source: "Serverless", Detail: detail}
}

func TestHandler_CompletesSmallCohortWithoutContinuation(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"": {users: []*database.User{chesscomUser("a", 0), chesscomUser("b", 0)}},
	}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(inv.inputs) != 0 {
		t.Error("final chunk must not self-invoke")
	}
	if len(repo.limits) == 0 || repo.limits[0] != 50 {
		t.Errorf("expected chunk limit 50, got %v", repo.limits)
	}
	if len(repo.updates) != 1 || len(repo.updates[0]) != 2 {
		t.Fatalf("expected one flush of 2 users, got %v", repo.updates)
	}
}

func TestHandler_ChainsPagesUntilDone(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"":     {users: []*database.User{chesscomUser("a", 0)}, nextKey: "key2"},
		"key2": {users: []*database.User{chesscomUser("b", 0)}},
	}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(repo.updates) != 2 {
		t.Errorf("expected both pages processed, got %d flushes", len(repo.updates))
	}
	if len(inv.inputs) != 0 {
		t.Error("expected no continuation")
	}
}

func TestHandler_CheckpointsBetweenChunks(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"":     {users: []*database.User{chesscomUser("a", 0)}, nextKey: "key2"},
		"key2": {users: []*database.User{chesscomUser("b", 0)}},
	}}
	inv := &fakeInvoker{}
	// Plenty of time for user "a", then out of time at the between-chunk check.
	setupHandler(t, repo, inv, time.Hour, time.Minute)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err != nil {
		t.Fatalf("expected clean checkpoint, got %v", err)
	}
	if len(inv.inputs) != 1 {
		t.Fatalf("expected one continuation invoke, got %d", len(inv.inputs))
	}

	var cont events.CloudWatchEvent
	if err := json.Unmarshal(inv.inputs[0].Payload, &cont); err != nil {
		t.Fatalf("continuation payload is not a CloudWatchEvent envelope: %v", err)
	}
	if cont.ID != "StatsUpdate1000-1100-cont1" {
		t.Errorf("expected derived event ID, got %q", cont.ID)
	}
	var req RatingUpdateRequest
	if err := json.Unmarshal(cont.Detail, &req); err != nil {
		t.Fatalf("continuation Detail invalid: %v", err)
	}
	if req.StartKey != "key2" || req.ContinuationCount != 1 || len(req.Cohorts) != 1 {
		t.Errorf("unexpected continuation request: %+v", req)
	}
	// Writes must be flushed before the continuation was sent.
	if len(repo.updates) != 1 {
		t.Errorf("expected flush before checkpoint, got %d flushes", len(repo.updates))
	}
}

func TestHandler_MidChunkCursorResumesAfterLastPersistedUser(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"": {users: []*database.User{chesscomUser("a", 0), chesscomUser("b", 0), chesscomUser("c", 0)}},
	}}
	inv := &fakeInvoker{}
	// Time ok for users a and b, out of time before user c.
	setupHandler(t, repo, inv, time.Hour, time.Hour, time.Minute)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err != nil {
		t.Fatalf("expected clean checkpoint, got %v", err)
	}
	if len(inv.inputs) != 1 {
		t.Fatalf("expected one continuation, got %d", len(inv.inputs))
	}

	var cont events.CloudWatchEvent
	_ = json.Unmarshal(inv.inputs[0].Payload, &cont)
	var req RatingUpdateRequest
	_ = json.Unmarshal(cont.Detail, &req)
	if !strings.Contains(req.StartKey, `"b"`) {
		t.Errorf("cursor must resume after user b (last persisted), got %q", req.StartKey)
	}
	if len(repo.updates) != 1 || len(repo.updates[0]) != 2 {
		t.Fatalf("expected flush of exactly users a,b before checkpoint, got %v", repo.updates)
	}
}

func TestHandler_StopBeforeFirstUserReusesChunkStartKey(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"": {users: []*database.User{chesscomUser("a", 0)}},
	}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Minute)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err != nil {
		t.Fatalf("expected clean checkpoint, got %v", err)
	}
	var cont events.CloudWatchEvent
	_ = json.Unmarshal(inv.inputs[0].Payload, &cont)
	var req RatingUpdateRequest
	_ = json.Unmarshal(cont.Detail, &req)
	if req.StartKey != "" {
		t.Errorf("expected empty startKey (chunk start), got %q", req.StartKey)
	}
	if len(repo.updates) != 0 {
		t.Error("no users processed, nothing should be flushed")
	}
}

func TestHandler_FlushFailureFailsWithoutInvoking(t *testing.T) {
	repo := &fakeRepo{
		pages:     map[string]page{"": {users: []*database.User{chesscomUser("a", 0)}}},
		updateErr: errors.New(500, "Temporary server error", "PartiQL statement failed"),
	}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err == nil {
		t.Fatal("expected error on write failure")
	}
	if len(inv.inputs) != 0 {
		t.Error("must not self-invoke after failed writes")
	}
}

func TestHandler_ContinuationCapFailsLoudly(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"": {users: []*database.User{chesscomUser("a", 0)}, nextKey: "key2"},
	}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour, time.Minute)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{
		Cohorts:           []database.DojoCohort{"1000-1100"},
		ContinuationCount: 10,
	}))
	if err == nil {
		t.Fatal("expected error at continuation cap")
	}
	if len(inv.inputs) != 0 {
		t.Error("must not invoke past the cap")
	}
}

func TestHandler_InvokeFailureReturnsError(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"": {users: []*database.User{chesscomUser("a", 0)}, nextKey: "key2"},
	}}
	inv := &fakeInvoker{err: fmt.Errorf("invoke failed")}
	setupHandler(t, repo, inv, time.Hour, time.Minute)

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err == nil {
		t.Fatal("expected error when self-invocation fails")
	}
}

func TestHandler_DuplicateDeliveryIsIdempotent(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"": {users: []*database.User{chesscomUser("a", 0)}},
	}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)

	event := scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}})
	if _, err := Handler(context.Background(), event); err != nil {
		t.Fatalf("first delivery failed: %v", err)
	}
	// Reset the fake page state so the "retry" sees the same source data.
	repo.pages[""] = page{users: []*database.User{chesscomUser("a", 0)}}
	if _, err := Handler(context.Background(), event); err != nil {
		t.Fatalf("duplicate delivery failed: %v", err)
	}
	if len(repo.updates) != 2 {
		t.Fatalf("expected two flushes, got %d", len(repo.updates))
	}
	first, second := repo.updates[0][0].Ratings[database.Chesscom], repo.updates[1][0].Ratings[database.Chesscom]
	if first.CurrentRating != second.CurrentRating || first.NotFoundCount != second.NotFoundCount {
		t.Errorf("duplicate delivery must write identical state: %+v vs %+v", first, second)
	}
	if len(inv.inputs) != 0 {
		t.Error("no continuation expected")
	}
}

// TestHandler_ContinuationChainProcessesAllUsers drives the full checkpoint
// loop: every payload the handler sends to the fake invoker is fed back into
// the handler, simulating AWS delivering the continuation events, until the
// cohort completes.
func TestHandler_ContinuationChainProcessesAllUsers(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"":     {users: []*database.User{chesscomUser("a", 0)}, nextKey: "key2"},
		"key2": {users: []*database.User{chesscomUser("b", 0)}, nextKey: "key3"},
		"key3": {users: []*database.User{chesscomUser("c", 0)}},
	}}
	inv := &fakeInvoker{}
	// Per invocation: one in-chunk check (plenty) and one between-chunk check
	// (out of time), forcing a checkpoint after every chunk. The final
	// invocation only makes the in-chunk check.
	setupHandler(t, repo, inv, time.Hour, time.Minute, time.Hour, time.Minute, time.Hour)

	event := scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}})
	delivered := 0
	for i := 0; i < maxContinuations+1; i++ {
		if _, err := Handler(context.Background(), event); err != nil {
			t.Fatalf("invocation %d failed: %v", i, err)
		}
		if len(inv.inputs) == delivered {
			break
		}
		delivered = len(inv.inputs)
		if err := json.Unmarshal(inv.inputs[delivered-1].Payload, &event); err != nil {
			t.Fatalf("continuation payload does not round-trip through the handler event type: %v", err)
		}
	}

	if delivered != 2 {
		t.Fatalf("expected 2 continuations for 3 pages, got %d", delivered)
	}
	if event.ID != "StatsUpdate1000-1100-cont2" {
		t.Errorf("expected final continuation ID cont2, got %q", event.ID)
	}
	var processed []string
	for _, batch := range repo.updates {
		for _, user := range batch {
			processed = append(processed, user.Username)
		}
	}
	if strings.Join(processed, ",") != "a,b,c" {
		t.Errorf("expected users a,b,c processed exactly once in order, got %v", processed)
	}
}

func TestUpdateUsers_LichessBulkFailureDoesNotIncrement(t *testing.T) {
	origBulk := fetchBulkLichess
	t.Cleanup(func() { fetchBulkLichess = origBulk })
	fetchBulkLichess = func(usernames []string) (map[string]ratings.LichessResponse, error) {
		return nil, errors.New(500, "Temporary server error", "bulk down")
	}
	origRepo := repository
	t.Cleanup(func() { repository = origRepo })
	repo := &fakeRepo{}
	repository = repo

	user := &database.User{
		Username: "a",
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Lichess: {Username: "a", NotFoundCount: 1},
		},
	}
	_, completed, err := updateUsers("1000-1100", []*database.User{user}, func() bool { return false }, false, newMonthlyStats(nil, nil))
	if err != nil || !completed {
		t.Fatalf("expected clean completion, got completed=%v err=%v", completed, err)
	}
	if user.Ratings[database.Lichess].NotFoundCount != 1 {
		t.Errorf("bulk failure must not change NotFoundCount, got %d", user.Ratings[database.Lichess].NotFoundCount)
	}
}

func TestUpdateUsers_LichessMissingFromSuccessfulBulkIncrements(t *testing.T) {
	origBulk := fetchBulkLichess
	t.Cleanup(func() { fetchBulkLichess = origBulk })
	var requested []string
	fetchBulkLichess = func(usernames []string) (map[string]ratings.LichessResponse, error) {
		requested = usernames
		return map[string]ratings.LichessResponse{}, nil
	}
	origRepo := repository
	t.Cleanup(func() { repository = origRepo })
	repo := &fakeRepo{}
	repository = repo

	missing := &database.User{
		Username: "missing",
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Lichess: {Username: "missing", NotFoundCount: 0},
		},
	}
	suppressed := &database.User{
		Username: "suppressed",
		Ratings: map[database.RatingSystem]*database.Rating{
			database.Lichess: {Username: "suppressed", NotFoundCount: 3},
		},
	}
	_, completed, err := updateUsers("1000-1100", []*database.User{missing, suppressed}, func() bool { return false }, false, newMonthlyStats(nil, nil))
	if err != nil || !completed {
		t.Fatalf("expected clean completion, got completed=%v err=%v", completed, err)
	}
	if missing.Ratings[database.Lichess].NotFoundCount != 1 {
		t.Errorf("expected increment to 1, got %d", missing.Ratings[database.Lichess].NotFoundCount)
	}
	if len(requested) != 1 || requested[0] != "missing" {
		t.Errorf("suppressed user must be excluded from bulk list, got %v", requested)
	}
}

func TestMonthlyStats_ThresholdError(t *testing.T) {
	cases := []struct {
		name      string
		attempts  int
		failures  int
		wantError bool
	}{
		{"no failures", 100, 0, false},
		{"below min users", 20, 9, false},
		{"min users but low rate", 100, 20, false},
		{"exactly 25 percent is not over", 40, 10, false},
		{"over threshold", 30, 10, true},
		{"total outage", 12, 12, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			stats := newMonthlyStats(
				map[database.RatingSystem]int{database.Uscf: tc.attempts},
				map[database.RatingSystem]int{database.Uscf: tc.failures},
			)
			err := stats.thresholdError()
			if (err != nil) != tc.wantError {
				t.Errorf("attempts=%d failures=%d: got err=%v, wantError=%v", tc.attempts, tc.failures, err, tc.wantError)
			}
		})
	}
}

func failingFideFuncs() map[database.RatingSystem]ratings.RatingFetchFunc {
	return map[database.RatingSystem]ratings.RatingFetchFunc{
		database.Fide: func(username string) (*database.Rating, error) {
			return nil, errors.New(500, "Temporary server error", "FIDE table empty")
		},
	}
}

func fideUsers(n int) []*database.User {
	users := make([]*database.User, 0, n)
	for i := 0; i < n; i++ {
		users = append(users, fideUser(fmt.Sprintf("user%02d", i)))
	}
	return users
}

func TestHandler_ForceMonthlyFetchesAndReturnsThresholdError(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{"": {users: fideUsers(12)}}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)
	baseFetchFuncs = failingFideFuncs()

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{
		Cohorts:      []database.DojoCohort{"1000-1100"},
		ForceMonthly: true,
	}))
	if err == nil {
		t.Fatal("expected threshold error: 12/12 FIDE fetches failed")
	}
	if len(inv.inputs) != 0 {
		t.Error("threshold error must not spawn a continuation")
	}
}

func TestHandler_NoThresholdErrorWithoutMonthly(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{"": {users: fideUsers(12)}}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)
	fideCalls := 0
	baseFetchFuncs = map[database.RatingSystem]ratings.RatingFetchFunc{
		database.Fide: func(username string) (*database.Rating, error) {
			fideCalls++
			return nil, errors.New(500, "Temporary server error", "should not be called")
		},
	}

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}}))
	if err != nil {
		t.Fatalf("expected success on a non-monthly day, got %v", err)
	}
	if fideCalls != 0 {
		t.Errorf("expected no FIDE fetches on a non-monthly day, got %d", fideCalls)
	}
}

func TestHandler_Day2EnablesMonthly(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{"": {users: fideUsers(1)}}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)
	timeNow = func() time.Time { return time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC) } // Tuesday the 2nd
	fideCalls := 0
	baseFetchFuncs = map[database.RatingSystem]ratings.RatingFetchFunc{
		database.Fide: func(username string) (*database.Rating, error) {
			fideCalls++
			return &database.Rating{CurrentRating: 1500}, nil
		},
	}

	if _, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{Cohorts: []database.DojoCohort{"1000-1100"}})); err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if fideCalls != 1 {
		t.Errorf("expected 1 FIDE fetch on day 2, got %d", fideCalls)
	}
}

func TestHandler_ContinuationCarriesMonthlyStateWithoutError(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{
		"":     {users: fideUsers(12), nextKey: "key2"},
		"key2": {users: []*database.User{fideUser("last")}},
	}}
	inv := &fakeInvoker{}
	// Plenty of time for all 12 users of chunk 1, out of time between chunks.
	remaining := make([]time.Duration, 0, 14)
	for i := 0; i < 12; i++ {
		remaining = append(remaining, time.Hour)
	}
	remaining = append(remaining, time.Minute)
	setupHandler(t, repo, inv, remaining...)
	baseFetchFuncs = failingFideFuncs()

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{
		Cohorts:      []database.DojoCohort{"1000-1100"},
		ForceMonthly: true,
	}))
	if err != nil {
		t.Fatalf("continuation invocations must not return threshold errors, got %v", err)
	}
	if len(inv.inputs) != 1 {
		t.Fatalf("expected one continuation, got %d", len(inv.inputs))
	}
	var cont events.CloudWatchEvent
	if err := json.Unmarshal(inv.inputs[0].Payload, &cont); err != nil {
		t.Fatal(err)
	}
	var req RatingUpdateRequest
	if err := json.Unmarshal(cont.Detail, &req); err != nil {
		t.Fatal(err)
	}
	if !req.ForceMonthly {
		t.Error("continuation must carry ForceMonthly")
	}
	if req.MonthlyAttempts[database.Fide] != 12 || req.MonthlyFailures[database.Fide] != 12 {
		t.Errorf("continuation must carry cumulative counts, got %+v", req)
	}
}

func TestHandler_CumulativeCountsFromRequestFeedThreshold(t *testing.T) {
	repo := &fakeRepo{pages: map[string]page{"": {users: []*database.User{fideUser("last")}}}}
	inv := &fakeInvoker{}
	setupHandler(t, repo, inv, time.Hour)
	baseFetchFuncs = failingFideFuncs()

	_, err := Handler(context.Background(), scheduledEvent(t, RatingUpdateRequest{
		Cohorts:           []database.DojoCohort{"1000-1100"},
		ForceMonthly:      true,
		ContinuationCount: 1,
		MonthlyAttempts:   map[database.RatingSystem]int{database.Fide: 11},
		MonthlyFailures:   map[database.RatingSystem]int{database.Fide: 11},
	}))
	if err == nil {
		t.Fatal("expected threshold error from cumulative 12/12 failures")
	}
}
