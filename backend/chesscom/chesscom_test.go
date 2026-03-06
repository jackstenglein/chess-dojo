package chesscom

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func mustReadFile(t *testing.T, path string) []byte {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read %s: %v", path, err)
	}
	return data
}

func newTestServer(t *testing.T, archivesFile, gamesFile string) *httptest.Server {
	t.Helper()
	archives := mustReadFile(t, archivesFile)
	games := mustReadFile(t, gamesFile)

	mux := http.NewServeMux()
	mux.HandleFunc("/pub/player/testuser/games/archives", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(archives)
	})
	// Serve the same games fixture for any archive month.
	mux.HandleFunc("/pub/player/testuser/games/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(games)
	})
	return httptest.NewServer(mux)
}

func TestFetchArchives(t *testing.T) {
	archives := mustReadFile(t, "testdata/archives.json")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(archives)
	}))
	defer srv.Close()

	// Override baseURL by using a client that hits the test server.
	client := NewClientWithHTTP(srv.Client())
	// We need to call the test server URL directly, so we test the low-level method.
	body, err := client.doGet(context.Background(), srv.URL+"/pub/player/testuser/games/archives")
	if err != nil {
		t.Fatalf("doGet failed: %v", err)
	}
	body.Close()
}

func TestFetchGames(t *testing.T) {
	games := mustReadFile(t, "testdata/games.json")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(games)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	result, err := client.FetchGames(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("FetchGames failed: %v", err)
	}

	if len(result) != 4 {
		t.Fatalf("expected 4 games, got %d", len(result))
	}

	// Verify first game metadata.
	g := result[0]
	if g.URL != "https://www.chess.com/game/live/12345" {
		t.Errorf("unexpected URL: %s", g.URL)
	}
	if g.White.Username != "TestUser" {
		t.Errorf("unexpected white username: %s", g.White.Username)
	}
	if g.White.Rating != 1500 {
		t.Errorf("unexpected white rating: %d", g.White.Rating)
	}
	if g.Black.Rating != 1450 {
		t.Errorf("unexpected black rating: %d", g.Black.Rating)
	}
	if g.TimeClass != TimeClassRapid {
		t.Errorf("unexpected time class: %s", g.TimeClass)
	}
	if !g.Rated {
		t.Error("expected game to be rated")
	}
	if !g.IsStandard() {
		t.Error("expected game to be standard")
	}
}

func TestGameResult(t *testing.T) {
	games := mustReadFile(t, "testdata/games.json")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(games)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	result, err := client.FetchGames(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("FetchGames failed: %v", err)
	}

	tests := []struct {
		idx      int
		expected GameResult
	}{
		{0, ResultWhite}, // white wins
		{1, ResultBlack}, // black wins
		{2, ResultDraw},  // draw
		{3, ResultWhite}, // white wins (chess960, but Result still works)
	}

	for _, tt := range tests {
		got := result[tt.idx].Result()
		if got != tt.expected {
			t.Errorf("game %d: expected result %s, got %s", tt.idx, tt.expected, got)
		}
	}
}

func TestPlayerColor(t *testing.T) {
	games := mustReadFile(t, "testdata/games.json")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(games)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	result, err := client.FetchGames(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("FetchGames failed: %v", err)
	}

	// Game 0: TestUser is white (case-insensitive match).
	if color := result[0].PlayerColor("testuser"); color != "white" {
		t.Errorf("expected white, got %s", color)
	}
	// Game 1: TestUser is black.
	if color := result[1].PlayerColor("testuser"); color != "black" {
		t.Errorf("expected black, got %s", color)
	}
}

func TestIsStandard(t *testing.T) {
	games := mustReadFile(t, "testdata/games.json")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(games)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	result, err := client.FetchGames(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("FetchGames failed: %v", err)
	}

	// Games 0-2 are standard, game 3 is chess960.
	for i := 0; i < 3; i++ {
		if !result[i].IsStandard() {
			t.Errorf("game %d: expected standard", i)
		}
	}
	if result[3].IsStandard() {
		t.Error("game 3: expected non-standard (chess960)")
	}
}

func TestFilterArchives(t *testing.T) {
	archives := []string{
		"https://api.chess.com/pub/player/testuser/games/2023/11",
		"https://api.chess.com/pub/player/testuser/games/2023/12",
		"https://api.chess.com/pub/player/testuser/games/2024/01",
		"https://api.chess.com/pub/player/testuser/games/2024/02",
	}

	tests := []struct {
		name     string
		since    time.Time
		until    time.Time
		expected int
	}{
		{
			name:     "no bounds",
			expected: 4,
		},
		{
			name:     "since 2024-01",
			since:    time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			expected: 2,
		},
		{
			name:     "until 2023-12",
			until:    time.Date(2023, 12, 31, 23, 59, 59, 0, time.UTC),
			expected: 2,
		},
		{
			name:     "since and until same month",
			since:    time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			until:    time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC),
			expected: 1,
		},
		{
			name:     "future range returns none",
			since:    time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterArchives(archives, tt.since, tt.until)
			if len(result) != tt.expected {
				t.Errorf("expected %d archives, got %d: %v", tt.expected, len(result), result)
			}
		})
	}
}

func TestRateLimitHandling(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	_, err := client.FetchGames(context.Background(), srv.URL)
	if err == nil {
		t.Fatal("expected error for rate limited request")
	}
	if got := err.Error(); !contains(got, "429") {
		t.Errorf("expected rate limit error, got: %s", got)
	}
}

func TestNotFoundHandling(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	_, err := client.FetchGames(context.Background(), srv.URL)
	if err == nil {
		t.Fatal("expected error for 404 response")
	}
	if got := err.Error(); !contains(got, "404") {
		t.Errorf("expected 404 error, got: %s", got)
	}
}

func TestContextCancellation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(5 * time.Second)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately.

	_, err := client.FetchGames(ctx, srv.URL)
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestPGNExtracted(t *testing.T) {
	games := mustReadFile(t, "testdata/games.json")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(games)
	}))
	defer srv.Close()

	client := NewClientWithHTTP(srv.Client())
	result, err := client.FetchGames(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("FetchGames failed: %v", err)
	}

	// Verify PGN is present and contains expected header.
	if !contains(result[0].PGN, "[Event \"Live Chess\"]") {
		t.Errorf("expected PGN to contain Event header, got: %s", result[0].PGN[:80])
	}
	if !contains(result[0].PGN, "1. e4 e5") {
		t.Errorf("expected PGN to contain moves, got: %s", result[0].PGN)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
