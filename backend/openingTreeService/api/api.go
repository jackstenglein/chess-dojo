// Package api defines the JSON wire format for the OpeningTree Lambda response
// and provides conversion from internal domain types.
package api

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/openingtree"
)

// SourceCursor holds the resume state for a single source.
type SourceCursor struct {
	// Since is the max EndTime seen across indexed games for this source.
	Since time.Time `json:"since,omitzero"`
	// Until is the min EndTime seen across indexed games for this source.
	Until     time.Time `json:"until,omitzero"`
	Completed bool      `json:"completed,omitempty"`
}

// Cursor holds pagination state so the client can request subsequent pages.
// The Sources map is keyed by "sourceType:username" (e.g. "chesscom:alice").
type Cursor struct {
	Sources    map[string]SourceCursor `json:"sources"`
	TotalGames int                     `json:"totalGames"`
}

// GetSource fetches the SourceCursor for the given src.
func (c *Cursor) GetSource(src Source) (SourceCursor, bool) {
	if c == nil {
		return SourceCursor{}, false
	}
	sc, ok := c.Sources[sourceKey(src)]
	return sc, ok
}

// SetSource sets the SourceCursor for the given src.
func (c *Cursor) SetSource(src Source, cursor SourceCursor) {
	if c == nil {
		return
	}
	c.Sources[sourceKey(src)] = cursor
}

// Completed returns whether the given src is completed.
func (c *Cursor) Completed(src Source) bool {
	if c == nil {
		return false
	}
	return c.Sources[sourceKey(src)].Completed
}

// Since returns the since field for the given src.
func (c *Cursor) Since(src Source) time.Time {
	if c == nil {
		return time.Time{}
	}
	return c.Sources[sourceKey(src)].Since
}

// Until returns the until field for the given src.
func (c *Cursor) Until(src Source) time.Time {
	if c == nil {
		return time.Time{}
	}
	return c.Sources[sourceKey(src)].Until
}

func (c *Cursor) GetTotalGames() int {
	if c == nil {
		return 0
	}
	return c.TotalGames
}

// SourceError reports a per-source fetch failure. The frontend can display
// which sources succeeded and which failed.
type SourceError struct {
	Source   game.SourceType `json:"source"`
	Username string          `json:"username"`
	Error    string          `json:"error"`
}

// Source identifies which platform and username to fetch games from.
type Source struct {
	Type     game.SourceType `json:"type"`
	Username string          `json:"username,omitempty"`
}

// BuildRequest is the JSON payload sent by the frontend.
//
// Since and Until define the date range filter. These MUST be re-sent on
// cursor resume requests — the cursor only stores pagination position,
// not the original date bounds. Omitting them on resume will cause
// Lichess to stream all games older than the cursor position with no
// lower bound.
type BuildRequest struct {
	Sources []Source `json:"sources"`
	Since   *string  `json:"since,omitempty"`
	Until   *string  `json:"until,omitempty"`
	Cursor  *Cursor  `json:"cursor,omitempty"`
	// Set by the server after parsing the request
	sinceTime time.Time `json:"-"`
	untilTime time.Time `json:"-"`
}

// NewBuildRequest returns a BuildRequest parsed from the given JSON body.
func NewBuildRequest(body []byte) (BuildRequest, error) {
	req := BuildRequest{}
	if err := json.Unmarshal(body, &req); err != nil {
		return req, fmt.Errorf("unable to parse build request: %w", err)
	}
	if req.Since != nil {
		t, err := time.Parse(time.RFC3339, *req.Since)
		if err != nil {
			return req, fmt.Errorf("'since' must be RFC3339 format (e.g. 2024-01-01T00:00:00Z), got %q: %w", *req.Since, err)
		}
		req.sinceTime = t
	}
	if req.Until != nil {
		t, err := time.Parse(time.RFC3339, *req.Until)
		if err != nil {
			return req, fmt.Errorf("'until' must be RFC3339 format (e.g. 2024-01-01T00:00:00Z), got %q: %w", *req.Until, err)
		}
		req.untilTime = t
	}
	return req, nil
}

// SinceTime gets the Since field of the request as a time.Time.
func (br BuildRequest) SinceTime() time.Time {
	return br.sinceTime
}

// UntilTime gets the Until field of the request as a time.Time.
func (br BuildRequest) UntilTime() time.Time {
	return br.untilTime
}

// BuildResponse is the top-level JSON envelope returned by the OpeningTree Lambda.
type BuildResponse struct {
	Positions    map[string]*Position `json:"positions"`
	Games        map[string]*Game     `json:"games"`
	Truncated    bool                 `json:"truncated,omitempty"`
	Cursor       *Cursor              `json:"cursor,omitempty"`
	SourceErrors []SourceError        `json:"sourceErrors,omitempty"`
}

// Position is the wire format for a single board position's statistics.
type Position struct {
	White int      `json:"white"`
	Black int      `json:"black"`
	Draws int      `json:"draws"`
	Moves []*Move  `json:"moves"`
	Games []string `json:"games"`
}

// Move is the wire format for a single move from a position.
type Move struct {
	SAN   string   `json:"san"`
	White int      `json:"white"`
	Black int      `json:"black"`
	Draws int      `json:"draws"`
	Games []string `json:"games"`
}

// Game is the wire format for game metadata. Field names match the frontend
// GameData interface (camelCase).
type Game struct {
	Source      Source            `json:"source"`
	PlayerColor string            `json:"playerColor"`
	White       string            `json:"white"`
	Black       string            `json:"black"`
	WhiteElo    int               `json:"whiteElo"`
	BlackElo    int               `json:"blackElo"`
	Result      string            `json:"result"`
	PlyCount    int               `json:"plyCount"`
	Rated       bool              `json:"rated"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	TimeClass   string            `json:"timeClass"`
}

// FromOpeningTree converts an internal OpeningTree into the API wire format.
func FromOpeningTree(tree *openingtree.OpeningTree) *BuildResponse {
	resp := &BuildResponse{
		Positions: make(map[string]*Position, tree.PositionCount()),
		Games:     make(map[string]*Game, tree.GameCount()),
	}

	for fen, pos := range tree.Positions() {
		resp.Positions[fen] = convertPosition(pos)
	}

	for url, ig := range tree.Games() {
		resp.Games[url] = convertGame(ig)
	}

	return resp
}

func convertPosition(pos *openingtree.PositionData) *Position {
	moves := make([]*Move, len(pos.Moves))
	for i, m := range pos.Moves {
		moves[i] = convertMove(m)
	}

	return &Position{
		White: pos.White,
		Black: pos.Black,
		Draws: pos.Draws,
		Moves: moves,
		Games: sortedKeys(pos.Games),
	}
}

func convertMove(m *openingtree.MoveData) *Move {
	return &Move{
		SAN:   m.SAN,
		White: m.White,
		Black: m.Black,
		Draws: m.Draws,
		Games: sortedKeys(m.Games),
	}
}

func convertGame(ig *openingtree.IndexedGame) *Game {
	return &Game{
		Source:      Source{Type: ig.Source},
		PlayerColor: ig.PlayerColor,
		White:       ig.WhiteUsername,
		Black:       ig.BlackUsername,
		WhiteElo:    ig.WhiteRating,
		BlackElo:    ig.BlackRating,
		Result:      string(ig.Result),
		PlyCount:    ig.PlyCount,
		Rated:       ig.Rated,
		URL:         ig.URL,
		Headers:     ig.Headers,
		TimeClass:   string(ig.TimeClass),
	}
}

// sortedKeys returns the keys of a set map as a sorted string slice.
// Sorting ensures deterministic JSON output for testing and caching.
func sortedKeys(m map[string]struct{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// sourceKey returns a stable key for a source, used as cursor map keys.
func sourceKey(src Source) string {
	return fmt.Sprintf("%s:%s", src.Type, strings.ToLower(src.Username))
}
