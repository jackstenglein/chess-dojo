package lichess

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func loadFixture(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("testdata/games.ndjson")
	if err != nil {
		t.Fatalf("reading fixture: %v", err)
	}
	return data
}

func TestFetchGames_AllGames(t *testing.T) {
	fixture := loadFixture(t)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Accept"); got != "application/x-ndjson" {
			t.Errorf("Accept header = %q, want application/x-ndjson", got)
		}
		if r.URL.Path != "/api/games/user/testplayer" {
			t.Errorf("path = %q, want /api/games/user/testplayer", r.URL.Path)
		}
		if r.URL.Query().Get("pgnInJson") != "true" {
			t.Errorf("pgnInJson = %q, want true", r.URL.Query().Get("pgnInJson"))
		}
		w.Header().Set("Content-Type", "application/x-ndjson")
		w.Write(fixture)
	}))
	defer srv.Close()

	client := newTestClient(srv)
	games, errc := client.FetchGames(context.Background(), FetchParams{
		Username:  "testplayer",
		PGNInJSON: true,
	})

	var collected []Game
	for g := range games {
		collected = append(collected, g)
	}
	if err := <-errc; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := len(collected); got != 5 {
		t.Fatalf("got %d games, want 5", got)
	}

	// Verify first game fields
	g := collected[0]
	if g.ID != "game001" {
		t.Errorf("ID = %q, want game001", g.ID)
	}
	if !g.Rated {
		t.Error("Rated = false, want true")
	}
	if g.Speed != TimeClassRapid {
		t.Errorf("Speed = %q, want rapid", g.Speed)
	}
	if g.Players.White.Rating != 1600 {
		t.Errorf("White rating = %d, want 1600", g.Players.White.Rating)
	}
	if g.Players.Black.Rating != 1580 {
		t.Errorf("Black rating = %d, want 1580", g.Players.Black.Rating)
	}
	if g.Winner != "white" {
		t.Errorf("Winner = %q, want white", g.Winner)
	}
	if g.Result() != "1-0" {
		t.Errorf("Result() = %q, want 1-0", g.Result())
	}
	if g.PlayerColor("TestPlayer") != "white" {
		t.Errorf("PlayerColor(TestPlayer) = %q, want white", g.PlayerColor("TestPlayer"))
	}
	if g.URL() != "https://lichess.org/game001" {
		t.Errorf("URL() = %q, want https://lichess.org/game001", g.URL())
	}
	if g.PGN == "" {
		t.Error("PGN is empty")
	}
	if g.Opening.ECO != "C50" {
		t.Errorf("Opening.ECO = %q, want C50", g.Opening.ECO)
	}
	if g.Clock.Initial != 600 {
		t.Errorf("Clock.Initial = %d, want 600", g.Clock.Initial)
	}
}

func TestFetchGames_WithMax(t *testing.T) {
	fixture := loadFixture(t)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("max") != "2" {
			t.Errorf("max = %q, want 2", r.URL.Query().Get("max"))
		}
		w.Header().Set("Content-Type", "application/x-ndjson")
		w.Write(fixture)
	}))
	defer srv.Close()

	client := newTestClient(srv)
	games, errc := client.FetchGames(context.Background(), FetchParams{
		Username:  "testplayer",
		Max:       2,
		PGNInJSON: true,
	})

	var collected []Game
	for g := range games {
		collected = append(collected, g)
	}
	if err := <-errc; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := len(collected); got != 2 {
		t.Fatalf("got %d games, want 2 (client-side max)", got)
	}
}

func TestFetchGames_DrawResult(t *testing.T) {
	fixture := loadFixture(t)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		w.Write(fixture)
	}))
	defer srv.Close()

	client := newTestClient(srv)
	games, errc := client.FetchGames(context.Background(), FetchParams{
		Username:  "testplayer",
		PGNInJSON: true,
	})

	var collected []Game
	for g := range games {
		collected = append(collected, g)
	}
	if err := <-errc; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// game003 is a draw
	g := collected[2]
	if g.ID != "game003" {
		t.Fatalf("expected game003, got %s", g.ID)
	}
	if g.Result() != "1/2-1/2" {
		t.Errorf("Result() = %q, want 1/2-1/2", g.Result())
	}
	if g.Speed != TimeClassBlitz {
		t.Errorf("Speed = %q, want blitz", g.Speed)
	}
}

func TestFetchGames_PlayerColorBlack(t *testing.T) {
	fixture := loadFixture(t)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		w.Write(fixture)
	}))
	defer srv.Close()

	client := newTestClient(srv)
	games, errc := client.FetchGames(context.Background(), FetchParams{
		Username:  "testplayer",
		PGNInJSON: true,
	})

	var collected []Game
	for g := range games {
		collected = append(collected, g)
	}
	if err := <-errc; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// game002: TestPlayer is black
	g := collected[1]
	if g.PlayerColor("testplayer") != "black" {
		t.Errorf("PlayerColor(testplayer) = %q, want black", g.PlayerColor("testplayer"))
	}
}

func TestFetchGames_ContextCancellation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		// Write one game then block
		w.Write([]byte(`{"id":"slow1","rated":true,"variant":"standard","speed":"rapid","perf":"rapid","createdAt":1706400000000,"lastMoveAt":1706403600000,"status":"resign","players":{"white":{"user":{"name":"A","id":"a"},"rating":1500},"black":{"user":{"name":"B","id":"b"},"rating":1500}},"winner":"white","opening":{"eco":"C50","name":"Italian","ply":6},"moves":"e4 e5","clock":{"initial":600,"increment":0,"totalTime":600},"pgn":"1. e4 e5 1-0"}` + "\n"))
		w.(http.Flusher).Flush()
		// Block until client cancels
		<-r.Context().Done()
	}))
	defer srv.Close()

	client := newTestClient(srv)
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	games, errc := client.FetchGames(ctx, FetchParams{
		Username:  "slowuser",
		PGNInJSON: true,
	})

	var count int
	for range games {
		count++
	}
	err := <-errc
	// Should get context error (deadline exceeded or canceled)
	if err == nil {
		t.Fatal("expected context error, got nil")
	}
	if count != 1 {
		t.Errorf("got %d games before cancel, want 1", count)
	}
}

func TestFetchGames_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	client := newTestClient(srv)
	games, errc := client.FetchGames(context.Background(), FetchParams{
		Username:  "nonexistent",
		PGNInJSON: true,
	})

	for range games {
		t.Fatal("expected no games")
	}

	err := <-errc
	if err == nil {
		t.Fatal("expected error for 404 response")
	}
}

func TestFetchGames_EmptyResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		// Empty body
	}))
	defer srv.Close()

	client := newTestClient(srv)
	games, errc := client.FetchGames(context.Background(), FetchParams{
		Username:  "newuser",
		PGNInJSON: true,
	})

	var count int
	for range games {
		count++
	}
	if err := <-errc; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 0 {
		t.Errorf("got %d games, want 0", count)
	}
}

func TestFetchGames_BlankLines(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		// NDJSON with blank lines between games
		w.Write([]byte("\n"))
		w.Write([]byte(`{"id":"g1","rated":false,"variant":"standard","speed":"blitz","perf":"blitz","createdAt":1706400000000,"lastMoveAt":1706403600000,"status":"draw","players":{"white":{"user":{"name":"A","id":"a"},"rating":1500},"black":{"user":{"name":"B","id":"b"},"rating":1500}},"opening":{"eco":"A00","name":"Test","ply":2},"moves":"e4 e5","clock":{"initial":180,"increment":0,"totalTime":180},"pgn":"1. e4 e5 1/2-1/2"}` + "\n"))
		w.Write([]byte("\n"))
		w.Write([]byte("\n"))
	}))
	defer srv.Close()

	client := newTestClient(srv)
	games, errc := client.FetchGames(context.Background(), FetchParams{
		Username:  "user",
		PGNInJSON: true,
	})

	var count int
	for range games {
		count++
	}
	if err := <-errc; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 1 {
		t.Errorf("got %d games, want 1 (blank lines should be skipped)", count)
	}
}

func TestBuildURL(t *testing.T) {
	client := &Client{HTTPClient: http.DefaultClient}

	tests := []struct {
		name   string
		params FetchParams
		want   string
	}{
		{
			name:   "basic",
			params: FetchParams{Username: "testplayer", PGNInJSON: true},
			want:   "https://lichess.org/api/games/user/testplayer?pgnInJson=true",
		},
		{
			name:   "with max",
			params: FetchParams{Username: "testplayer", Max: 100, PGNInJSON: true},
			want:   "https://lichess.org/api/games/user/testplayer?pgnInJson=true&max=100",
		},
		{
			name:   "pgn not in json",
			params: FetchParams{Username: "testplayer"},
			want:   "https://lichess.org/api/games/user/testplayer?pgnInJson=false",
		},
		{
			name:   "trimmed username",
			params: FetchParams{Username: "  spacey  ", PGNInJSON: true},
			want:   "https://lichess.org/api/games/user/spacey?pgnInJson=true",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := client.buildURL(tt.params)
			if got != tt.want {
				t.Errorf("buildURL() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGameResult(t *testing.T) {
	tests := []struct {
		winner string
		want   string
	}{
		{"white", "1-0"},
		{"black", "0-1"},
		{"", "1/2-1/2"},
	}
	for _, tt := range tests {
		g := Game{Winner: tt.winner}
		if got := g.Result(); got != tt.want {
			t.Errorf("Game{Winner:%q}.Result() = %q, want %q", tt.winner, got, tt.want)
		}
	}
}

// newTestClient creates a Client that points at the test server.
func newTestClient(srv *httptest.Server) *Client {
	client := NewClient(srv.Client())
	// Override baseURL by wrapping the test server's transport
	client.HTTPClient.Transport = &rewriteTransport{
		base:    srv.Client().Transport,
		baseURL: srv.URL,
	}
	return client
}

// rewriteTransport rewrites requests to point at the test server.
type rewriteTransport struct {
	base    http.RoundTripper
	baseURL string
}

func (t *rewriteTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Rewrite the URL scheme+host to point at test server
	req.URL.Scheme = "http"
	req.URL.Host = t.baseURL[len("http://"):]
	return t.base.RoundTrip(req)
}
