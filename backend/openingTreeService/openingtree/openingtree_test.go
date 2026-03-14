package openingtree

import (
"os"
	"strings"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

// ---------------------------------------------------------------------------
// NormalizeFEN
// ---------------------------------------------------------------------------

func TestNormalizeFEN(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{
			input: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
			want:  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		},
		{
			input: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
			want:  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
		},
		{
			input: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 5 10",
			want:  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
		},
		{
			input: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
			want:  "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1",
		},
		// Short FEN (fewer than 4 tokens) is returned as-is.
		{
			input: "rnbqkbnr/pppppppp/8/8",
			want:  "rnbqkbnr/pppppppp/8/8",
		},
	}

	for _, tc := range tests {
		got := NormalizeFEN(tc.input)
		if got != tc.want {
			t.Errorf("NormalizeFEN(%q)\n  got:  %q\n  want: %q", tc.input, got, tc.want)
		}
	}
}

// ---------------------------------------------------------------------------
// MergePosition
// ---------------------------------------------------------------------------

func TestMergePosition_NewPosition(t *testing.T) {
	tree := New()

	pos := &PositionData{
		White: 1, Black: 0, Draws: 0,
		Games: map[string]struct{}{"game1": {}},
		Moves: []*MoveData{
			{SAN: "e4", White: 1, Black: 0, Draws: 0, Games: map[string]struct{}{"game1": {}}},
		},
	}
	fen := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	tree.MergePosition(fen, pos)

	got := tree.GetPosition(fen)
	if got == nil {
		t.Fatal("expected position data, got nil")
	}
	if got.White != 1 || got.Black != 0 || got.Draws != 0 {
		t.Errorf("W/D/L = %d/%d/%d, want 1/0/0", got.White, got.Draws, got.Black)
	}
	if len(got.Moves) != 1 || got.Moves[0].SAN != "e4" {
		t.Errorf("moves = %v, want [e4]", got.Moves)
	}
}

func TestMergePosition_MergesExisting(t *testing.T) {
	tree := New()
	fen := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

	pos1 := &PositionData{
		White: 1, Black: 0, Draws: 0,
		Games: map[string]struct{}{"game1": {}},
		Moves: []*MoveData{
			{SAN: "e4", White: 1, Black: 0, Draws: 0, Games: map[string]struct{}{"game1": {}}},
		},
	}
	tree.MergePosition(fen, pos1)

	pos2 := &PositionData{
		White: 0, Black: 1, Draws: 0,
		Games: map[string]struct{}{"game2": {}},
		Moves: []*MoveData{
			{SAN: "e4", White: 0, Black: 1, Draws: 0, Games: map[string]struct{}{"game2": {}}},
			{SAN: "d4", White: 0, Black: 0, Draws: 1, Games: map[string]struct{}{"game3": {}}},
		},
	}
	tree.MergePosition(fen, pos2)

	got := tree.GetPosition(fen)
	if got.White != 1 || got.Black != 1 || got.Draws != 0 {
		t.Errorf("W/B/D = %d/%d/%d, want 1/1/0", got.White, got.Black, got.Draws)
	}
	if len(got.Games) != 2 {
		t.Errorf("games count = %d, want 2", len(got.Games))
	}
	if len(got.Moves) != 2 {
		t.Fatalf("moves count = %d, want 2", len(got.Moves))
	}

	// e4 should come first (total 2 > d4's total 1)
	if got.Moves[0].SAN != "e4" {
		t.Errorf("first move = %s, want e4", got.Moves[0].SAN)
	}
	if got.Moves[0].White != 1 || got.Moves[0].Black != 1 {
		t.Errorf("e4 W/B = %d/%d, want 1/1", got.Moves[0].White, got.Moves[0].Black)
	}
	if got.Moves[1].SAN != "d4" {
		t.Errorf("second move = %s, want d4", got.Moves[1].SAN)
	}
}

// ---------------------------------------------------------------------------
// IndexGame
// ---------------------------------------------------------------------------

var scholarsPGN = `[Event "Scholars Mate"]
[Site "Test"]
[Date "2024.01.01"]
[Round "1"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`

func TestIndexGame_ScholarsMate(t *testing.T) {
	tree := New()

	g := &game.Game{
		URL:    "https://example.com/game1",
		Result: game.ResultWhite,
		PGN:    scholarsPGN,
	}

	ok, err := tree.IndexGame(g)
	if err != nil {
		t.Fatalf("IndexGame error: %v", err)
	}
	if !ok {
		t.Fatal("IndexGame returned false, want true")
	}

	if tree.GameCount() != 1 {
		t.Errorf("game count = %d, want 1", tree.GameCount())
	}

	// The game has 7 half-moves, so there are 8 positions (start + 7 moves).
	// The starting position is the standard starting FEN.
	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	startPos := tree.GetPosition(startFEN)
	if startPos == nil {
		t.Fatal("expected starting position data, got nil")
	}
	if startPos.White != 1 {
		t.Errorf("starting position white = %d, want 1", startPos.White)
	}
	if len(startPos.Moves) != 1 || startPos.Moves[0].SAN != "e4" {
		t.Errorf("starting position moves = %v, want [e4]", startPos.Moves)
	}

	// Check that PlyCount was set.
	storedGame := tree.GetGame("https://example.com/game1")
	if storedGame == nil {
		t.Fatal("expected stored game, got nil")
	}
	if storedGame.PlyCount != 7 {
		t.Errorf("plyCount = %d, want 7", storedGame.PlyCount)
	}
	if storedGame.Headers["White"] != "White" {
		t.Errorf("White header = %q, want %q", storedGame.Headers["White"], "White")
	}
}

func TestIndexGame_SkipsShortGames(t *testing.T) {
	tree := New()

	g := &game.Game{
		URL:    "https://example.com/short",
		Result: game.ResultDraw,
		PGN: `[Result "*"]

1. e4 *`,
	}

	ok, err := tree.IndexGame(g)
	if err != nil {
		t.Fatalf("IndexGame error: %v", err)
	}
	if ok {
		t.Error("IndexGame returned true for a 1-move game, want false")
	}
	if tree.GameCount() != 0 {
		t.Errorf("game count = %d, want 0", tree.GameCount())
	}
}

func TestIndexGame_DrawResult(t *testing.T) {
	tree := New()

	g := &game.Game{
		URL:    "https://example.com/draw",
		Result: game.ResultDraw,
		PGN: `[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 1/2-1/2`,
	}

	ok, err := tree.IndexGame(g)
	if err != nil {
		t.Fatalf("IndexGame error: %v", err)
	}
	if !ok {
		t.Fatal("IndexGame returned false, want true")
	}

	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	pos := tree.GetPosition(startFEN)
	if pos == nil {
		t.Fatal("expected starting position, got nil")
	}
	if pos.Draws != 1 {
		t.Errorf("draws = %d, want 1", pos.Draws)
	}
	if pos.White != 0 || pos.Black != 0 {
		t.Errorf("W/B = %d/%d, want 0/0", pos.White, pos.Black)
	}
}

func TestIndexGame_MultipleGames(t *testing.T) {
	tree := New()

	// Game 1: 1. e4 e5 — white wins
	g1 := &game.Game{
		URL:    "g1",
		Result: game.ResultWhite,
		PGN: `[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`,
	}
	ok, err := tree.IndexGame(g1)
	if err != nil || !ok {
		t.Fatalf("game1: ok=%v err=%v", ok, err)
	}

	// Game 2: 1. e4 d5 — black wins
	g2 := &game.Game{
		URL:    "g2",
		Result: game.ResultBlack,
		PGN: `[Result "0-1"]

1. e4 d5 2. exd5 Qxd5 0-1`,
	}
	ok, err = tree.IndexGame(g2)
	if err != nil || !ok {
		t.Fatalf("game2: ok=%v err=%v", ok, err)
	}

	if tree.GameCount() != 2 {
		t.Errorf("game count = %d, want 2", tree.GameCount())
	}

	// Starting position should have both games.
	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	pos := tree.GetPosition(startFEN)
	if pos == nil {
		t.Fatal("expected starting position")
	}
	if pos.White != 1 || pos.Black != 1 {
		t.Errorf("W/B = %d/%d, want 1/1", pos.White, pos.Black)
	}
	if len(pos.Games) != 2 {
		t.Errorf("games = %d, want 2", len(pos.Games))
	}
	// e4 should be the only first move (both games start 1. e4).
	if len(pos.Moves) != 1 || pos.Moves[0].SAN != "e4" {
		t.Errorf("moves = %v, want [e4]", pos.Moves)
	}
	if pos.Moves[0].totalGames() != 2 {
		t.Errorf("e4 total = %d, want 2", pos.Moves[0].totalGames())
	}

	// After 1. e4, the position should branch: e5 (game1) and d5 (game2).
	afterE4FEN := "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
	afterE4 := tree.GetPosition(afterE4FEN)
	if afterE4 == nil {
		t.Fatal("expected position after e4")
	}
	if len(afterE4.Moves) != 2 {
		t.Fatalf("after e4: moves count = %d, want 2", len(afterE4.Moves))
	}
	// Both moves should have 1 game each.
	for _, m := range afterE4.Moves {
		if m.totalGames() != 1 {
			t.Errorf("move %s total = %d, want 1", m.SAN, m.totalGames())
		}
	}
}

func TestIndexGame_BlackWin(t *testing.T) {
	tree := New()

	g := &game.Game{
		URL:    "fool",
		Result: game.ResultBlack,
		PGN: `[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`,
	}
	ok, err := tree.IndexGame(g)
	if err != nil {
		t.Fatalf("IndexGame error: %v", err)
	}
	if !ok {
		t.Fatal("IndexGame returned false")
	}

	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	pos := tree.GetPosition(startFEN)
	if pos.Black != 1 || pos.White != 0 {
		t.Errorf("W/B = %d/%d, want 0/1", pos.White, pos.Black)
	}
}

func TestIndexGame_NormalizesHalfmoveClock(t *testing.T) {
	tree := New()
	// Two games that reach the same position but at different move numbers
	// should merge under the same normalized FEN.
	pgn1 := `[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`
	pgn2 := `[Result "0-1"]

1. e4 e5 2. Nf3 Nc6 0-1`

	g1 := &game.Game{URL: "n1", Result: game.ResultWhite, PGN: pgn1}
	g2 := &game.Game{URL: "n2", Result: game.ResultBlack, PGN: pgn2}

	if _, err := tree.IndexGame(g1); err != nil {
		t.Fatalf("IndexGame g1: %v", err)
	}
	if _, err := tree.IndexGame(g2); err != nil {
		t.Fatalf("IndexGame g2: %v", err)
	}

	// After 1. e4 e5 2. Nf3 Nc6 — FEN has halfmove=2, fullmove=3, but
	// normalized should strip those.
	pos := tree.GetPosition("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3")
	if pos == nil {
		t.Fatal("expected merged position, got nil")
	}
	if pos.totalGames() != 2 {
		t.Errorf("total games = %d, want 2", pos.totalGames())
	}
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

var samplePGN []byte

func init() {
	var err error
	samplePGN, err = os.ReadFile("testdata/sample.pgn")
	if err != nil {
		panic("failed to read testdata/sample.pgn: " + err.Error())
	}
}

func BenchmarkIndexGame(b *testing.B) {
	games := splitPGNGames(string(samplePGN))
	if len(games) == 0 {
		b.Fatal("no games found in sample PGN")
	}
	pgn := games[0]
	b.ResetTimer()
	for b.Loop() {
		tree := New()
		g := &game.Game{URL: "bench", Result: extractResult(pgn), PGN: pgn}
		_, _ = tree.IndexGame(g)
	}
}


// splitPGNGames splits a multi-game PGN string into individual game strings.
func splitPGNGames(data string) []string {
	var games []string
	var current strings.Builder

	for _, line := range strings.Split(data, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "[Event ") && current.Len() > 0 {
			games = append(games, current.String())
			current.Reset()
		}
		current.WriteString(line)
		current.WriteByte('\n')
	}
	if current.Len() > 0 {
		games = append(games, current.String())
	}
	return games
}

// extractResult parses the Result tag from a PGN string.
func extractResult(pgn string) game.Result {
	for _, line := range strings.Split(pgn, "\n") {
		if strings.HasPrefix(line, "[Result ") {
			val := strings.TrimPrefix(line, "[Result \"")
			val = strings.TrimSuffix(val, "\"]")
			switch val {
			case "1-0":
				return game.ResultWhite
			case "0-1":
				return game.ResultBlack
			default:
				return game.ResultDraw
			}
		}
	}
	return game.ResultDraw
}
