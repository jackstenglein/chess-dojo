// Package chesscom provides a client for fetching games from the Chess.com
// public API. It handles archive listing, date filtering, game fetching,
// and extraction of game metadata (PGN, ratings, result, time class, etc.).
package chesscom

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"iter"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"golang.org/x/sync/errgroup"
)

const maxConcurrentFetches = 5

const (
	baseURL          = "https://api.chess.com/pub/player"
	defaultTimeout   = 10 * time.Second
	defaultUserAgent = "chess-dojo (https://github.com/jackstenglein/chess-dojo)"

	maxRetries     = 3
	baseRetryDelay = 500 * time.Millisecond
)

var archiveRegex = regexp.MustCompile(`/(\d{4})/(\d{2})$`)

// timeClass represents the speed category of a game.
type timeClass string

const (
	timeClassBullet timeClass = "bullet"
	timeClassBlitz  timeClass = "blitz"
	timeClassRapid  timeClass = "rapid"
	timeClassDaily  timeClass = "daily"
)

// gameResult represents the PGN result of a game.
type gameResult string

const (
	resultWhite gameResult = "1-0"
	resultBlack gameResult = "0-1"
	resultDraw  gameResult = "1/2-1/2"
)

// playerResult represents a player's result in a Chess.com game.
type playerResult string

const (
	playerResultWin        playerResult = "win"
	playerResultResigned   playerResult = "resigned"
	playerResultCheckmated playerResult = "checkmated"
	playerResultStalemate  playerResult = "stalemate"

	// Currently unused - may uncomment later
	// playerResultTimeout              playerResult = "timeout"
	// playerResultDrawAgreement        playerResult = "agreed"
	// playerResultAbandoned            playerResult = "abandoned"
	// playerResultInsufficientMaterial playerResult = "insufficient"
	// playerResultRepetition           playerResult = "repetition"
	// playerResultTimeVsInsufficient   playerResult = "timevsinsufficient"
	// playerResult50Move               playerResult = "50move"
)

// player represents a player in a Chess.com game.
type player struct {
	Rating   int          `json:"rating"`
	Result   playerResult `json:"result"`
	Username string       `json:"username"`
	UUID     string       `json:"uuid"`
}

// chesscomGame represents a single game from the Chess.com API.
type chesscomGame struct {
	URL         string    `json:"url"`
	PGN         string    `json:"pgn"`
	TimeControl string    `json:"time_control"`
	EndTime     int64     `json:"end_time"`
	Rated       bool      `json:"rated"`
	UUID        string    `json:"uuid"`
	TimeClass   timeClass `json:"time_class"`
	Rules       string    `json:"rules"`
	White       player    `json:"white"`
	Black       player    `json:"black"`
}

// Result returns the game result derived from the player results.
func (g *chesscomGame) Result() gameResult {
	if g.White.Result == playerResultWin {
		return resultWhite
	}
	if g.Black.Result == playerResultWin {
		return resultBlack
	}
	return resultDraw
}

// PlayerColor returns "white" or "black" based on whether the given
// username (case-insensitive) played as white or black. It returns an
// error if the username matches neither player.
func (g *chesscomGame) PlayerColor(username string) (string, error) {
	if strings.EqualFold(g.White.Username, username) {
		return "white", nil
	}
	if strings.EqualFold(g.Black.Username, username) {
		return "black", nil
	}
	return "", fmt.Errorf("chesscom: username %q matches neither white (%q) nor black (%q)", username, g.White.Username, g.Black.Username)
}

// IsStandard returns true if the game uses standard chess rules.
func (g *chesscomGame) IsStandard() bool {
	return g.Rules == "chess"
}

type archivesResponse struct {
	Archives []string `json:"archives"`
}

type gamesResponse struct {
	Games []chesscomGame `json:"games"`
}

// Client fetches games from the Chess.com public API.
type Client struct {
	httpClient     *http.Client
	baseRetryDelay time.Duration
}

// NewClient creates a new Chess.com API client with default settings.
func NewClient() *Client {
	return &Client{
		httpClient:     &http.Client{Timeout: defaultTimeout},
		baseRetryDelay: baseRetryDelay,
	}
}

// NewClientWithHTTP creates a new Chess.com API client with a custom http.Client
// or the default settings if httpClient is nil.
func NewClientWithHTTP(httpClient *http.Client) *Client {
	if httpClient == nil {
		return NewClient()
	}
	return &Client{httpClient: httpClient, baseRetryDelay: baseRetryDelay}
}

// fetchArchives returns the list of monthly archive URLs for the given username.
// Archives are returned in the order provided by the API (ascending chronological).
func (c *Client) fetchArchives(ctx context.Context, username string) ([]string, error) {
	url := fmt.Sprintf("%s/%s/games/archives", baseURL, url.PathEscape(strings.ToLower(username)))

	body, err := c.doGet(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("fetch archives for %s: %w", username, err)
	}
	defer body.Close()

	var resp archivesResponse
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return nil, fmt.Errorf("decode archives for %s: %w", username, err)
	}
	return resp.Archives, nil
}

// filterArchives filters archive URLs to only include those within the given
// time range [since, until]. Either bound may be zero to indicate no bound.
// Archives are expected to end with /{year}/{month}.
func filterArchives(archives []string, since, until time.Time) []string {
	var filtered []string
	for _, archive := range archives {
		m := archiveRegex.FindStringSubmatch(archive)
		if m == nil {
			continue
		}
		year, _ := strconv.Atoi(m[1])
		month, _ := strconv.Atoi(m[2])
		archiveStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		archiveEnd := archiveStart.AddDate(0, 1, 0).Add(-time.Nanosecond)

		if !since.IsZero() && archiveEnd.Before(since) {
			continue
		}
		if !until.IsZero() && archiveStart.After(until) {
			continue
		}
		filtered = append(filtered, archive)
	}
	return filtered
}

// fetchGames fetches all games from a single archive URL.
func (c *Client) fetchGames(ctx context.Context, archiveURL string) ([]chesscomGame, error) {
	body, err := c.doGet(ctx, archiveURL)
	if err != nil {
		return nil, fmt.Errorf("fetch games from %s: %w", archiveURL, err)
	}
	defer body.Close()

	var resp gamesResponse
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return nil, fmt.Errorf("decode games from %s: %w", archiveURL, err)
	}
	return resp.Games, nil
}

// archiveResult holds the fetched games for a single archive slot.
type archiveResult struct {
	games []chesscomGame
	err   error
}

func (c *Client) Games(ctx context.Context, username string, since, until time.Time) iter.Seq2[game.Game, error] {
	return func(yield func(game.Game, error) bool) {
		archives, err := c.fetchArchives(ctx, username)
		if err != nil {
			yield(game.Game{}, err)
			return
		}

		filtered := filterArchives(archives, since, until)

		// Process archives in chronological order (oldest-first). This
		// ensures cursor pagination works correctly: on resume the cursor's
		// since timestamp excludes already-processed older archives while
		// newer archives are still ahead.
		n := len(filtered)

		// Allocate one slot channel per archive to preserve ordering.
		slots := make([]chan archiveResult, n)
		for i := range slots {
			slots[i] = make(chan archiveResult, 1)
		}

		// Cancel in-flight fetches if we stop early.
		fetchCtx, cancelFetches := context.WithCancel(ctx)

		g, fetchCtx := errgroup.WithContext(fetchCtx)
		g.SetLimit(maxConcurrentFetches)
		for i, archiveURL := range filtered {
			g.Go(func() error {
				games, err := c.fetchGames(fetchCtx, archiveURL)
				slots[i] <- archiveResult{games: games, err: err}
				return err
			})
		}

		// Ensure all goroutines finish before we return.
		defer func() {
			cancelFetches()
			g.Wait()
		}()

		// Drain slots in order (0, 1, 2...) to preserve oldest-first ordering.
		for i := range slots {
			res := <-slots[i]
			if res.err != nil {
				yield(game.Game{}, res.err)
				return
			}

			for j := range res.games {
				if !res.games[j].IsStandard() {
					continue
				}
				cg, err := ToGame(&res.games[j], username)
				if err != nil {
					yield(cg, err)
					return
				}
				if !since.IsZero() && cg.EndTime.Before(since) {
					continue
				}
				if !until.IsZero() && !cg.EndTime.Before(until) {
					continue
				}
				if !yield(cg, nil) {
					return
				}
			}
		}
	}
}

// doGet performs an HTTP GET request and returns the response body.
// It retries with exponential backoff on HTTP 429 (rate limit) responses.
// The caller is responsible for closing the body.
func (c *Client) doGet(ctx context.Context, url string) (io.ReadCloser, error) {
	for attempt := range maxRetries {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", defaultUserAgent)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("http get %s: %w", url, err)
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			if attempt == maxRetries-1 {
				return nil, fmt.Errorf("rate limited by Chess.com API (HTTP 429) after %d retries", maxRetries)
			}
			delay := time.Duration(math.Pow(2, float64(attempt))) * c.baseRetryDelay
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
				continue
			}
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("unexpected status %d from %s", resp.StatusCode, url)
		}

		return resp.Body, nil
	}
	return nil, fmt.Errorf("unreachable: doGet retry loop exhausted for %s", url)
}
