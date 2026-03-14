package openingtree

import (
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/corentings/chess"
)

const randSeed int64 = 42

var updateGolden = flag.Bool("update-golden", false, "regenerate testdata/golden.json")

// ---------------------------------------------------------------------------
// Correctness: golden-file regression
// ---------------------------------------------------------------------------

func TestGoldenFile(t *testing.T) {
	tree := New()
	games := splitPGNGames(string(samplePGN))
	for i, pgn := range games {
		g := &game.Game{
			URL:    fmt.Sprintf("https://example.com/game/%d", i),
			Result: extractResult(pgn),
			PGN:    pgn,
		}
		_, _ = tree.IndexGame(g)
	}

	got, err := json.MarshalIndent(tree, "", "  ")
	if err != nil {
		t.Fatalf("marshal tree: %v", err)
	}

	goldenPath := "testdata/golden.json"

	if *updateGolden {
		if err := os.WriteFile(goldenPath, got, 0644); err != nil {
			t.Fatalf("write golden: %v", err)
		}
		t.Log("updated golden file")
		return
	}

	want, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read golden (run with -update-golden to create): %v", err)
	}

	if string(got) != string(want) {
		// Show a concise diff via SHA for CI logs, full diff is too large.
		t.Errorf("golden mismatch\n  got  sha256: %x\n  want sha256: %x\n"+
			"run with -update-golden to regenerate",
			sha256.Sum256(got), sha256.Sum256(want))
	}
}

// ---------------------------------------------------------------------------
// Correctness: structural invariants matching JS frontend behavior
// ---------------------------------------------------------------------------

func TestCorrectnessInvariants(t *testing.T) {
	tree := New()
	games := splitPGNGames(string(samplePGN))
	for i, pgn := range games {
		g := &game.Game{
			URL:    fmt.Sprintf("https://example.com/game/%d", i),
			Result: extractResult(pgn),
			PGN:    pgn,
		}
		_, _ = tree.IndexGame(g)
	}

	t.Run("game_count", func(t *testing.T) {
		// sample.pgn has 10 games; 1 has only 1 ply ("*" result) — but actually
		// let's count: all games in sample.pgn have >= 2 plies, so all should index.
		// The sample has: Immortal, Opera, Evergreen, Scholars, Italian, Sicilian,
		// Caro-Kann, London, Kings Pawn Short, Giuoco Piano = 10 games.
		if tree.GameCount() != 10 {
			t.Errorf("game count = %d, want 10", tree.GameCount())
		}
	})

	t.Run("starting_position_has_all_games", func(t *testing.T) {
		startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
		pos := tree.GetPosition(startFEN)
		if pos == nil {
			t.Fatal("starting position not found")
		}
		if len(pos.Games) != 10 {
			t.Errorf("starting position games = %d, want 10", len(pos.Games))
		}
		total := pos.totalGames()
		if total != 10 {
			t.Errorf("starting position total = %d, want 10", total)
		}
	})

	t.Run("moves_sorted_by_total_descending", func(t *testing.T) {
		for fen, pos := range tree.positions {
			for i := 1; i < len(pos.Moves); i++ {
				if pos.Moves[i].totalGames() > pos.Moves[i-1].totalGames() {
					t.Errorf("position %s: move %s (%d) > move %s (%d) — not sorted",
						fen, pos.Moves[i].SAN, pos.Moves[i].totalGames(),
						pos.Moves[i-1].SAN, pos.Moves[i-1].totalGames())
				}
			}
		}
	})

	t.Run("fen_normalization_strips_clocks", func(t *testing.T) {
		for fen := range tree.positions {
			parts := strings.SplitN(fen, " ", 6)
			if len(parts) == 6 {
				if parts[4] != "0" || parts[5] != "1" {
					t.Errorf("FEN %q has non-normalized clocks: %s %s", fen, parts[4], parts[5])
				}
			}
		}
	})

	t.Run("wdl_consistency", func(t *testing.T) {
		for fen, pos := range tree.positions {
			if len(pos.Games) != pos.totalGames() {
				t.Errorf("position %s: |games| = %d but W+D+L = %d",
					fen, len(pos.Games), pos.totalGames())
			}
			for _, m := range pos.Moves {
				if len(m.Games) != m.totalGames() {
					t.Errorf("position %s move %s: |games| = %d but W+D+L = %d",
						fen, m.SAN, len(m.Games), m.totalGames())
				}
			}
		}
	})

	t.Run("move_san_matches_chess_library", func(t *testing.T) {
		// Verify that SANs stored in the tree are valid by re-parsing one game.
		pgn := splitPGNGames(string(samplePGN))[0] // Immortal Game
		reader := strings.NewReader(pgn)
		pgnFunc, err := chess.PGN(reader)
		if err != nil {
			t.Fatalf("parse PGN: %v", err)
		}
		g := chess.NewGame(pgnFunc)
		moves := g.Moves()
		positions := g.Positions()
		notation := chess.AlgebraicNotation{}

		for i, pos := range positions {
			if i >= len(moves) {
				break
			}
			expectedSAN := notation.Encode(pos, moves[i])
			treePos := tree.GetPosition(pos.String())
			if treePos == nil {
				t.Errorf("position %s not in tree", pos.String())
				continue
			}
			found := false
			for _, m := range treePos.Moves {
				if m.SAN == expectedSAN {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("position %s: expected move %s not found in tree moves",
					pos.String(), expectedSAN)
			}
		}
	})
}

// ---------------------------------------------------------------------------
// Benchmarks: various dataset sizes (using random game fixtures)
// ---------------------------------------------------------------------------

func BenchmarkIndex100Games(b *testing.B) {
	pool := generateRandomGames(100, randSeed)
	b.ResetTimer()
	for b.Loop() {
		tree := New()
		for _, g := range pool {
			_, _ = tree.IndexGame(g)
		}
	}
}

func BenchmarkIndex500Games(b *testing.B) {
	pool := generateRandomGames(500, randSeed)
	b.ResetTimer()
	for b.Loop() {
		tree := New()
		for _, g := range pool {
			_, _ = tree.IndexGame(g)
		}
	}
}

func BenchmarkIndex1000Games(b *testing.B) {
	pool := generateRandomGames(1000, randSeed)
	b.ResetTimer()
	for b.Loop() {
		tree := New()
		for _, g := range pool {
			_, _ = tree.IndexGame(g)
		}
	}
}

func BenchmarkIndex5000Games(b *testing.B) {
	pool := generateRandomGames(5000, randSeed)
	b.ResetTimer()
	for b.Loop() {
		tree := New()
		for _, g := range pool {
			_, _ = tree.IndexGame(g)
		}
	}
}

// ---------------------------------------------------------------------------
// Benchmarks: timing breakdown (parse vs build)
// ---------------------------------------------------------------------------

func BenchmarkParseOnly(b *testing.B) {
	pool := generateRandomGames(1000, randSeed)

	b.ResetTimer()
	for b.Loop() {
		for _, g := range pool {
			reader := strings.NewReader(g.PGN)
			pgnFunc, err := chess.PGN(reader)
			if err != nil {
				b.Fatal(err)
			}
			cg := chess.NewGame(pgnFunc)
			_ = cg.Moves()
			_ = cg.Positions()
		}
	}
}

func BenchmarkTreeBuildOnly(b *testing.B) {
	pool := generateRandomGames(1000, randSeed)

	// Pre-parse all games.
	type parsed struct {
		game      *game.Game
		positions []*chess.Position
		moves     []*chess.Move
		plyCount  int
	}

	var prepped []parsed
	notation := chess.AlgebraicNotation{}
	for _, g := range pool {
		reader := strings.NewReader(g.PGN)
		pgnFunc, err := chess.PGN(reader)
		if err != nil {
			b.Fatal(err)
		}
		cg := chess.NewGame(pgnFunc)
		prepped = append(prepped, parsed{
			game:      g,
			positions: cg.Positions(),
			moves:     cg.Moves(),
			plyCount:  len(cg.Moves()),
		})
	}

	b.ResetTimer()
	for b.Loop() {
		tree := New()
		for _, p := range prepped {
			if p.plyCount < MinPlyCount {
				continue
			}

			var resultKey string
			switch p.game.Result {
			case game.ResultWhite:
				resultKey = "white"
			case game.ResultBlack:
				resultKey = "black"
			default:
				resultKey = "draws"
			}

			var w, b, d int
			switch resultKey {
			case "white":
				w = 1
			case "black":
				b = 1
			default:
				d = 1
			}

			headers := make(map[string]string)
			ig := &IndexedGame{Game: p.game, PlyCount: p.plyCount, Headers: headers}
			tree.SetGame(ig)

			for i, pos := range p.positions {
				var movesSlice []*MoveData
				if i < len(p.moves) {
					san := notation.Encode(pos, p.moves[i])
					movesSlice = []*MoveData{
						{SAN: san, White: w, Black: b, Draws: d,
							Games: map[string]struct{}{p.game.URL: {}}},
					}
				}
				posData := &PositionData{
					White: w, Black: b, Draws: d,
					Games: map[string]struct{}{p.game.URL: {}},
					Moves: movesSlice,
				}
				tree.MergePosition(pos.String(), posData)
			}
		}
	}
}

func BenchmarkEndToEnd1000(b *testing.B) {
	pool := generateRandomGames(1000, randSeed)

	b.ResetTimer()
	for b.Loop() {
		tree := New()
		for _, g := range pool {
			_, _ = tree.IndexGame(g)
		}
	}
}
