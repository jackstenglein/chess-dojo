// Package chesscom provides a client for fetching games from the Chess.com
// public API. It handles archive listing, date filtering, game fetching,
// and extraction of game metadata (PGN, ratings, result, time class, etc.).
package chesscom

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	baseURL        = "https://api.chess.com/pub/player"
	defaultTimeout = 10 * time.Second
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
// username (case-insensitive) played as white or black.
func (g *Game) PlayerColor(username string) string {
	if strings.EqualFold(g.White.Username, username) {
		return "white"
	}
	return "black"
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
	httpClient *http.Client
}

// NewClient creates a new Chess.com API client with default settings.
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: defaultTimeout},
	}
}

// NewClientWithHTTP creates a new Chess.com API client with a custom http.Client.
func NewClientWithHTTP(httpClient *http.Client) *Client {
	return &Client{httpClient: httpClient}
}

// FetchArchives returns the list of monthly archive URLs for the given username.
// Archives are returned in the order provided by the API (ascending chronological).
func (c *Client) FetchArchives(ctx context.Context, username string) ([]string, error) {
	url := fmt.Sprintf("%s/%s/games/archives", baseURL, strings.ToLower(username))

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

// FetchAllGames fetches archives for the given username, filters them by date
// range, and returns all games from the matching archives. Games are returned
// in reverse chronological order (newest archive first). Non-standard variants
// are excluded when standardOnly is true.
func (c *Client) FetchAllGames(ctx context.Context, username string, since, until time.Time, standardOnly bool) ([]Game, error) {
	archives, err := c.FetchArchives(ctx, username)
	if err != nil {
		return nil, err
	}

	filtered := FilterArchives(archives, since, until)

	var allGames []Game
	// Process archives in reverse order (newest first).
	for i := len(filtered) - 1; i >= 0; i-- {
		games, err := c.FetchGames(ctx, filtered[i])
		if err != nil {
			return nil, err
		}
		for j := range games {
			if standardOnly && !games[j].IsStandard() {
				continue
			}
			allGames = append(allGames, games[j])
		}
	}
	return allGames, nil
}

// doGet performs an HTTP GET request and returns the response body.
// The caller is responsible for closing the body.
func (c *Client) doGet(ctx context.Context, url string) (io.ReadCloser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get %s: %w", url, err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		resp.Body.Close()
		return nil, fmt.Errorf("rate limited by Chess.com API (HTTP 429)")
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("unexpected status %d from %s", resp.StatusCode, url)
	}

	return resp.Body, nil
}
