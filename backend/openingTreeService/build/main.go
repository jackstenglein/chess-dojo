package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	treeapi "github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/chesscom"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/lichess"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/openingtree"
)

// maxGames is a server-side DoS guard: hard ceiling on games to index
// per request, not a client-facing preference. The size budget (~5 MB)
// will typically trigger first. Tests may lower this value to exercise
// the truncation path without needing thousands of fixture games.
var maxGames = 10000

const (

	// SizeBudget is the approximate response size limit in bytes (~5 MB),
	// well under Lambda's 6 MB payload limit.
	SizeBudget = 5_000_000

	// sizeCheckInterval controls how often (in games indexed) we measure
	// the serialized response size via json.Marshal. Up to 199 games can
	// be indexed between checks, so the actual size may exceed SizeBudget
	// before truncation triggers. The ~1 MB headroom between SizeBudget
	// (5 MB) and Lambda's 6 MB payload limit absorbs this overshoot.
	sizeCheckInterval = 200

	// LambdaGracePeriod is subtracted from the Lambda deadline so there is
	// time to serialize and return partial results before the hard kill.
	LambdaGracePeriod = 5 * time.Second

	// DefaultLambdaTimeout is used when the incoming context has no deadline
	// (e.g. in local testing outside Lambda).
	DefaultLambdaTimeout = 55 * time.Second
)

// rejectUsername matches characters that are clearly invalid in any chess
// platform username: control characters, whitespace, URL-significant
// characters. We intentionally allow dots, tildes, and other characters
// that some platforms may permit — the upstream API will reject truly
// invalid usernames with a clear error.
var rejectUsername = regexp.MustCompile(`[\x00-\x1f\x7f \t\n\r/\\?#@:]`)

var repository database.UserGetter = database.DynamoDB

// httpClient is the HTTP client used to create Chess.com and Lichess API clients.
// Tests override this to inject per-test transports instead of mutating http.DefaultTransport.
var httpClient *http.Client

type Source struct {
	Type     game.SourceType `json:"type"`
	Username string          `json:"username"`
}

// BuildRequest is the JSON payload sent by the frontend.
//
// Since and Until define the date range filter. These MUST be re-sent on
// cursor resume requests — the cursor only stores pagination position,
// not the original date bounds. Omitting them on resume will cause
// Lichess to stream all games older than the cursor position with no
// lower bound.
type BuildRequest struct {
	Sources []Source         `json:"sources"`
	Since   *string          `json:"since,omitempty"`
	Until   *string          `json:"until,omitempty"`
	Cursor  *treeapi.Cursor  `json:"cursor,omitempty"`
}

// SourceError reports a per-source fetch failure. The frontend can display
// which sources succeeded and which failed.
type SourceError struct {
	Source   game.SourceType `json:"source"`
	Username string          `json:"username"`
	Error    string          `json:"error"`
}

// BuildResponse is the JSON payload returned by the handler.
type BuildResponse struct {
	*treeapi.Response
	SourceErrors []SourceError `json:"sourceErrors,omitempty"`
}

// fetchResult carries either a game or an error from a source fetcher goroutine.
type fetchResult struct {
	game game.Game
	err  error
	src  Source
	done bool // true when this source finished iterating all games
	// For Chess.com batches: signals an archive boundary so that truncation
	// checks are deferred until a full archive has been processed.
	archiveBoundary bool
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.Infof("Event: %#v", event)

	info := api.GetUserInfo(event)
	if info.Username == "" {
		return api.Failure(errors.New(400, "Invalid request: authorization is required", "")), nil
	}

	user, err := repository.GetUser(info.Username)
	if err != nil {
		return api.Failure(err), nil
	}
	if user.SubscriptionStatus != database.SubscriptionStatus_Subscribed {
		return api.Failure(errors.New(403, "Forbidden: active subscription required", "")), nil
	}

	var req BuildRequest
	if err := json.Unmarshal([]byte(event.Body), &req); err != nil {
		return api.Failure(errors.New(400, "Invalid request: unable to parse body", "")), nil
	}

	var sinceTime, untilTime time.Time
	if req.Since != nil {
		t, err := time.Parse(time.RFC3339, *req.Since)
		if err != nil {
			return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: 'since' must be RFC3339 format (e.g. 2024-01-01T00:00:00Z), got %q", *req.Since), "")), nil
		}
		sinceTime = t
	}
	if req.Until != nil {
		t, err := time.Parse(time.RFC3339, *req.Until)
		if err != nil {
			return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: 'until' must be RFC3339 format (e.g. 2024-01-31T23:59:59Z), got %q", *req.Until), "")), nil
		}
		untilTime = t
	}

	if len(req.Sources) == 0 {
		return api.Failure(errors.New(400, "Invalid request: at least one source is required", "")), nil
	}
	const maxSources = 10
	if len(req.Sources) > maxSources {
		return api.Failure(errors.New(400, fmt.Sprintf("Invalid request: at most %d sources are allowed", maxSources), "")), nil
	}

	// Validate all sources upfront before starting goroutines.
	for _, src := range req.Sources {
		if src.Username == "" {
			return api.Failure(errors.New(400, "Invalid request: source username is required", "")), nil
		}
		if rejectUsername.MatchString(src.Username) {
			return api.Failure(errors.New(400, "Invalid request: source username contains invalid characters", "")), nil
		}
		switch src.Type {
		case game.SourceChesscom, game.SourceLichess:
		default:
			return api.Failure(errors.New(400, "Invalid request: source type must be 'chesscom' or 'lichess'", "")), nil
		}
	}


	// Create a deadline that fires before the Lambda hard timeout so we can
	// return partial results instead of being killed mid-response.
	var deadlineCtx context.Context
	var cancelDeadline context.CancelFunc
	if deadline, ok := ctx.Deadline(); ok {
		deadlineCtx, cancelDeadline = context.WithDeadline(ctx, deadline.Add(-LambdaGracePeriod))
	} else {
		deadlineCtx, cancelDeadline = context.WithTimeout(ctx, DefaultLambdaTimeout)
	}
	defer cancelDeadline()

	// Fan out: fetch games from all sources concurrently.
	// Use a cancellable context so fetchers stop when the budget is reached.
	fetchCtx, cancelFetch := context.WithCancel(deadlineCtx)
	defer cancelFetch()

	results := make(chan fetchResult, 64)
	var wg sync.WaitGroup
	completedSources := make(map[string]bool)

	for _, src := range req.Sources {
		// Skip sources that were already completed in a previous page.
		if req.Cursor != nil {
			key := sourceKey(src)
			if sc, ok := req.Cursor.Sources[key]; ok && sc.Completed {
				completedSources[key] = true
				continue
			}
		}

		wg.Add(1)
		go func(src Source) {
			defer wg.Done()

			// Start with request-supplied bounds; the cursor narrows them.
			since, until := sinceTime, untilTime

			// If a cursor is provided, override whichever bounds it
			// carries. Both Since and Until are always stored; the
			// source's pagination direction determines which one
			// actually narrows the window, but we apply both
			// unconditionally so the consumer is source-agnostic.
			if req.Cursor != nil {
				key := sourceKey(src)
				if sc, ok := req.Cursor.Sources[key]; ok {
					if !sc.Since.IsZero() {
						since = sc.Since
					}
					if !sc.Until.IsZero() {
						until = sc.Until
					}
				}
			}

			switch src.Type {
			case game.SourceChesscom:
				var client *chesscom.Client
				if httpClient != nil {
					client = chesscom.NewClientWithHTTP(httpClient)
				} else {
					client = chesscom.NewClient()
				}
				for batch, err := range client.GamesByArchive(fetchCtx, src.Username, since, until, true) {
					if err != nil {
						if fetchCtx.Err() != nil {
							return
						}
						results <- fetchResult{err: err, src: src}
						return
					}
					for _, g := range batch.Games {
						select {
						case results <- fetchResult{game: g, src: src}:
						case <-fetchCtx.Done():
							return
						}
					}
					// Signal the archive boundary so the fan-in loop
					// defers truncation checks until the full archive is processed.
					select {
					case results <- fetchResult{src: src, archiveBoundary: true}:
					case <-fetchCtx.Done():
						return
					}
				}

			case game.SourceLichess:
				client := lichess.NewClient(httpClient)
				for g, err := range client.Games(fetchCtx, lichess.FetchParams{
					Username: src.Username,
					Since:    since,
					Until:    until,
				}) {
					if err != nil {
						if fetchCtx.Err() != nil {
							return
						}
						results <- fetchResult{err: err, src: src}
						return
					}
					select {
					case results <- fetchResult{game: g, src: src}:
					case <-fetchCtx.Done():
						return
					}
				}
			}

			// Signal that this source finished iterating all games.
			select {
			case results <- fetchResult{src: src, done: true}:
			case <-fetchCtx.Done():
			}
		}(src)
	}

	// Close results channel once all fetchers complete.
	go func() {
		wg.Wait()
		close(results)
	}()

	// Fan in: index games into the tree as they arrive (single-goroutine, no mutex needed).
	tree := openingtree.New()
	sourceErrors := make(map[string]SourceError)
	truncated := false

	// Track per-source EndTime bounds for cursor construction.
	// maxTimestamp: latest EndTime seen (used as Since on resume).
	// minTimestamp: earliest EndTime seen (used as Until on resume).
	maxTimestamp := make(map[string]time.Time)
	minTimestamp := make(map[string]time.Time)
	// Track total games indexed including any from a previous cursor page.
	priorGames := 0
	if req.Cursor != nil {
		priorGames = req.Cursor.TotalGames
	}

	// drainAndBreak cancels in-flight fetches and drains the channel.
	drainAndBreak := func() {
		cancelFetch()
		for range results {
		}
	}

	// checkTruncation returns true if the tree exceeds the game limit or
	// size budget. When true it sets the truncated/gameLimitExceeded flags,
	// drains the channel, and the caller should break out of the loop.
	checkTruncation := func() bool {
		if tree.GameCount() >= maxGames {
			truncated = true
			drainAndBreak()
			return true
		}
		if measureResponseSize(tree) >= SizeBudget {
			truncated = true
			drainAndBreak()
			return true
		}
		return false
	}

	for r := range results {
		if r.done {
			completedSources[sourceKey(r.src)] = true
			continue
		}

		if r.err != nil {
			key := sourceKey(r.src)
			if _, exists := sourceErrors[key]; !exists {
				log.Errorf("Error fetching game from %s for %s: %v", r.src.Type, r.src.Username, r.err)
				sourceErrors[key] = SourceError{
					Source:   r.src.Type,
					Username: r.src.Username,
					Error:    r.err.Error(),
				}
			}
			continue
		}

		// Chess.com archive boundary: defer truncation checks until the full
		// archive batch has been indexed. Games within the archive are still
		// included — the cursor will point at the last indexed game's EndTime.
		if r.archiveBoundary {
			if checkTruncation() {
				break
			}
			continue
		}

		// For Lichess sources, check truncation on every game.
		// For Chess.com, truncation checks are deferred to archive boundaries above.
		if r.src.Type == game.SourceLichess {
			if tree.GameCount() >= maxGames {
				truncated = true
				drainAndBreak()
				break
			}
			if tree.GameCount() > 0 && tree.GameCount()%sizeCheckInterval == 0 {
				if measureResponseSize(tree) >= SizeBudget {
					truncated = true
					drainAndBreak()
					break
				}
			}
		}

		if _, err := tree.IndexGame(&r.game); err != nil {
			log.Warnf("Failed to index game %s: %v", r.game.URL, err)
		}

		// Track both min and max EndTime per source for cursor construction.
		// On resume the cursor carries both bounds so the consumer can narrow
		// the fetch window without knowing the source's pagination direction.
		//
		// Known limitation: if two Lichess games share the exact same lastMoveAt
		// millisecond and truncation fires between them, the second game will be
		// excluded on resume because Lichess's "until" parameter is exclusive.
		// This is extremely unlikely in practice (requires two games for the same
		// player ending in the same server-side millisecond).
		key := sourceKey(r.src)
		if !r.game.EndTime.IsZero() {
			if prev, ok := maxTimestamp[key]; !ok || r.game.EndTime.After(prev) {
				maxTimestamp[key] = r.game.EndTime
			}
			if prev, ok := minTimestamp[key]; !ok || r.game.EndTime.Before(prev) {
				minTimestamp[key] = r.game.EndTime
			}
		}
	}

	// If the graceful timeout fired, mark as truncated and record source
	// errors for any sources that did not finish.
	if deadlineCtx.Err() == context.DeadlineExceeded {
		truncated = true
		for _, src := range req.Sources {
			key := sourceKey(src)
			if !completedSources[key] {
				if _, exists := sourceErrors[key]; !exists {
					sourceErrors[key] = SourceError{
						Source:   src.Type,
						Username: src.Username,
						Error:    "request timed out before all games could be fetched",
					}
				}
			}
		}
	}

	log.Infof("Built tree: %d games, %d positions, %d source errors, truncated: %v",
		tree.GameCount(), tree.PositionCount(), len(sourceErrors), truncated)

	var srcErrs []SourceError
	for _, se := range sourceErrors {
		srcErrs = append(srcErrs, se)
	}
	sort.Slice(srcErrs, func(i, j int) bool {
		if srcErrs[i].Source != srcErrs[j].Source {
			return srcErrs[i].Source < srcErrs[j].Source
		}
		return srcErrs[i].Username < srcErrs[j].Username
	})

	treeResp := treeapi.FromOpeningTree(tree)

	// Build cursor when response was truncated.
	if truncated {
		treeResp.Truncated = true
		// Collect all source keys that need a cursor entry.
		allKeys := make(map[string]struct{})
		for k := range maxTimestamp {
			allKeys[k] = struct{}{}
		}
		for k := range minTimestamp {
			allKeys[k] = struct{}{}
		}
		for k := range completedSources {
			allKeys[k] = struct{}{}
		}
		cursor := &treeapi.Cursor{
			Sources:    make(map[string]treeapi.SourceCursor, len(allKeys)),
			TotalGames: priorGames + tree.GameCount(),
		}
		for key := range allKeys {
			cursor.Sources[key] = treeapi.SourceCursor{
				Since:     maxTimestamp[key],
				Until:     minTimestamp[key],
				Completed: completedSources[key],
			}
		}
		treeResp.Cursor = cursor
	}

	resp := BuildResponse{
		Response:     treeResp,
		SourceErrors: srcErrs,
	}
	return api.Success(resp), nil
}

// measureResponseSize returns the actual serialized size of the response in bytes.
// json.Marshal takes 25-95ms even at 3000 games — negligible compared to the
// seconds spent on HTTP calls to Chess.com/Lichess.
func measureResponseSize(tree *openingtree.OpeningTree) int {
	resp := treeapi.FromOpeningTree(tree)
	data, err := json.Marshal(resp)
	if err != nil {
		// Marshal failure means we can't measure size, so assume worst case
		// to trigger truncation and avoid exceeding Lambda's 6MB payload limit.
		log.Errorf("Failed to marshal response for size check: %v", err)
		return math.MaxInt
	}
	return len(data)
}

// sourceKey returns a stable key for a source, used as cursor map keys.
func sourceKey(src Source) string {
	return fmt.Sprintf("%s:%s", src.Type, strings.ToLower(src.Username))
}


