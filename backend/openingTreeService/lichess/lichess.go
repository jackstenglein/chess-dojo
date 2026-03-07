// Package lichess streams and parses games from the Lichess API.
package lichess

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"iter"
	"net/http"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

const (
	baseURL          = "https://lichess.org"
	defaultUserAgent = "chess-dojo-scheduler"
)

// TimeClass represents a Lichess game speed category.
type TimeClass string

const (
	TimeClassUltraBullet    TimeClass = "ultraBullet"
	TimeClassBullet         TimeClass = "bullet"
	TimeClassBlitz          TimeClass = "blitz"
	TimeClassRapid          TimeClass = "rapid"
	TimeClassClassical      TimeClass = "classical"
	TimeClassCorrespondence TimeClass = "correspondence"
)

// Player holds a single side's data within a Lichess game.
type Player struct {
	User        *User `json:"user,omitempty"`
	Rating      int   `json:"rating,omitempty"`
	RatingDiff  int   `json:"ratingDiff,omitempty"`
	AILevel     int   `json:"aiLevel,omitempty"`
	Provisional bool  `json:"provisional,omitempty"`
}

// User holds the identity of a Lichess player.
type User struct {
	Name   string `json:"name"`
	ID     string `json:"id"`
	Title  string `json:"title,omitempty"`
	Patron bool   `json:"patron,omitempty"`
}

// Players holds the white and black players.
type Players struct {
	White Player `json:"white"`
	Black Player `json:"black"`
}

// Opening holds ECO/name data for a game's opening.
type Opening struct {
	ECO  string `json:"eco"`
	Name string `json:"name"`
	Ply  int    `json:"ply"`
}

// Clock holds time-control data for a game.
type Clock struct {
	Initial   int `json:"initial"`
	Increment int `json:"increment"`
	TotalTime int `json:"totalTime"`
}

// Game represents a single game from the Lichess NDJSON export.
type Game struct {
	ID        string    `json:"id"`
	Rated     bool      `json:"rated"`
	Variant   string    `json:"variant"`
	Speed     TimeClass `json:"speed"`
	Perf      string    `json:"perf"`
	CreatedAt int64     `json:"createdAt"`
	LastMoveAt int64    `json:"lastMoveAt"`
	Status    string    `json:"status"`
	Players   Players   `json:"players"`
	Winner    string    `json:"winner,omitempty"`
	Opening   Opening   `json:"opening"`
	Moves     string    `json:"moves"`
	Clock     Clock     `json:"clock"`
	PGN       string    `json:"pgn"`
}

// Result returns the game result as a PGN-style string: "1-0", "0-1", or "1/2-1/2".
func (g *Game) Result() string {
	switch g.Winner {
	case "white":
		return "1-0"
	case "black":
		return "0-1"
	default:
		return "1/2-1/2"
	}
}

// PlayerColor returns "white" or "black" depending on which side the given
// username (case-insensitive) is playing.
func (g *Game) PlayerColor(username string) string {
	lower := strings.ToLower(username)
	if g.Players.White.User != nil && strings.ToLower(g.Players.White.User.ID) == lower {
		return "white"
	}
	return "black"
}

// URL returns the full Lichess URL for this game.
func (g *Game) URL() string {
	return baseURL + "/" + g.ID
}

// FetchParams configures which games to fetch from Lichess.
type FetchParams struct {
	Username  string
	Max       int       // 0 means no limit
	PGNInJSON bool      // include PGN in the JSON response (default true)
	Since     time.Time // zero means no lower bound
	Until     time.Time // zero means no upper bound
}

// Client fetches games from the Lichess API.
type Client struct {
	HTTPClient *http.Client
}

// NewClient returns a Client with the given http.Client.
// If httpClient is nil, http.DefaultClient is used.
func NewClient(httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Client{HTTPClient: httpClient}
}

// Games returns an iterator that yields one game.Game at a time from the
// Lichess NDJSON stream. Each game is converted to the common game model.
// The iterator stops on the first error, yielding it as the error value.
func (c *Client) Games(ctx context.Context, params FetchParams) iter.Seq2[game.Game, error] {
	return func(yield func(game.Game, error) bool) {
		url := c.buildURL(params)

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			yield(game.Game{}, fmt.Errorf("lichess: creating request: %w", err))
			return
		}
		req.Header.Set("Accept", "application/x-ndjson")
		req.Header.Set("User-Agent", defaultUserAgent)

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			yield(game.Game{}, fmt.Errorf("lichess: executing request: %w", err))
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			yield(game.Game{}, fmt.Errorf("lichess: unexpected status %d for user %q", resp.StatusCode, params.Username))
			return
		}

		scanner := bufio.NewScanner(resp.Body)
		// Lichess games can have large PGNs; allow up to 1MB per line.
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

		count := 0
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" {
				continue
			}

			var lg Game
			if err := json.Unmarshal([]byte(line), &lg); err != nil {
				yield(game.Game{}, fmt.Errorf("lichess: parsing game JSON: %w", err))
				return
			}

			if !yield(ToGame(&lg, params.Username), nil) {
				return
			}

			count++
			if params.Max > 0 && count >= params.Max {
				return
			}
		}

		if err := scanner.Err(); err != nil {
			yield(game.Game{}, fmt.Errorf("lichess: reading stream: %w", err))
		}
	}
}

func (c *Client) buildURL(params FetchParams) string {
	username := strings.TrimSpace(params.Username)

	pgnInJSON := true
	if !params.PGNInJSON {
		pgnInJSON = false
	}

	u := fmt.Sprintf("%s/api/games/user/%s?pgnInJson=%t", baseURL, username, pgnInJSON)

	if params.Max > 0 {
		u += fmt.Sprintf("&max=%d", params.Max)
	}
	if !params.Since.IsZero() {
		u += fmt.Sprintf("&since=%d", params.Since.UnixMilli())
	}
	if !params.Until.IsZero() {
		u += fmt.Sprintf("&until=%d", params.Until.UnixMilli())
	}
	return u
}
