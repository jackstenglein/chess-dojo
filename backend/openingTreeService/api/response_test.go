package api

import (
	"encoding/json"
	"flag"
	"os"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/openingtree"
)

var updateGolden = flag.Bool("update", false, "update golden files")

func TestFromOpeningTree(t *testing.T) {
	t.Parallel()

	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	cmpOpts := cmp.Options{cmpopts.EquateEmpty()}

	tests := []struct {
		name  string
		games []*game.Game
		check func(t *testing.T, resp *Response)
	}{
		{
			name:  "empty tree",
			games: nil,
			check: func(t *testing.T, resp *Response) {
				t.Helper()
				if diff := cmp.Diff(&Response{
					Positions: map[string]*Position{},
					Games:     map[string]*Game{},
				}, resp, cmpOpts); diff != "" {
					t.Errorf("response mismatch (-want +got):\n%s", diff)
				}
			},
		},
		{
			name: "positions serialization",
			games: []*game.Game{{
				URL:          "https://example.com/game1",
				Result:       game.ResultWhite,
				Source:       game.SourceChesscom,
				PlayerColor:  "white",
				WhiteUsername: "alice",
				BlackUsername: "bob",
				WhiteRating:  1500,
				BlackRating:  1400,
				TimeClass:    game.TimeClassBlitz,
				Rated:        true,
				PGN: `[Event "Test"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`,
			}},
			check: func(t *testing.T, resp *Response) {
				t.Helper()
				pos, ok := resp.Positions[startFEN]
				if !ok {
					t.Fatal("starting position not found")
				}
				want := &Position{
					White: 1, Black: 0, Draws: 0,
					Moves: []*Move{{SAN: "e4", White: 1, Games: []string{"https://example.com/game1"}}},
					Games: []string{"https://example.com/game1"},
				}
				if diff := cmp.Diff(want, pos, cmpOpts); diff != "" {
					t.Errorf("starting position mismatch (-want +got):\n%s", diff)
				}
			},
		},
		{
			name: "games serialization",
			games: []*game.Game{{
				URL:          "https://example.com/game1",
				Result:       game.ResultWhite,
				Source:       game.SourceLichess,
				PlayerColor:  "white",
				WhiteUsername: "alice",
				BlackUsername: "bob",
				WhiteRating:  1800,
				BlackRating:  1750,
				TimeClass:    game.TimeClassRapid,
				Rated:        true,
				PGN: `[Event "Test"]
[Result "1-0"]

1. d4 d5 2. c4 e6 1-0`,
			}},
			check: func(t *testing.T, resp *Response) {
				t.Helper()
				url := "https://example.com/game1"
				gm, ok := resp.Games[url]
				if !ok {
					t.Fatalf("game %s not found", url)
				}
				want := &Game{
					Source:      Source{Type: "lichess"},
					PlayerColor: "white",
					White:       "alice",
					Black:       "bob",
					WhiteElo:    1800,
					BlackElo:    1750,
					Result:      "1-0",
					PlyCount:    4,
					Rated:       true,
					URL:         url,
					TimeClass:   "rapid",
					Headers:     map[string]string{"Event": "Test", "Result": "1-0"},
				}
				if diff := cmp.Diff(want, gm, cmpOpts); diff != "" {
					t.Errorf("game mismatch (-want +got):\n%s", diff)
				}
			},
		},
		{
			name: "move data with multiple games",
			games: []*game.Game{
				{
					URL: "g1", Result: game.ResultWhite, Source: game.SourceChesscom,
					PGN: "[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 Nc6 1-0",
				},
				{
					URL: "g2", Result: game.ResultBlack, Source: game.SourceChesscom,
					PGN: "[Result \"0-1\"]\n\n1. d4 d5 2. c4 e6 0-1",
				},
			},
			check: func(t *testing.T, resp *Response) {
				t.Helper()
				pos := resp.Positions[startFEN]
				if pos == nil {
					t.Fatal("starting position not found")
				}
				if len(pos.Moves) != 2 {
					t.Fatalf("moves count = %d, want 2", len(pos.Moves))
				}
				for _, m := range pos.Moves {
					total := m.White + m.Black + m.Draws
					if total != 1 {
						t.Errorf("move %s total = %d, want 1", m.SAN, total)
					}
					if diff := cmp.Diff(1, len(m.Games)); diff != "" {
						t.Errorf("move %s games count mismatch (-want +got):\n%s", m.SAN, diff)
					}
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			tree := openingtree.New()
			for _, g := range tc.games {
				if _, err := tree.IndexGame(g); err != nil {
					t.Fatalf("IndexGame error: %v", err)
				}
			}
			resp := FromOpeningTree(tree)
			tc.check(t, resp)
		})
	}
}

func TestFromOpeningTree_RoundTrip(t *testing.T) {
	t.Parallel()

	tree := openingtree.New()
	g := &game.Game{
		URL:          "https://example.com/round-trip",
		Result:       game.ResultWhite,
		Source:       game.SourceLichess,
		PlayerColor:  "white",
		WhiteUsername: "alice",
		BlackUsername: "bob",
		WhiteRating:  1600,
		BlackRating:  1550,
		TimeClass:    game.TimeClassBlitz,
		Rated:        true,
		PGN: `[Event "RT"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`,
	}
	if _, err := tree.IndexGame(g); err != nil {
		t.Fatalf("IndexGame error: %v", err)
	}

	resp := FromOpeningTree(tree)
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("json.Marshal error: %v", err)
	}

	var roundTripped Response
	if err := json.Unmarshal(data, &roundTripped); err != nil {
		t.Fatalf("json.Unmarshal error: %v", err)
	}

	cmpOpts := cmp.Options{cmpopts.EquateEmpty()}
	if diff := cmp.Diff(resp, &roundTripped, cmpOpts); diff != "" {
		t.Errorf("round trip mismatch (-original +deserialized):\n%s", diff)
	}
}

func TestSortedKeys(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input map[string]struct{}
		want  []string
	}{
		{
			name:  "sorted output",
			input: map[string]struct{}{"c": {}, "a": {}, "b": {}},
			want:  []string{"a", "b", "c"},
		},
		{
			name:  "empty map",
			input: map[string]struct{}{},
			want:  nil,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := sortedKeys(tc.input)
			if diff := cmp.Diff(tc.want, got, cmpopts.EquateEmpty()); diff != "" {
				t.Errorf("sortedKeys mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

// TestGoldenContract serializes a known Response to JSON and compares it against
// the golden file testdata/contract.golden.json. If the wire format changes, this
// test fails. Run with -update to regenerate: go test -run TestGoldenContract -update
func TestGoldenContract(t *testing.T) {
	t.Parallel()

	tree := openingtree.New()
	g := &game.Game{
		URL:          "https://lichess.org/contract1",
		Result:       game.ResultWhite,
		Source:       game.SourceLichess,
		PlayerColor:  "white",
		WhiteUsername: "alice",
		BlackUsername: "bob",
		WhiteRating:  1800,
		BlackRating:  1750,
		TimeClass:    game.TimeClassBlitz,
		Rated:        true,
		PGN: `[Event "Contract Test"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`,
	}
	if _, err := tree.IndexGame(g); err != nil {
		t.Fatalf("IndexGame error: %v", err)
	}

	resp := FromOpeningTree(tree)
	got, err := json.MarshalIndent(resp, "", "  ")
	if err != nil {
		t.Fatalf("json.MarshalIndent error: %v", err)
	}

	goldenPath := "testdata/contract.golden.json"

	if *updateGolden {
		if err := os.WriteFile(goldenPath, append(got, '\n'), 0644); err != nil {
			t.Fatalf("failed to update golden file: %v", err)
		}
		t.Log("updated golden file")
		return
	}

	want, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("failed to read golden file (run with -update to create): %v", err)
	}

	if string(got) != string(trimTrailingNewline(want)) {
		t.Errorf("wire format drift detected!\n\nRun: go test -run TestGoldenContract -update\n\nGot:\n%s\n\nWant:\n%s", string(got), string(want))
	}
}

func trimTrailingNewline(b []byte) []byte {
	for len(b) > 0 && (b[len(b)-1] == '\n' || b[len(b)-1] == '\r') {
		b = b[:len(b)-1]
	}
	return b
}
