package lichess

import (
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

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

	got, err := ToGame(g, "alice")
	if err != nil {
		t.Fatalf("ToGame error: %v", err)
	}

	want := game.Game{
		Source:        game.SourceLichess,
		PlayerColor:   "white",
		WhiteUsername: "Alice",
		BlackUsername: "Bob",
		WhiteRating:   1600,
		BlackRating:   1580,
		Result:        game.ResultWhite,
		TimeClass:     game.TimeClassRapid,
		Rated:         true,
		URL:           "https://lichess.org/abc123",
		PGN:           "1. e4 e5 1-0",
		EndTime:       time.UnixMilli(0),
	}

	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("ToGame mismatch (-want +got):\n%s", diff)
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
