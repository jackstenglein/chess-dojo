package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
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

var repository database.UserGetter = database.DynamoDB

type Source struct {
	Type     game.SourceType `json:"type"`
	Username string          `json:"username"`
}

type BuildRequest struct {
	Sources []Source `json:"sources"`
}

// SourceError reports a per-source fetch failure. The frontend can display
// which sources succeeded and which failed.
type SourceError struct {
	Source   game.SourceType `json:"source"`
	Username string          `json:"username"`
	Error    string          `json:"error"`
}

// BuildResponse is the JSON payload nested inside the gzipped response body.
type BuildResponse struct {
	*treeapi.Response
	SourceErrors []SourceError `json:"sourceErrors,omitempty"`
}

// fetchResult carries either a game or an error from a source fetcher goroutine.
type fetchResult struct {
	game game.Game
	err  error
	src  Source
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
	if len(req.Sources) == 0 {
		return api.Failure(errors.New(400, "Invalid request: at least one source is required", "")), nil
	}

	// Validate all sources upfront before starting goroutines.
	for _, src := range req.Sources {
		if src.Username == "" {
			return api.Failure(errors.New(400, "Invalid request: source username is required", "")), nil
		}
		switch src.Type {
		case game.SourceChessCom, game.SourceLichess:
		default:
			return api.Failure(errors.New(400, "Invalid request: source type must be 'chesscom' or 'lichess'", "")), nil
		}
	}

	// Fan out: fetch games from all sources concurrently.
	results := make(chan fetchResult, 64)
	var wg sync.WaitGroup

	for _, src := range req.Sources {
		wg.Add(1)
		go func(src Source) {
			defer wg.Done()

			var games func(func(game.Game, error) bool)
			switch src.Type {
			case game.SourceChessCom:
				client := chesscom.NewClient()
				games = client.Games(ctx, src.Username, time.Time{}, time.Time{}, true)
			case game.SourceLichess:
				client := lichess.NewClient(nil)
				games = client.Games(ctx, lichess.FetchParams{
					Username:  src.Username,
					PGNInJSON: true,
				})
			}

			for g, err := range games {
				if err != nil {
					results <- fetchResult{err: err, src: src}
					return
				}
				results <- fetchResult{game: g, src: src}
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

	for r := range results {
		if r.err != nil {
			key := fmt.Sprintf("%s:%s", r.src.Type, r.src.Username)
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
		if _, err := tree.IndexGame(&r.game); err != nil {
			log.Warnf("Failed to index game %s: %v", r.game.URL, err)
		}
	}

	log.Infof("Built tree: %d games, %d positions, %d source errors", tree.GameCount(), tree.PositionCount(), len(sourceErrors))

	var srcErrs []SourceError
	for _, se := range sourceErrors {
		srcErrs = append(srcErrs, se)
	}

	resp := BuildResponse{
		Response:     treeapi.FromOpeningTree(tree),
		SourceErrors: srcErrs,
	}
	jsonBytes, err := json.Marshal(resp)
	if err != nil {
		return api.Failure(errors.Wrap(500, "Failed to serialize opening tree", "marshaling tree", err)), nil
	}

	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	if _, err := gz.Write(jsonBytes); err != nil {
		return api.Failure(errors.Wrap(500, "Failed to compress response", "gzip write", err)), nil
	}
	if err := gz.Close(); err != nil {
		return api.Failure(errors.Wrap(500, "Failed to compress response", "gzip close", err)), nil
	}

	return api.Response{
		StatusCode:      200,
		IsBase64Encoded: true,
		Body:            base64.StdEncoding.EncodeToString(buf.Bytes()),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Content-Encoding":            "gzip",
			"Access-Control-Allow-Origin": "*",
		},
	}, nil
}
