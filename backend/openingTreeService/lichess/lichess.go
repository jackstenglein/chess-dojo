// Package lichess streams and parses games from the Lichess API.
package lichess

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"iter"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

const (
	baseURL          = "https://lichess.org"
	defaultUserAgent = "chess-dojo (https://github.com/jackstenglein/chess-dojo)"
)

// timeClass represents a Lichess game speed category.
type timeClass string

const (
	timeClassUltraBullet    timeClass = "ultraBullet"
	timeClassBullet         timeClass = "bullet"
	timeClassBlitz          timeClass = "blitz"
	timeClassRapid          timeClass = "rapid"
	timeClassClassical      timeClass = "classical"
	timeClassCorrespondence timeClass = "correspondence"
)

// player holds a single side's data within a Lichess game.
type player struct {
	User        *user `json:"user,omitempty"`
	Rating      int   `json:"rating,omitempty"`
	RatingDiff  int   `json:"ratingDiff,omitempty"`
	AILevel     int   `json:"aiLevel,omitempty"`
	Provisional bool  `json:"provisional,omitempty"`
}

// user holds the identity of a Lichess player.
type user struct {
	Name   string `json:"name"`
	ID     string `json:"id"`
	Title  string `json:"title,omitempty"`
	Patron bool   `json:"patron,omitempty"`
}

// players holds the white and black players.
type players struct {
	White player `json:"white"`
	Black player `json:"black"`
}

// opening holds ECO/name data for a game's opening.
type opening struct {
	ECO  string `json:"eco"`
	Name string `json:"name"`
	Ply  int    `json:"ply"`
}

// clock holds time-control data for a game.
type clock struct {
	Initial   int `json:"initial"`
	Increment int `json:"increment"`
	TotalTime int `json:"totalTime"`
}

// lichessGame represents a single game from the Lichess NDJSON export.
type lichessGame struct {
	ID         string    `json:"id"`
	Rated      bool      `json:"rated"`
	Variant    string    `json:"variant"`
	Speed      timeClass `json:"speed"`
	Perf       string    `json:"perf"`
	CreatedAt  int64     `json:"createdAt"`
	LastMoveAt int64     `json:"lastMoveAt"`
	Status     string    `json:"status"`
	Players    players   `json:"players"`
	Winner     string    `json:"winner,omitempty"`
	Opening    opening   `json:"opening"`
	Moves      string    `json:"moves"`
	Clock      clock     `json:"clock"`
	PGN        string    `json:"pgn"`
}

// Result returns the game result as a PGN-style string: "1-0", "0-1", or "1/2-1/2".
func (g *lichessGame) Result() string {
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
// username (case-insensitive) is playing. It returns an error if the
// username matches neither player.
func (g *lichessGame) PlayerColor(username string) (string, error) {
	lower := strings.ToLower(username)
	if g.Players.White.User != nil && strings.ToLower(g.Players.White.User.ID) == lower {
		return "white", nil
	}
	if g.Players.Black.User != nil && strings.ToLower(g.Players.Black.User.ID) == lower {
		return "black", nil
	}
	return "", fmt.Errorf("lichess: username %q matches neither white nor black player", username)
}

// IsStandard returns true if the game uses the standard chess variant.
func (g *lichessGame) IsStandard() bool {
	return g.Variant == "standard"
}

// URL returns the full Lichess URL for this game.
func (g *lichessGame) URL() string {
	return baseURL + "/" + g.ID
}

// fetchParams configures which games to fetch from Lichess.
type fetchParams struct {
	Username string
	Max      int       // 0 means no limit
	Since    time.Time // zero means no lower bound
	Until    time.Time // zero means no upper bound
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
func (c *Client) Games(ctx context.Context, username string, since, until time.Time) iter.Seq2[game.Game, error] {
	return func(yield func(game.Game, error) bool) {
		url := c.buildURL(fetchParams{Username: username, Since: since, Until: until})

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
			yield(game.Game{}, fmt.Errorf("lichess: unexpected status %d for user %q", resp.StatusCode, username))
			return
		}

		scanner := bufio.NewScanner(resp.Body)
		// Lichess games can have large PGNs; allow up to 1MB per line.
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

		for scanner.Scan() {
			if err := ctx.Err(); err != nil {
				return
			}
			line := strings.TrimSpace(scanner.Text())
			if line == "" {
				continue
			}

			var lg lichessGame
			if err := json.Unmarshal([]byte(line), &lg); err != nil {
				yield(game.Game{}, fmt.Errorf("lichess: parsing game JSON: %w", err))
				return
			}

			if !lg.IsStandard() {
				continue
			}

			cg, err := ToGame(&lg, username)
			if err != nil {
				yield(game.Game{}, err)
				return
			}
			if !yield(cg, nil) {
				return
			}
		}

		if err := scanner.Err(); err != nil {
			yield(game.Game{}, fmt.Errorf("lichess: reading stream: %w", err))
		}
	}
}

func (c *Client) buildURL(params fetchParams) string {
	username := strings.TrimSpace(params.Username)

	u := fmt.Sprintf("%s/api/games/user/%s?pgnInJson=true", baseURL, url.PathEscape(username))

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
