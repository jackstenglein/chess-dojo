// Package openingtree implements the OpeningTree data structure for indexing
// chess games by position. It maps normalized FENs to position statistics
// (win/draw/loss counts, moves played) and game URLs to game metadata.
package openingtree

import (
	"fmt"
	"sort"
	"strings"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/notnil/chess"
)

const (
	// MinPlyCount is the minimum number of half-moves a game must have to be indexed.
	MinPlyCount = 2
)

// IndexedGame wraps a game.Game with tree-internal derived data computed
// during indexing (ply count and PGN headers).
type IndexedGame struct {
	*game.Game
	PlyCount int               `json:"plyCount"`
	Headers  map[string]string `json:"headers"`
}

// MoveData holds statistics for a single move from a position.
type MoveData struct {
	SAN   string            `json:"san"`
	White int               `json:"white"`
	Black int               `json:"black"`
	Draws int               `json:"draws"`
	Games map[string]struct{} `json:"-"`
}

// totalGames returns the total number of games for this move.
func (m *MoveData) totalGames() int {
	return m.White + m.Black + m.Draws
}

// PositionData holds statistics for a single board position.
type PositionData struct {
	White int               `json:"white"`
	Black int               `json:"black"`
	Draws int               `json:"draws"`
	Moves []*MoveData       `json:"moves"`
	Games map[string]struct{} `json:"-"`
}

// totalGames returns the total number of games for this position.
func (p *PositionData) totalGames() int {
	return p.White + p.Black + p.Draws
}

// OpeningTree indexes chess games by position, tracking move statistics
// and game metadata for each normalized FEN encountered.
type OpeningTree struct {
	positions map[string]*PositionData
	games     map[string]*IndexedGame
}

// New creates an empty OpeningTree.
func New() *OpeningTree {
	return &OpeningTree{
		positions: make(map[string]*PositionData),
		games:     make(map[string]*IndexedGame),
	}
}

// GameCount returns the number of games indexed by this tree.
func (t *OpeningTree) GameCount() int {
	return len(t.games)
}

// PositionCount returns the number of unique positions in this tree.
func (t *OpeningTree) PositionCount() int {
	return len(t.positions)
}

// GetGame returns the indexed game for the given URL, or nil if not found.
func (t *OpeningTree) GetGame(url string) *IndexedGame {
	return t.games[url]
}

// SetGame adds or replaces the indexed game for the given URL.
func (t *OpeningTree) SetGame(g *IndexedGame) {
	t.games[g.URL] = g
}

// GetPosition returns the position data for the given normalized FEN, or nil if not found.
func (t *OpeningTree) GetPosition(fen string) *PositionData {
	return t.positions[NormalizeFEN(fen)]
}

// SetPosition sets the position data for the given FEN.
func (t *OpeningTree) SetPosition(fen string, pos *PositionData) {
	t.positions[NormalizeFEN(fen)] = pos
}

// MergePosition merges the given position data into the existing data for the
// given FEN. If no data exists for the FEN, the position is stored directly.
// When merging, W/D/L counts are summed, game URLs are unioned, and moves
// are merged by SAN (new moves are appended, existing moves have their
// counts summed and game sets unioned). Moves are kept sorted by total games
// descending.
func (t *OpeningTree) MergePosition(fen string, pos *PositionData) {
	fen = NormalizeFEN(fen)

	existing, ok := t.positions[fen]
	if !ok {
		t.positions[fen] = pos
		return
	}

	existing.White += pos.White
	existing.Black += pos.Black
	existing.Draws += pos.Draws

	for url := range pos.Games {
		existing.Games[url] = struct{}{}
	}

	for _, move := range pos.Moves {
		var found *MoveData
		for _, em := range existing.Moves {
			if em.SAN == move.SAN {
				found = em
				break
			}
		}
		if found == nil {
			existing.Moves = append(existing.Moves, move)
		} else {
			found.White += move.White
			found.Black += move.Black
			found.Draws += move.Draws
			for url := range move.Games {
				found.Games[url] = struct{}{}
			}
		}
	}

	sort.Slice(existing.Moves, func(i, j int) bool {
		return existing.Moves[i].totalGames() > existing.Moves[j].totalGames()
	})
}

// IndexGame parses the PGN from the given game, replays the moves, and records
// each position's FEN along with the move played and the game result. Games
// with fewer than MinPlyCount half-moves are skipped. Returns true if the game
// was successfully indexed.
func (t *OpeningTree) IndexGame(gm *game.Game) (bool, error) {
	reader := strings.NewReader(gm.PGN)
	pgnFunc, err := chess.PGN(reader)
	if err != nil {
		return false, fmt.Errorf("parsing PGN: %w", err)
	}
	g := chess.NewGame(pgnFunc)

	moves := g.Moves()
	positions := g.Positions()
	plyCount := len(moves)

	if plyCount < MinPlyCount {
		return false, nil
	}

	// Build tree-internal indexed game with derived data.
	headers := make(map[string]string)
	for _, tp := range g.TagPairs() {
		headers[tp.Key] = tp.Value
	}
	ig := &IndexedGame{
		Game:     gm,
		PlyCount: plyCount,
		Headers:  headers,
	}
	t.SetGame(ig)

	// Determine result key.
	var resultKey string
	switch gm.Result {
	case game.ResultWhite:
		resultKey = "white"
	case game.ResultBlack:
		resultKey = "black"
	default:
		resultKey = "draws"
	}

	// Pre-compute result counts.
	var w, b, d int
	switch resultKey {
	case "white":
		w = 1
	case "black":
		b = 1
	default:
		d = 1
	}

	notation := chess.AlgebraicNotation{}

	// Walk through each position and record the move played from it.
	for i, pos := range positions {
		var movesSlice []*MoveData
		if i < len(moves) {
			san := notation.Encode(pos, moves[i])
			movesSlice = []*MoveData{
				{
					SAN:   san,
					White: w, Black: b, Draws: d,
					Games: map[string]struct{}{gm.URL: {}},
				},
			}
		}

		posData := &PositionData{
			White: w, Black: b, Draws: d,
			Games: map[string]struct{}{gm.URL: {}},
			Moves: movesSlice,
		}
		t.MergePosition(pos.String(), posData)
	}

	return true, nil
}

// NormalizeFEN strips the halfmove clock and fullmove number from a FEN,
// keeping only piece placement, active color, castling availability, and
// en passant target square. This matches positions regardless of move number.
func NormalizeFEN(fen string) string {
	tokens := strings.SplitN(fen, " ", 6)
	if len(tokens) < 4 {
		return fen
	}
	return tokens[0] + " " + tokens[1] + " " + tokens[2] + " " + tokens[3] + " 0 1"
}
