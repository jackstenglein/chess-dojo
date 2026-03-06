package chessbench

import (
	"strings"
	"testing"

	corentings "github.com/corentings/chess"
	notnil "github.com/notnil/chess"
)

var correctnessTests = []struct {
	name     string
	pgn      string
	finalFEN string // Expected FEN board part (before first space)
}{
	{
		name:     "scholars_mate",
		pgn:      "[Result \"1-0\"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0",
		finalFEN: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR",
	},
	{
		name:     "starting_position",
		pgn:      "[Result \"*\"]\n\n*",
		finalFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
	},
	{
		name:     "italian_game_4_moves",
		pgn:      "[Result \"*\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 *",
		finalFEN: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R",
	},
}

func fenBoard(fen string) string {
	return strings.Split(fen, " ")[0]
}

func TestCorrectness_Notnil(t *testing.T) {
	for _, tc := range correctnessTests {
		t.Run(tc.name, func(t *testing.T) {
			pgn, err := notnil.PGN(strings.NewReader(tc.pgn))
			if err != nil {
				t.Fatal(err)
			}
			game := notnil.NewGame(pgn)
			got := fenBoard(game.Position().String())
			if got != tc.finalFEN {
				t.Errorf("FEN mismatch\n  got:  %s\n  want: %s", got, tc.finalFEN)
			}
		})
	}
}

func TestCorrectness_Corentings(t *testing.T) {
	for _, tc := range correctnessTests {
		t.Run(tc.name, func(t *testing.T) {
			pgn, err := corentings.PGN(strings.NewReader(tc.pgn))
			if err != nil {
				t.Fatal(err)
			}
			game := corentings.NewGame(pgn)
			got := fenBoard(game.Position().String())
			if got != tc.finalFEN {
				t.Errorf("FEN mismatch\n  got:  %s\n  want: %s", got, tc.finalFEN)
			}
		})
	}
}

func TestSamplePGN_BothLibrariesAgree(t *testing.T) {
	// Parse with notnil
	notnilScanner := notnil.NewScanner(strings.NewReader(string(samplePGN)))
	var notnilFENs [][]string
	for notnilScanner.Scan() {
		game := notnilScanner.Next()
		var fens []string
		for _, pos := range game.Positions() {
			fens = append(fens, pos.String())
		}
		notnilFENs = append(notnilFENs, fens)
	}

	// Parse with corentings
	corentingsScanner := corentings.NewScanner(strings.NewReader(string(samplePGN)))
	var corentingsFENs [][]string
	for corentingsScanner.Scan() {
		game := corentingsScanner.Next()
		var fens []string
		for _, pos := range game.Positions() {
			fens = append(fens, pos.String())
		}
		corentingsFENs = append(corentingsFENs, fens)
	}

	if len(notnilFENs) != len(corentingsFENs) {
		t.Fatalf("game count mismatch: notnil=%d corentings=%d", len(notnilFENs), len(corentingsFENs))
	}

	for i := range notnilFENs {
		if len(notnilFENs[i]) != len(corentingsFENs[i]) {
			t.Errorf("game %d: position count mismatch: notnil=%d corentings=%d",
				i, len(notnilFENs[i]), len(corentingsFENs[i]))
			continue
		}
		for j := range notnilFENs[i] {
			if notnilFENs[i][j] != corentingsFENs[i][j] {
				t.Errorf("game %d, position %d: FEN mismatch\n  notnil:     %s\n  corentings: %s",
					i, j, notnilFENs[i][j], corentingsFENs[i][j])
			}
		}
	}
	t.Logf("Both libraries agree on all %d games, all positions match", len(notnilFENs))
}
