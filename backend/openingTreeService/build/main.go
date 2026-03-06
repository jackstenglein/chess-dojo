package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
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

	tree := openingtree.New()

	for _, src := range req.Sources {
		if src.Username == "" {
			return api.Failure(errors.New(400, "Invalid request: source username is required", "")), nil
		}

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
		default:
			return api.Failure(errors.New(400, "Invalid request: source type must be 'chesscom' or 'lichess'", "")), nil
		}

		for g, err := range games {
			if err != nil {
				log.Errorf("Error fetching game from %s for %s: %v", src.Type, src.Username, err)
				return api.Failure(errors.Wrap(500, "Failed to fetch games", "fetching games", err)), nil
			}
			if _, err := tree.IndexGame(&g); err != nil {
				log.Warnf("Failed to index game %s: %v", g.URL, err)
			}
		}
	}

	log.Infof("Built tree: %d games, %d positions", tree.GameCount(), tree.PositionCount())

	jsonBytes, err := json.Marshal(tree)
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
