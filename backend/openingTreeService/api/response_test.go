package api

import (
	"encoding/json"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/openingtree"
)

func TestFromOpeningTree_Empty(t *testing.T) {
	tree := openingtree.New()
	resp := FromOpeningTree(tree)

	if len(resp.Positions) != 0 {
		t.Errorf("positions = %d, want 0", len(resp.Positions))
	}
	if len(resp.Games) != 0 {
		t.Errorf("games = %d, want 0", len(resp.Games))
	}
}

func TestFromOpeningTree_PositionsSerialization(t *testing.T) {
	tree := openingtree.New()

	g := &game.Game{
		URL:           "https://example.com/game1",
		Result:        game.ResultWhite,
		Source:        game.SourceChessCom,
		PlayerColor:   "white",
		WhiteUsername:  "alice",
		BlackUsername:  "bob",
		WhiteRating:   1500,
		BlackRating:   1400,
		TimeClass:     game.TimeClassBlitz,
		Rated:         true,
		PGN: `[Event "Test"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`,
	}
	ok, err := tree.IndexGame(g)
	if err != nil {
		t.Fatalf("IndexGame error: %v", err)
	}
	if !ok {
		t.Fatal("IndexGame returned false")
	}

	resp := FromOpeningTree(tree)

	// Check the starting position exists.
	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	pos, ok := resp.Positions[startFEN]
	if !ok {
		t.Fatalf("starting position not found in response")
	}
	if pos.White != 1 || pos.Black != 0 || pos.Draws != 0 {
		t.Errorf("W/B/D = %d/%d/%d, want 1/0/0", pos.White, pos.Black, pos.Draws)
	}
	if len(pos.Moves) != 1 || pos.Moves[0].SAN != "e4" {
		t.Errorf("moves = %v, want [e4]", pos.Moves)
	}
	if len(pos.Games) != 1 || pos.Games[0] != g.URL {
		t.Errorf("games = %v, want [%s]", pos.Games, g.URL)
	}
}

func TestFromOpeningTree_GamesSerialization(t *testing.T) {
	tree := openingtree.New()

	g := &game.Game{
		URL:           "https://example.com/game1",
		Result:        game.ResultWhite,
		Source:        game.SourceLichess,
		PlayerColor:   "white",
		WhiteUsername:  "alice",
		BlackUsername:  "bob",
		WhiteRating:   1800,
		BlackRating:   1750,
		TimeClass:     game.TimeClassRapid,
		Rated:         true,
		PGN: `[Event "Test"]
[Result "1-0"]

1. d4 d5 2. c4 e6 1-0`,
	}
	tree.IndexGame(g)

	resp := FromOpeningTree(tree)

	gm, ok := resp.Games[g.URL]
	if !ok {
		t.Fatalf("game %s not found in response", g.URL)
	}
	if gm.Source.Type != "lichess" {
		t.Errorf("source.type = %q, want %q", gm.Source.Type, "lichess")
	}
	if gm.PlayerColor != "white" {
		t.Errorf("playerColor = %q, want %q", gm.PlayerColor, "white")
	}
	if gm.White != "alice" {
		t.Errorf("white = %q, want %q", gm.White, "alice")
	}
	if gm.Black != "bob" {
		t.Errorf("black = %q, want %q", gm.Black, "bob")
	}
	if gm.WhiteElo != 1800 {
		t.Errorf("whiteElo = %d, want 1800", gm.WhiteElo)
	}
	if gm.BlackElo != 1750 {
		t.Errorf("blackElo = %d, want 1750", gm.BlackElo)
	}
	if gm.Result != "1-0" {
		t.Errorf("result = %q, want %q", gm.Result, "1-0")
	}
	if gm.PlyCount != 4 {
		t.Errorf("plyCount = %d, want 4", gm.PlyCount)
	}
	if !gm.Rated {
		t.Error("rated = false, want true")
	}
	if gm.URL != g.URL {
		t.Errorf("url = %q, want %q", gm.URL, g.URL)
	}
	if gm.TimeClass != "rapid" {
		t.Errorf("timeClass = %q, want %q", gm.TimeClass, "rapid")
	}
	if gm.Headers == nil {
		t.Fatal("headers is nil")
	}
	if gm.Headers["Event"] != "Test" {
		t.Errorf("headers[Event] = %q, want %q", gm.Headers["Event"], "Test")
	}
}

func TestFromOpeningTree_MoveDataSerialization(t *testing.T) {
	tree := openingtree.New()

	// Index two games: one with 1. e4, one with 1. d4.
	g1 := &game.Game{
		URL: "g1", Result: game.ResultWhite, Source: game.SourceChessCom,
		PGN: "[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 Nc6 1-0",
	}
	g2 := &game.Game{
		URL: "g2", Result: game.ResultBlack, Source: game.SourceChessCom,
		PGN: "[Result \"0-1\"]\n\n1. d4 d5 2. c4 e6 0-1",
	}
	tree.IndexGame(g1)
	tree.IndexGame(g2)

	resp := FromOpeningTree(tree)

	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	pos := resp.Positions[startFEN]
	if pos == nil {
		t.Fatal("starting position not found")
	}

	if len(pos.Moves) != 2 {
		t.Fatalf("moves count = %d, want 2", len(pos.Moves))
	}

	// Both moves should have exactly 1 game each.
	for _, m := range pos.Moves {
		total := m.White + m.Black + m.Draws
		if total != 1 {
			t.Errorf("move %s total = %d, want 1", m.SAN, total)
		}
		if len(m.Games) != 1 {
			t.Errorf("move %s games count = %d, want 1", m.SAN, len(m.Games))
		}
	}
}

func TestFromOpeningTree_JSONFieldNames(t *testing.T) {
	tree := openingtree.New()

	g := &game.Game{
		URL:           "https://example.com/g",
		Result:        game.ResultDraw,
		Source:        game.SourceChessCom,
		PlayerColor:   "black",
		WhiteUsername:  "w",
		BlackUsername:  "b",
		WhiteRating:   1000,
		BlackRating:   1100,
		TimeClass:     game.TimeClassBullet,
		Rated:         false,
		PGN: `[Event "X"]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 1/2-1/2`,
	}
	tree.IndexGame(g)

	resp := FromOpeningTree(tree)
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("json.Marshal error: %v", err)
	}

	// Unmarshal into a generic map to verify JSON key names.
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("json.Unmarshal error: %v", err)
	}

	// Top-level keys must be "positions" and "games".
	for _, key := range []string{"positions", "games"} {
		if _, ok := raw[key]; !ok {
			t.Errorf("missing top-level key %q", key)
		}
	}

	// Verify game field names are camelCase.
	var gamesMap map[string]json.RawMessage
	json.Unmarshal(raw["games"], &gamesMap)
	var gameRaw map[string]json.RawMessage
	json.Unmarshal(gamesMap[g.URL], &gameRaw)

	expectedGameKeys := []string{
		"source", "playerColor", "white", "black",
		"whiteElo", "blackElo", "result", "plyCount",
		"rated", "url", "headers", "timeClass",
	}
	for _, key := range expectedGameKeys {
		if _, ok := gameRaw[key]; !ok {
			t.Errorf("game missing key %q", key)
		}
	}

	// Verify position field names.
	var posMap map[string]json.RawMessage
	json.Unmarshal(raw["positions"], &posMap)
	// Pick any position.
	for _, posRaw := range posMap {
		var pos map[string]json.RawMessage
		json.Unmarshal(posRaw, &pos)
		for _, key := range []string{"white", "black", "draws", "moves", "games"} {
			if _, ok := pos[key]; !ok {
				t.Errorf("position missing key %q", key)
			}
		}
		break
	}

	// Verify move field names.
	var positions map[string]json.RawMessage
	json.Unmarshal(raw["positions"], &positions)
	for _, posRaw := range positions {
		var pos struct {
			Moves []json.RawMessage `json:"moves"`
		}
		json.Unmarshal(posRaw, &pos)
		if len(pos.Moves) > 0 {
			var moveRaw map[string]json.RawMessage
			json.Unmarshal(pos.Moves[0], &moveRaw)
			for _, key := range []string{"san", "white", "black", "draws", "games"} {
				if _, ok := moveRaw[key]; !ok {
					t.Errorf("move missing key %q", key)
				}
			}
			break
		}
	}

	// Verify source has "type" key.
	var sourceRaw map[string]json.RawMessage
	json.Unmarshal(gameRaw["source"], &sourceRaw)
	if _, ok := sourceRaw["type"]; !ok {
		t.Error("source missing key \"type\"")
	}
}

func TestFromOpeningTree_GamesAsArrayNotObject(t *testing.T) {
	tree := openingtree.New()

	g := &game.Game{
		URL: "url1", Result: game.ResultWhite, Source: game.SourceChessCom,
		PGN: "[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 Nc6 1-0",
	}
	tree.IndexGame(g)

	resp := FromOpeningTree(tree)
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("json.Marshal error: %v", err)
	}

	// The "games" field inside positions should be a JSON array, not an object.
	var parsed struct {
		Positions map[string]struct {
			Games []string `json:"games"`
			Moves []struct {
				Games []string `json:"games"`
			} `json:"moves"`
		} `json:"positions"`
	}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	for fen, pos := range parsed.Positions {
		if pos.Games == nil {
			t.Errorf("position %s: games is nil, want array", fen)
		}
		for i, m := range pos.Moves {
			if m.Games == nil {
				t.Errorf("position %s move %d: games is nil, want array", fen, i)
			}
		}
	}
}

func TestSortedKeys(t *testing.T) {
	m := map[string]struct{}{
		"c": {},
		"a": {},
		"b": {},
	}
	got := sortedKeys(m)
	want := []string{"a", "b", "c"}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("got[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestSortedKeys_Empty(t *testing.T) {
	got := sortedKeys(map[string]struct{}{})
	if len(got) != 0 {
		t.Errorf("len = %d, want 0", len(got))
	}
}
