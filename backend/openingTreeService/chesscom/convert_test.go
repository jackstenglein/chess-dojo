package chesscom

import (
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

func TestToGame(t *testing.T) {
	g := &Game{
		URL:       "https://www.chess.com/game/live/12345",
		PGN:       "1. e4 e5 1-0",
		TimeClass: TimeClassRapid,
		Rated:     true,
		Rules:     "chess",
		White:     Player{Username: "Alice", Rating: 1500, Result: PlayerResultWin},
		Black:     Player{Username: "Bob", Rating: 1450, Result: PlayerResultCheckmated},
	}

	got, err := ToGame(g, "alice")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}

	want := game.Game{
		Source:        game.SourceChessCom,
		PlayerColor:   "white",
		WhiteUsername: "Alice",
		BlackUsername: "Bob",
		WhiteRating:   1500,
		BlackRating:   1450,
		Result:        game.ResultWhite,
		TimeClass:     game.TimeClassRapid,
		Rated:         true,
		URL:           "https://www.chess.com/game/live/12345",
		PGN:           "1. e4 e5 1-0",
		EndTime:       time.Unix(0, 0),
	}

	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("ToGame mismatch (-want +got):\n%s", diff)
	}
}

func TestToGame_DailyMapsToCorrespondence(t *testing.T) {
	g := &Game{
		TimeClass: TimeClassDaily,
		White:     Player{Username: "A", Result: PlayerResultWin},
		Black:     Player{Username: "B", Result: PlayerResultResigned},
	}

	common, err := ToGame(g, "A")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}
	if common.TimeClass != game.TimeClassCorrespondence {
		t.Errorf("TimeClass = %q, want %q", common.TimeClass, game.TimeClassCorrespondence)
	}
}

func TestToGame_BlackWin(t *testing.T) {
	g := &Game{
		White: Player{Username: "A", Result: PlayerResultCheckmated},
		Black: Player{Username: "B", Result: PlayerResultWin},
	}

	common, err := ToGame(g, "B")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}
	if common.Result != game.ResultBlack {
		t.Errorf("Result = %q, want %q", common.Result, game.ResultBlack)
	}
	if common.PlayerColor != "black" {
		t.Errorf("PlayerColor = %q, want black", common.PlayerColor)
	}
}

func TestToGame_Draw(t *testing.T) {
	g := &Game{
		White: Player{Username: "A", Result: PlayerResultStalemate},
		Black: Player{Username: "B", Result: PlayerResultStalemate},
	}

	common, err := ToGame(g, "A")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}
	if common.Result != game.ResultDraw {
		t.Errorf("Result = %q, want %q", common.Result, game.ResultDraw)
	}
}
