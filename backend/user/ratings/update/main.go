package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/user/ratings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	lambdasvc "github.com/aws/aws-sdk-go/service/lambda"
)

type Event events.CloudWatchEvent

const (
	chunkSize              = 50
	flushSize              = 25
	maxContinuations       = 10
	maxNotFoundCount       = 3
	monthlyFailureMinUsers = 10
	// monthlyUpdateDay is the day of month on which monthly rating systems are
	// fetched: the day after downloadFideRatings refreshes the FIDE table.
	monthlyUpdateDay = 2
	// checkpointBuffer is the remaining-time threshold below which the
	// handler stops and re-invokes itself. Chosen together with the 700s
	// UpdateRatingsTimeoutAlarm: normal runs end around 600s elapsed plus
	// one user's processing time, staying under the alarm.
	checkpointBuffer = 300 * time.Second
)

type ratingsRepository interface {
	ListUserRatingsPage(cohort database.DojoCohort, startKey string, limit int64) ([]*database.User, string, error)
	UpdateUserRatings(users []*database.User) error
}

type lambdaInvoker interface {
	Invoke(input *lambdasvc.InvokeInput) (*lambdasvc.InvokeOutput, error)
}

var repository ratingsRepository = database.DynamoDB
var invoker lambdaInvoker = lambdasvc.New(session.Must(session.NewSession()))
var fetchBulkLichess = ratings.FetchBulkLichessRatings
var fetchChesscom ratings.RatingFetchFunc = ratings.FetchChesscomRatingWithRetry
var timeNow = time.Now
var baseFetchFuncs = ratings.RatingFetchFuncs

// monthlySystems only publish new ratings monthly (or slower) and are
// fetched on monthlyUpdateDay instead of daily.
var monthlySystems = map[database.RatingSystem]bool{
	database.Fide: true,
	database.Uscf: true,
	database.Ecf:  true,
	database.Knsb: true,
	database.Acf:  true,
}

var remainingTime = func(ctx context.Context) time.Duration {
	deadline, ok := ctx.Deadline()
	if !ok {
		return time.Duration(1<<62 - 1)
	}
	return time.Until(deadline)
}

// now is refreshed at the start of each invocation: package init runs once per
// container, and warm containers cross day boundaries.
var now = time.Now()

type isBannedFunc func(username string) bool

type RatingUpdateRequest struct {
	Cohorts           []database.DojoCohort         `json:"cohorts"`
	StartKey          string                        `json:"startKey,omitempty"`
	ContinuationCount int                           `json:"continuationCount,omitempty"`
	ForceMonthly      bool                          `json:"forceMonthly,omitempty"`
	MonthlyAttempts   map[database.RatingSystem]int `json:"monthlyAttempts,omitempty"`
	MonthlyFailures   map[database.RatingSystem]int `json:"monthlyFailures,omitempty"`
}

// monthlyStats accumulates fetch attempts/failures per monthly system so the
// handler can alarm on systemic outages that are otherwise only logged.
type monthlyStats struct {
	Attempts map[database.RatingSystem]int
	Failures map[database.RatingSystem]int
}

func newMonthlyStats(attempts, failures map[database.RatingSystem]int) *monthlyStats {
	s := &monthlyStats{
		Attempts: map[database.RatingSystem]int{},
		Failures: map[database.RatingSystem]int{},
	}
	for system, n := range attempts {
		s.Attempts[system] = n
	}
	for system, n := range failures {
		s.Failures[system] = n
	}
	return s
}

// record counts one fetch attempt. 404s do not count as failures: they
// indicate a stale or invalid ID for one user (e.g. an expired USCF
// membership), not a federation outage, and would otherwise accumulate as
// permanent baseline noise toward the alarm threshold.
func (s *monthlyStats) record(system database.RatingSystem, fetchErr error) {
	s.Attempts[system]++
	if fetchErr == nil {
		return
	}
	var apiErr *errors.Error
	if errors.As(fetchErr, &apiErr) && apiErr.Code == 404 {
		return
	}
	s.Failures[system]++
}

// thresholdError reports systemic monthly-system outages. It must only be
// called by the invocation that completes the request: returning an error
// after scheduling a continuation would make the async retry spawn a
// duplicate continuation chain.
func (s *monthlyStats) thresholdError() error {
	var failed []string
	for system, failures := range s.Failures {
		attempts := s.Attempts[system]
		if failures >= monthlyFailureMinUsers && failures*4 > attempts {
			failed = append(failed, fmt.Sprintf("%s (%d/%d failed)", system, failures, attempts))
		}
	}
	if len(failed) == 0 {
		return nil
	}
	sort.Strings(failed)
	return errors.New(500, "Temporary server error", fmt.Sprintf("Monthly rating systems exceeded the failure threshold: %s", strings.Join(failed, ", ")))
}

// tracksNotFound reports whether not-found suppression applies to the system.
// Restricted to Chesscom and Lichess: other systems overload 404 with
// different semantics (e.g. USCF returns 404 for "no regular rating").
func tracksNotFound(system database.RatingSystem) bool {
	return system == database.Chesscom || system == database.Lichess
}

func updateRating(rating *database.Rating, system database.RatingSystem, fetcher ratings.RatingFetchFunc) (bool, error) {
	rating.Username = strings.TrimSpace(rating.Username)
	if rating.Username == "" {
		return false, nil
	}

	if tracksNotFound(system) && rating.NotFoundCount >= maxNotFoundCount {
		return false, nil
	}

	data, err := fetcher(rating.Username)
	if err != nil {
		if tracksNotFound(system) && errors.Is(err, ratings.ErrNotFound) {
			rating.NotFoundCount++
			log.Infof("%s username %q not found (count %d)", system, rating.Username, rating.NotFoundCount)
			return true, nil
		}
		log.Errorf("Failed to get %s rating for %q: %v", system, rating.Username, err)
		return false, err
	}

	shouldUpdate := rating.NotFoundCount != 0
	rating.NotFoundCount = 0

	if data.CurrentRating != rating.CurrentRating || data.Deviation != rating.Deviation || data.NumGames != rating.NumGames || data.IsProvisional != rating.IsProvisional {
		rating.CurrentRating = data.CurrentRating
		rating.Deviation = data.Deviation
		rating.NumGames = data.NumGames
		rating.IsProvisional = data.IsProvisional
		shouldUpdate = true
	}

	if rating.StartRating == 0 {
		rating.StartRating = data.CurrentRating
		shouldUpdate = true
	}

	return shouldUpdate, nil
}

func updateUser(user *database.User, fetchFuncs map[database.RatingSystem]ratings.RatingFetchFunc, isBannedLichess isBannedFunc, includeMonthly bool, stats *monthlyStats) bool {
	shouldUpdate := false

	for system, rating := range user.Ratings {
		if system != database.Custom && system != database.Custom2 && system != database.Custom3 {
			if !monthlySystems[system] || includeMonthly {
				changed, fetchErr := updateRating(rating, system, fetchFuncs[system])
				shouldUpdate = changed || shouldUpdate
				if monthlySystems[system] && rating.Username != "" {
					stats.record(system, fetchErr)
				}
			}
		}

		if system == database.Lichess && isBannedLichess(rating.Username) {
			if user.LichessBan == "" {
				user.LichessBan = rating.Username
				shouldUpdate = true
			}
		}

		if now.Weekday() == time.Monday {
			history := user.RatingHistories[system]
			if rating.CurrentRating > 0 && (len(history) == 0 || history[len(history)-1].Rating != rating.CurrentRating) {
				if user.RatingHistories == nil {
					user.RatingHistories = make(map[database.RatingSystem][]database.RatingHistory)
				}
				user.RatingHistories[system] = append(history, database.RatingHistory{
					Date:   now.Format(time.RFC3339),
					Rating: rating.CurrentRating,
				})
				shouldUpdate = true
			}
		}
	}

	return shouldUpdate
}

// fetchLichessRatings bulk-fetches lichess ratings for all users in the chunk,
// excluding suppressed usernames. ok=false means the bulk call itself failed
// and no user may be treated as missing.
func fetchLichessRatings(users []*database.User) (map[string]ratings.LichessResponse, bool) {
	var usernames []string
	for _, user := range users {
		if lichess := user.Ratings[database.Lichess]; lichess != nil && lichess.NotFoundCount < maxNotFoundCount {
			if username := strings.TrimSpace(lichess.Username); username != "" {
				usernames = append(usernames, username)
			}
		}
	}

	result, err := fetchBulkLichess(usernames)
	if err != nil {
		log.Error(err)
		return nil, false
	}
	return result, true
}

func ratingFetchFuncs(lichessRatings map[string]ratings.LichessResponse, lichessOK bool) map[database.RatingSystem]ratings.RatingFetchFunc {
	fetchLichess := func(username string) (*database.Rating, error) {
		if !lichessOK {
			return nil, errors.New(500, "Temporary server error", "Lichess bulk fetch failed; skipping user")
		}
		rating, ok := lichessRatings[strings.ToLower(username)]
		if !ok {
			return nil, errors.Wrap(404, "Invalid request: lichess user not found in bulk response", "", ratings.ErrNotFound)
		}
		return &database.Rating{
			CurrentRating: rating.Performances.Classical.Rating,
			Deviation:     rating.Performances.Classical.Deviation,
			NumGames:      rating.Performances.Classical.NumGames,
			IsProvisional: rating.Performances.Classical.IsProvisional,
		}, nil
	}

	funcs := make(map[database.RatingSystem]ratings.RatingFetchFunc, len(baseFetchFuncs))
	for system, fetch := range baseFetchFuncs {
		funcs[system] = fetch
	}
	funcs[database.Chesscom] = fetchChesscom
	funcs[database.Lichess] = fetchLichess
	return funcs
}

func flush(queued []*database.User) error {
	if len(queued) == 0 {
		return nil
	}
	if err := repository.UpdateUserRatings(queued); err != nil {
		log.Errorf("Failed to update %d users: %v", len(queued), err)
		return err
	}
	log.Infof("Updated %d users", len(queued))
	return nil
}

// cursorForUser builds a startKey resuming the CohortIdx query after the given
// user, byte-compatible with DynamoDB's LastEvaluatedKey encoding in
// repository.query.
func cursorForUser(cohort database.DojoCohort, user *database.User) string {
	key := map[string]*dynamodb.AttributeValue{
		"dojoCohort": {S: aws.String(string(cohort))},
		"username":   {S: aws.String(user.Username)},
	}
	b, err := json.Marshal(key)
	if err != nil {
		log.Errorf("Failed to marshal cursor for user %q: %v", user.Username, err)
		return ""
	}
	return string(b)
}

// updateUsers processes users in order. It returns the cursor of the last
// persisted user ("" if none), whether all users were processed, and any
// write error. On a write error the checkpoint must not advance.
func updateUsers(cohort database.DojoCohort, users []*database.User, outOfTime func() bool, includeMonthly bool, stats *monthlyStats) (string, bool, error) {
	if len(users) == 0 {
		return "", true, nil
	}

	lichessRatings, lichessOK := fetchLichessRatings(users)
	fetchFuncs := ratingFetchFuncs(lichessRatings, lichessOK)
	isBannedLichess := func(username string) bool {
		result, ok := lichessRatings[strings.ToLower(username)]
		return ok && result.TosViolation
	}

	var queued []*database.User
	for i, user := range users {
		if outOfTime() {
			if err := flush(queued); err != nil {
				return "", false, err
			}
			if i == 0 {
				return "", false, nil
			}
			return cursorForUser(cohort, users[i-1]), false, nil
		}

		if updateUser(user, fetchFuncs, isBannedLichess, includeMonthly, stats) {
			queued = append(queued, user)
			if len(queued) == flushSize {
				if err := flush(queued); err != nil {
					return "", false, err
				}
				queued = nil
			}
		}
	}

	if err := flush(queued); err != nil {
		return "", false, err
	}
	return "", true, nil
}

// checkpoint asynchronously re-invokes this function with the given
// continuation request. It fails loudly at the continuation cap.
func checkpoint(event Event, req RatingUpdateRequest) error {
	if req.ContinuationCount > maxContinuations {
		err := errors.New(500, "Temporary server error", fmt.Sprintf("updateRatings hit the continuation cap (%d) for cohorts %v without completing", maxContinuations, req.Cohorts))
		log.Error(err)
		return err
	}

	detail, err := json.Marshal(req)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to marshal continuation request", err)
	}

	baseID := strings.Split(event.ID, "-cont")[0]
	continuation := Event{
		ID:         fmt.Sprintf("%s-cont%d", baseID, req.ContinuationCount),
		DetailType: event.DetailType,
		Source:     event.Source,
		Region:     event.Region,
		Detail:     detail,
	}
	payload, err := json.Marshal(continuation)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to marshal continuation event", err)
	}

	output, err := invoker.Invoke(&lambdasvc.InvokeInput{
		FunctionName:   aws.String(os.Getenv("AWS_LAMBDA_FUNCTION_NAME")),
		InvocationType: aws.String(lambdasvc.InvocationTypeEvent),
		Payload:        payload,
	})
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to invoke continuation", err)
	}
	if aws.Int64Value(output.StatusCode) != 202 {
		return errors.New(500, "Temporary server error", fmt.Sprintf("Continuation invoke returned status %d", aws.Int64Value(output.StatusCode)))
	}

	log.Infof("Checkpointed: cohorts=%v startKey=%s continuation=%d", req.Cohorts, req.StartKey, req.ContinuationCount)
	return nil
}

func Handler(ctx context.Context, event Event) (Event, error) {
	log.Infof("Event: %#v", event)
	log.SetRequestId(event.ID)
	now = timeNow()

	var req RatingUpdateRequest
	if err := json.Unmarshal(event.Detail, &req); err != nil {
		log.Errorf("Failed to unmarshal request: %v", err)
		return event, err
	}
	log.Infof("Request: %+v", req)

	outOfTime := func() bool { return remainingTime(ctx) < checkpointBuffer }
	includeMonthly := now.Day() == monthlyUpdateDay || req.ForceMonthly
	stats := newMonthlyStats(req.MonthlyAttempts, req.MonthlyFailures)

	// continuation builds the checkpoint request, propagating the monthly
	// state. ForceMonthly carries includeMonthly so a day-2 run that crosses
	// midnight keeps fetching monthly systems in its continuations.
	continuation := func(cohorts []database.DojoCohort, startKey string) RatingUpdateRequest {
		return RatingUpdateRequest{
			Cohorts:           cohorts,
			StartKey:          startKey,
			ContinuationCount: req.ContinuationCount + 1,
			ForceMonthly:      includeMonthly,
			MonthlyAttempts:   stats.Attempts,
			MonthlyFailures:   stats.Failures,
		}
	}

	for i, cohort := range req.Cohorts {
		startKey := ""
		if i == 0 {
			startKey = req.StartKey
		}

		for {
			users, nextKey, err := repository.ListUserRatingsPage(cohort, startKey, chunkSize)
			if err != nil {
				log.Errorf("Failed to query users: %v", err)
				return event, err
			}

			cursor, completed, err := updateUsers(cohort, users, outOfTime, includeMonthly, stats)
			if err != nil {
				return event, err
			}
			if !completed {
				if cursor == "" {
					cursor = startKey
				}
				return event, checkpoint(event, continuation(req.Cohorts[i:], cursor))
			}

			log.Infof("Processed chunk: cohort=%s users=%d continuation=%d", cohort, len(users), req.ContinuationCount)

			if nextKey == "" {
				break
			}
			startKey = nextKey

			if outOfTime() {
				return event, checkpoint(event, continuation(req.Cohorts[i:], nextKey))
			}
		}
		log.Infof("Cohort complete: cohort=%s continuation=%d", cohort, req.ContinuationCount)
	}

	return event, stats.thresholdError()
}

func main() {
	lambda.Start(Handler)
}
