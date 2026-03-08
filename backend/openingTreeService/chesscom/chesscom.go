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
	"net/url"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

const maxConcurrentFetches = 5

const (
	baseURL          = "https://api.chess.com/pub/player"
	defaultTimeout   = 10 * time.Second
	defaultUserAgent = "chess-dojo-scheduler (https://github.com/jackstenglein/chess-dojo-scheduler)"

	maxRetries     = 3
	baseRetryDelay = 500 * time.Millisecond
)

var archiveRegex = regexp.MustCompile(`/(\d{4})/(\d{2})$`)

// TimeClass represents the speed category of a game.
type TimeClass string

const (
	TimeClassBullet TimeClass = "bullet"
	TimeClassBlitz  TimeClass = "blitz"
	TimeClassRapid  TimeClass = "rapid"
	TimeClassDaily  TimeClass = "daily"
)

// GameResult represents the PGN result of a game.
type GameResult string

const (
	ResultWhite GameResult = "1-0"
	ResultBlack GameResult = "0-1"
	ResultDraw  GameResult = "1/2-1/2"
)

// PlayerResult represents a player's result in a Chess.com game.
type PlayerResult string

const (
	PlayerResultWin                 PlayerResult = "win"
	PlayerResultResigned            PlayerResult = "resigned"
	PlayerResultCheckmated          PlayerResult = "checkmated"
	PlayerResultTimeout             PlayerResult = "timeout"
	PlayerResultDrawAgreement       PlayerResult = "agreed"
	PlayerResultAbandoned           PlayerResult = "abandoned"
	PlayerResultInsufficientMaterial PlayerResult = "insufficient"
	PlayerResultRepetition          PlayerResult = "repetition"
	PlayerResultStalemate           PlayerResult = "stalemate"
	PlayerResultTimeVsInsufficient  PlayerResult = "timevsinsufficient"
	PlayerResult50Move              PlayerResult = "50move"
)

// Player represents a player in a Chess.com game.
type Player struct {
	Rating   int          `json:"rating"`
	Result   PlayerResult `json:"result"`
	Username string       `json:"username"`
	UUID     string       `json:"uuid"`
}

// Game represents a single game from the Chess.com API.
type Game struct {
	URL         string    `json:"url"`
	PGN         string    `json:"pgn"`
	TimeControl string    `json:"time_control"`
	EndTime     int64     `json:"end_time"`
	Rated       bool      `json:"rated"`
	UUID        string    `json:"uuid"`
	TimeClass   TimeClass `json:"time_class"`
	Rules       string    `json:"rules"`
	White       Player    `json:"white"`
	Black       Player    `json:"black"`
}

// Result returns the game result derived from the player results.
func (g *Game) Result() GameResult {
	if g.White.Result == PlayerResultWin {
		return ResultWhite
	}
	if g.Black.Result == PlayerResultWin {
		return ResultBlack
	}
	return ResultDraw
}

// PlayerColor returns "white" or "black" based on whether the given
// username (case-insensitive) played as white or black. It returns an
// error if the username matches neither player.
func (g *Game) PlayerColor(username string) (string, error) {
	if strings.EqualFold(g.White.Username, username) {
		return "white", nil
	}
	if strings.EqualFold(g.Black.Username, username) {
		return "black", nil
	}
	return "", fmt.Errorf("chesscom: username %q matches neither white (%q) nor black (%q)", username, g.White.Username, g.Black.Username)
}

// IsStandard returns true if the game uses standard chess rules.
func (g *Game) IsStandard() bool {
	return g.Rules == "chess"
}

type archivesResponse struct {
	Archives []string `json:"archives"`
}

type gamesResponse struct {
	Games []Game `json:"games"`
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

// NewClientWithHTTP creates a new Chess.com API client with a custom http.Client.
func NewClientWithHTTP(httpClient *http.Client) *Client {
	return &Client{httpClient: httpClient, baseRetryDelay: baseRetryDelay}
}

// FetchArchives returns the list of monthly archive URLs for the given username.
// Archives are returned in the order provided by the API (ascending chronological).
func (c *Client) FetchArchives(ctx context.Context, username string) ([]string, error) {
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

// FilterArchives filters archive URLs to only include those within the given
// time range [since, until]. Either bound may be zero to indicate no bound.
// Archives are expected to end with /{year}/{month}.
func FilterArchives(archives []string, since, until time.Time) []string {
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

// FetchGames fetches all games from a single archive URL.
func (c *Client) FetchGames(ctx context.Context, archiveURL string) ([]Game, error) {
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
	games []Game
	err   error
}

// Games returns an iterator that yields one game.Game at a time from all
// matching archives. Archives are processed in reverse chronological order
// (newest first). Up to 5 archives are fetched concurrently, but results are
// drained sequentially to guarantee deterministic ordering. Non-standard
// variants are excluded when standardOnly is true.
func (c *Client) Games(ctx context.Context, username string, since, until time.Time, standardOnly bool) iter.Seq2[game.Game, error] {
	return func(yield func(game.Game, error) bool) {
		archives, err := c.FetchArchives(ctx, username)
		if err != nil {
			yield(game.Game{}, err)
			return
		}

		filtered := FilterArchives(archives, since, until)

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

		// Semaphore limits concurrent fetches.
		sem := make(chan struct{}, maxConcurrentFetches)

		// Cancel in-flight fetches if we stop early.
		fetchCtx, cancelFetches := context.WithCancel(ctx)

		var wg sync.WaitGroup
		for i, archiveURL := range filtered {
			wg.Add(1)
			go func(idx int, url string) {
				defer wg.Done()
				select {
				case sem <- struct{}{}:
				case <-fetchCtx.Done():
					slots[idx] <- archiveResult{err: fetchCtx.Err()}
					return
				}
				games, err := c.FetchGames(fetchCtx, url)
				<-sem
				slots[idx] <- archiveResult{games: games, err: err}
			}(i, archiveURL)
		}

		// Ensure all goroutines finish before we return.
		defer func() {
			cancelFetches()
			wg.Wait()
		}()

		// Drain slots in order (0, 1, 2...) to preserve oldest-first ordering.
		for i := range slots {
			res := <-slots[i]
			if res.err != nil {
				yield(game.Game{}, res.err)
				return
			}
			for j := range res.games {
				if standardOnly && !res.games[j].IsStandard() {
					continue
				}
				cg, err := ToGame(&res.games[j], username)
				if err != nil {
					yield(game.Game{}, err)
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

			// Yield an archive-complete sentinel so the consumer knows
			// all games from this monthly archive have been delivered.
			// EndTime is set to the start of the next month so that on
			// resume FilterArchives(since=EndTime) excludes this archive.
			if m := archiveRegex.FindStringSubmatch(filtered[i]); m != nil {
				year, _ := strconv.Atoi(m[1])
				month, _ := strconv.Atoi(m[2])
				nextMonth := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC)
				if !yield(game.Game{ArchiveComplete: true, EndTime: nextMonth}, nil) {
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
