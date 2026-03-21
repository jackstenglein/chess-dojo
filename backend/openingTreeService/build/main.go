package main

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"math"
	"net/http"
	"regexp"
	"slices"
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
var maxGames = 400

const (
	// sizeBudget is the approximate response size limit in bytes (~4.5 MB),
	// well under Lambda's 6 MB payload limit.
	sizeBudget = 4_500_000

	// sizeCheckInterval controls how often (in games indexed) we measure
	// the serialized response size via json.Marshal. The actual size may
	// exceed SizeBudget before truncation triggers. The ~1.5 MB headroom
	// between SizeBudget (4.5 MB) and Lambda's 6 MB payload limit absorbs
	// this overshoot.
	sizeCheckInterval = 75

	// lambdaGracePeriod is subtracted from the Lambda deadline so there is
	// time to serialize and return partial results before the hard kill.
	lambdaGracePeriod = 5 * time.Second

	// defaultLambdaTimeout is used when the incoming context has no deadline
	// (e.g. in local testing outside Lambda).
	defaultLambdaTimeout = 55 * time.Second

	// maxSources is the maximum number of sources that can be included in the
	// request.
	maxSources = 10
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

// fetchResult carries either a game or an error from a source fetcher goroutine.
type fetchResult struct {
	game game.Game
	err  error
	src  treeapi.Source
	// True when this source finished iterating all games
	done bool
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, event api.Request) (api.Response, error) {
	log.SetRequestId(event.RequestContext.RequestID)
	log.SetLevel(log.InfoLevel)
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

	req, err := treeapi.NewBuildRequest([]byte(event.Body))
	if err != nil {
		return api.Failure(errors.Wrap(400, err.Error(), "", err)), nil
	}
	if len(req.Sources) == 0 {
		return api.Failure(errors.New(400, "Invalid request: at least one source is required", "")), nil
	}
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
		deadlineCtx, cancelDeadline = context.WithDeadline(ctx, deadline.Add(-lambdaGracePeriod))
	} else {
		deadlineCtx, cancelDeadline = context.WithTimeout(ctx, defaultLambdaTimeout)
	}
	defer cancelDeadline()

	// Fan out: fetch games from all sources concurrently.
	// Use a cancellable context so fetchers stop when the budget is reached.
	fetchCtx, cancelFetch := context.WithCancel(deadlineCtx)
	defer cancelFetch()

	results := make(chan fetchResult, 64)
	var wg sync.WaitGroup

	for _, src := range req.Sources {
		if req.Cursor.Completed(src) {
			// Skip sources that were already completed in a previous page.
			continue
		}

		wg.Go(func() {
			fetchSource(fetchCtx, src, req, results)
		})
	}

	// Close results channel once all fetchers complete.
	go func() {
		wg.Wait()
		close(results)
	}()

	resp := processResults(deadlineCtx, req, results, cancelFetch)
	return api.Success(resp), nil
}

// fetchSource fetches games from the given source/request and sends them to out.
func fetchSource(ctx context.Context, src treeapi.Source, req treeapi.BuildRequest, out chan fetchResult) {
	// If a cursor is provided, use its bounds. Both Since and
	// Until are always stored; the source's pagination direction
	// determines which one actually narrows the window, but we
	// apply both unconditionally so the consumer is source-agnostic.
	//
	// If the cursor times are zero, fallback to the request times.
	since, until := req.Cursor.Since(src), req.Cursor.Until(src)
	if since.IsZero() {
		since = req.SinceTime()
	}
	if until.IsZero() {
		until = req.UntilTime()
	}

	var fetcher game.Fetcher
	switch src.Type {
	case game.SourceChesscom:
		fetcher = chesscom.NewClientWithHTTP(httpClient)
	case game.SourceLichess:
		fetcher = lichess.NewClient(httpClient)
	}

	for g, err := range fetcher.Games(ctx, src.Username, since, until) {
		if err != nil {
			if ctx.Err() == nil {
				// Fetching was not canceled, so propagate the error
				out <- fetchResult{src: src, err: err}
			}
			return
		}

		select {
		case out <- fetchResult{src: src, game: g}:
		case <-ctx.Done():
			return
		}
	}

	// Signal that this source finished iterating all games.
	select {
	case out <- fetchResult{src: src, done: true}:
	case <-ctx.Done():
	}
}

// processResults reads games for req from the results channel and returns the corresponding opening tree BuildResponse.
func processResults(ctx context.Context, req treeapi.BuildRequest, results <-chan fetchResult, cancel context.CancelFunc) treeapi.BuildResponse {
	tree := openingtree.New()
	resp := treeapi.BuildResponse{
		Cursor: &treeapi.Cursor{
			Sources: make(map[string]treeapi.SourceCursor),
		},
	}
	if req.Cursor != nil {
		maps.Copy(resp.Cursor.Sources, req.Cursor.Sources)
	}

	// Index games into the tree as they arrive (single-goroutine, no mutex needed).
	for r := range results {
		cursor, _ := resp.Cursor.GetSource(r.src)

		if r.done {
			cursor.Completed = true
			resp.Cursor.SetSource(r.src, cursor)
			continue
		}

		if r.err != nil && !slices.ContainsFunc(resp.SourceErrors, func(se treeapi.SourceError) bool {
			return se.Source == r.src.Type && strings.EqualFold(se.Username, r.src.Username)
		}) {
			log.Errorf("Error fetching game from %s for %s: %v", r.src.Type, r.src.Username, r.err)
			resp.SourceErrors = append(resp.SourceErrors, treeapi.SourceError{
				Source:   r.src.Type,
				Username: r.src.Username,
				Error:    r.err.Error(),
			})
		}

		if _, err := tree.IndexGame(&r.game); err != nil {
			log.Warnf("Failed to index game %s: %v", r.game.URL, err)
		}

		// Track both since and until per source for cursor construction.
		// On resume the cursor carries both bounds so the consumer can narrow
		// the fetch window without knowing the source's pagination direction.
		//
		// Known limitation: if two Lichess games share the exact same lastMoveAt
		// millisecond and truncation fires between them, the second game will be
		// excluded on resume because Lichess's "until" parameter is exclusive.
		// This is extremely unlikely in practice (requires two games for the same
		// player ending in the same server-side millisecond).
		if !r.game.EndTime.IsZero() {
			if r.src.Type == game.SourceChesscom && (cursor.Since.IsZero() || r.game.EndTime.After(cursor.Since)) {
				cursor.Since = r.game.EndTime
				resp.Cursor.SetSource(r.src, cursor)
			}
			if r.src.Type == game.SourceLichess && (cursor.Until.IsZero() || r.game.EndTime.Before(cursor.Until)) {
				cursor.Until = r.game.EndTime
				resp.Cursor.SetSource(r.src, cursor)
			}
		}

		// Stop early if the tree becomes too large for the Lambda response limit
		if tree.GameCount() >= maxGames || (tree.GameCount()%sizeCheckInterval == 0 && measureResponseSize(tree) >= sizeBudget) {
			resp.Truncated = true
			cancel()
			break
		}
	}

	// If the graceful timeout fired, mark as truncated.
	if ctx.Err() == context.DeadlineExceeded {
		resp.Truncated = true
	}

	log.Infof("Built tree: %d games, %d positions, %d source errors, truncated: %v",
		tree.GameCount(), tree.PositionCount(), len(resp.SourceErrors), resp.Truncated)

	treeResp := treeapi.FromOpeningTree(tree)
	resp.Games = treeResp.Games
	resp.Positions = treeResp.Positions
	resp.Cursor.TotalGames = req.Cursor.GetTotalGames() + len(resp.Games)
	return resp
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
	log.Infof("measured tree response size at %d", len(data))
	return len(data)
}
