package chesscom

import (
	"testing"

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

	common, err := ToGame(g, "alice")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}

	if common.Source != game.SourceChessCom {
		t.Errorf("Source = %q, want %q", common.Source, game.SourceChessCom)
	}
	if common.PlayerColor != "white" {
		t.Errorf("PlayerColor = %q, want white", common.PlayerColor)
	}
	if common.WhiteUsername != "Alice" {
		t.Errorf("WhiteUsername = %q, want Alice", common.WhiteUsername)
	}
	if common.BlackUsername != "Bob" {
		t.Errorf("BlackUsername = %q, want Bob", common.BlackUsername)
	}
	if common.WhiteRating != 1500 {
		t.Errorf("WhiteRating = %d, want 1500", common.WhiteRating)
	}
	if common.BlackRating != 1450 {
		t.Errorf("BlackRating = %d, want 1450", common.BlackRating)
	}
	if common.Result != game.ResultWhite {
		t.Errorf("Result = %q, want %q", common.Result, game.ResultWhite)
	}
	if common.TimeClass != game.TimeClassRapid {
		t.Errorf("TimeClass = %q, want %q", common.TimeClass, game.TimeClassRapid)
	}
	if !common.Rated {
		t.Error("Rated = false, want true")
	}
	if common.URL != "https://www.chess.com/game/live/12345" {
		t.Errorf("URL = %q, want https://www.chess.com/game/live/12345", common.URL)
	}
	if common.PGN != "1. e4 e5 1-0" {
		t.Errorf("PGN = %q, want '1. e4 e5 1-0'", common.PGN)
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
