package lichess

import (
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

func TestToGame(t *testing.T) {
	g := &Game{
		ID:    "abc123",
		Rated: true,
		Speed: TimeClassRapid,
		Players: Players{
			White: Player{User: &User{Name: "Alice", ID: "alice"}, Rating: 1600},
			Black: Player{User: &User{Name: "Bob", ID: "bob"}, Rating: 1580},
		},
		Winner: "white",
		PGN:    "1. e4 e5 1-0",
	}

	common, err := ToGame(g, "alice")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}

	if common.Source != game.SourceLichess {
		t.Errorf("Source = %q, want %q", common.Source, game.SourceLichess)
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
	if common.WhiteRating != 1600 {
		t.Errorf("WhiteRating = %d, want 1600", common.WhiteRating)
	}
	if common.BlackRating != 1580 {
		t.Errorf("BlackRating = %d, want 1580", common.BlackRating)
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
	if common.URL != "https://lichess.org/abc123" {
		t.Errorf("URL = %q, want https://lichess.org/abc123", common.URL)
	}
	if common.PGN != "1. e4 e5 1-0" {
		t.Errorf("PGN = %q, want '1. e4 e5 1-0'", common.PGN)
	}
}

func TestToGame_BlackWin(t *testing.T) {
	g := &Game{
		ID:    "def456",
		Speed: TimeClassBlitz,
		Players: Players{
			White: Player{User: &User{Name: "A", ID: "a"}, Rating: 1500},
			Black: Player{User: &User{Name: "B", ID: "b"}, Rating: 1500},
		},
		Winner: "black",
	}

	common, err := ToGame(g, "b")
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
		ID:    "ghi789",
		Speed: TimeClassClassical,
		Players: Players{
			White: Player{User: &User{Name: "A", ID: "a"}, Rating: 1500},
			Black: Player{User: &User{Name: "B", ID: "b"}, Rating: 1500},
		},
	}

	common, err := ToGame(g, "a")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}
	if common.Result != game.ResultDraw {
		t.Errorf("Result = %q, want %q", common.Result, game.ResultDraw)
	}
	if common.TimeClass != game.TimeClassClassical {
		t.Errorf("TimeClass = %q, want %q", common.TimeClass, game.TimeClassClassical)
	}
}

func TestToGame_UltraBulletMapsToBullet(t *testing.T) {
	g := &Game{
		ID:    "ultra1",
		Speed: TimeClassUltraBullet,
		Players: Players{
			White: Player{User: &User{Name: "A", ID: "a"}, Rating: 1500},
			Black: Player{User: &User{Name: "B", ID: "b"}, Rating: 1500},
		},
		Winner: "white",
	}

	common, err := ToGame(g, "a")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}
	if common.TimeClass != game.TimeClassBullet {
		t.Errorf("TimeClass = %q, want %q", common.TimeClass, game.TimeClassBullet)
	}
}

func TestToGame_NilUser(t *testing.T) {
	g := &Game{
		ID:    "ai1",
		Speed: TimeClassRapid,
		Players: Players{
			White: Player{User: &User{Name: "Human", ID: "human"}, Rating: 1500},
			Black: Player{Rating: 0, AILevel: 3},
		},
		Winner: "white",
	}

	common, err := ToGame(g, "human")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}
	if common.WhiteUsername != "Human" {
		t.Errorf("WhiteUsername = %q, want Human", common.WhiteUsername)
	}
	if common.BlackUsername != "" {
		t.Errorf("BlackUsername = %q, want empty", common.BlackUsername)
	}
}
