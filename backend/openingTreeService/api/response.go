// Package api defines the JSON wire format for the OpeningTree Lambda response
// and provides conversion from internal domain types.
package api

import (
	"sort"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/openingtree"
)

// SourceCursor holds the resume state for a single source.
type SourceCursor struct {
	LastTimestamp time.Time `json:"lastTimestamp"`
	// LastUntil is the min EndTime seen for sources that paginate backwards
	// (newest-first), such as Lichess. On resume, this value is sent as the
	// "until" parameter so the next page returns games older than this point.
	LastUntil time.Time `json:"lastUntil,omitempty"`
	Completed bool      `json:"completed,omitempty"`
}

// Cursor holds pagination state so the client can request subsequent pages.
// The Sources map is keyed by "sourceType:username" (e.g. "chesscom:alice").
type Cursor struct {
	Sources    map[string]SourceCursor `json:"sources"`
	TotalGames int                     `json:"totalGames"`
}

// Response is the top-level JSON envelope returned by the OpeningTree Lambda.
type Response struct {
	Positions map[string]*Position `json:"positions"`
	Games     map[string]*Game     `json:"games"`
	Truncated bool                 `json:"truncated,omitempty"`
	Cursor    *Cursor              `json:"cursor,omitempty"`
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
	PlayerColor string           `json:"playerColor"`
	White       string           `json:"white"`
	Black       string           `json:"black"`
	WhiteElo    int              `json:"whiteElo"`
	BlackElo    int              `json:"blackElo"`
	Result      string           `json:"result"`
	PlyCount    int              `json:"plyCount"`
	Rated       bool             `json:"rated"`
	URL         string           `json:"url"`
	Headers     map[string]string `json:"headers"`
	TimeClass   string           `json:"timeClass"`
}

// Source identifies which platform a game originated from.
type Source struct {
	Type string `json:"type"`
}

// FromOpeningTree converts an internal OpeningTree into the API wire format.
func FromOpeningTree(tree *openingtree.OpeningTree) *Response {
	resp := &Response{
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
		Source:      Source{Type: string(ig.Source)},
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
