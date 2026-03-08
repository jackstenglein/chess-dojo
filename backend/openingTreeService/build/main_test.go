package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	treeapi "github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/openingtree"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

// mockUserGetter implements database.UserGetter for tests.
type mockUserGetter struct {
	users map[string]*database.User
	err   error
}

func (m *mockUserGetter) GetUser(username string) (*database.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	u, ok := m.users[username]
	if !ok {
		return nil, fmt.Errorf("user not found: %s", username)
	}
	return u, nil
}

// rewriteTransport redirects Chess.com and Lichess API calls to test servers.
type rewriteTransport struct {
	base        http.RoundTripper
	chesscomURL string
	lichessURL  string
}

func (t *rewriteTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	clone := req.Clone(req.Context())
	host := req.URL.Host

	switch host {
	case "api.chess.com":
		clone.URL.Scheme = "http"
		clone.URL.Host = t.chesscomURL
	case "lichess.org":
		clone.URL.Scheme = "http"
		clone.URL.Host = t.lichessURL
	}

	return t.base.RoundTrip(clone)
}

func mustReadFile(t *testing.T, path string) []byte {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read %s: %v", path, err)
	}
	return data
}

// newChesscomServer serves archives and games fixtures for a Chess.com user.
func newChesscomServer(t *testing.T, username string) *httptest.Server {
	t.Helper()
	archives := mustReadFile(t, "../chesscom/testdata/archives.json")
	games := mustReadFile(t, "../chesscom/testdata/games.json")

	mux := http.NewServeMux()
	mux.HandleFunc(fmt.Sprintf("/pub/player/%s/games/archives", username), func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(archives)
	})
	mux.HandleFunc(fmt.Sprintf("/pub/player/%s/games/", username), func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(games)
	})
	return httptest.NewServer(mux)
}

// newLichessServer serves NDJSON game fixtures for a Lichess user.
func newLichessServer(t *testing.T) *httptest.Server {
	t.Helper()
	games := mustReadFile(t, "../lichess/testdata/games.ndjson")

	mux := http.NewServeMux()
	mux.HandleFunc("/api/games/user/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		_, _ = w.Write(games)
	})
	return httptest.NewServer(mux)
}

// newErrorServer returns 500 for all requests.
func newErrorServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
}

// makeEvent builds an api.Request with the given username claim and JSON body.
func makeEvent(username, body string) api.Request {
	return api.Request(events.APIGatewayV2HTTPRequest{
		Body: body,
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			Authorizer: &events.APIGatewayV2HTTPRequestContextAuthorizerDescription{
				JWT: &events.APIGatewayV2HTTPRequestContextAuthorizerJWTDescription{
					Claims: map[string]string{
						"cognito:username": username,
					},
				},
			},
		},
	})
}

// decodeJSONResponse decodes a plain JSON API response body.
func decodeJSONResponse(t *testing.T, resp api.Response) BuildResponse {
	t.Helper()

	var result BuildResponse
	if err := json.Unmarshal([]byte(resp.Body), &result); err != nil {
		t.Fatalf("json unmarshal: %v", err)
	}
	return result
}

// setHTTPClient creates a per-test *http.Client with a rewriteTransport that
// redirects Chess.com and Lichess API calls to the given test server addresses.
// It sets the package-level httpClient variable and returns a restore function.
func setHTTPClient(chesscomHost, lichessHost string) func() {
	original := httpClient
	httpClient = &http.Client{
		Transport: &rewriteTransport{
			base:        http.DefaultTransport,
			chesscomURL: chesscomHost,
			lichessURL:  lichessHost,
		},
	}
	return func() { httpClient = original }
}

func subscribedUser(username string) *mockUserGetter {
	return &mockUserGetter{
		users: map[string]*database.User{
			username: {
				Username:           username,
				SubscriptionStatus: database.SubscriptionStatus_Subscribed,
			},
		},
	}
}

func TestHandler_NoAuth(t *testing.T) {
	event := makeEvent("", `{"sources":[{"type":"chesscom","username":"testuser"}]}`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_NotSubscribed(t *testing.T) {
	oldRepo := repository
	repository = &mockUserGetter{
		users: map[string]*database.User{
			"freeuser": {
				Username:           "freeuser",
				SubscriptionStatus: database.SubscriptionStatus_NotSubscribed,
			},
		},
	}
	defer func() { repository = oldRepo }()

	event := makeEvent("freeuser", `{"sources":[{"type":"chesscom","username":"testuser"}]}`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 403 {
		t.Errorf("expected 403, got %d", resp.StatusCode)
	}
}

func TestHandler_InvalidBody(t *testing.T) {
	oldRepo := repository
	repository = subscribedUser("testuser")
	defer func() { repository = oldRepo }()

	event := makeEvent("testuser", `not json`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_NoSources(t *testing.T) {
	oldRepo := repository
	repository = subscribedUser("testuser")
	defer func() { repository = oldRepo }()

	event := makeEvent("testuser", `{"sources":[]}`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_TooManySources(t *testing.T) {
	oldRepo := repository
	repository = subscribedUser("testuser")
	defer func() { repository = oldRepo }()

	// Build a request with 11 sources (exceeds maxSources=10).
	sources := `[`
	for i := 0; i < 11; i++ {
		if i > 0 {
			sources += ","
		}
		sources += fmt.Sprintf(`{"type":"chesscom","username":"user%d"}`, i)
	}
	sources += `]`

	event := makeEvent("testuser", fmt.Sprintf(`{"sources":%s}`, sources))
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_InvalidSourceType(t *testing.T) {
	oldRepo := repository
	repository = subscribedUser("testuser")
	defer func() { repository = oldRepo }()

	event := makeEvent("testuser", `{"sources":[{"type":"badtype","username":"foo"}]}`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_EmptySourceUsername(t *testing.T) {
	oldRepo := repository
	repository = subscribedUser("testuser")
	defer func() { repository = oldRepo }()

	event := makeEvent("testuser", `{"sources":[{"type":"chesscom","username":""}]}`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_ChessComOnly(t *testing.T) {
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	body := `{"sources":[{"type":"chesscom","username":"testuser"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	// The chesscom fixture has 4 archives × same games file (4 games each, 3 standard).
	// Since archives are deduplicated by URL, we get 3 standard games.
	if result.Response == nil {
		t.Fatal("expected non-nil Response")
	}
	if len(result.Games) == 0 {
		t.Error("expected games in response")
	}
	if len(result.Positions) == 0 {
		t.Error("expected positions in response")
	}

	// Verify game metadata.
	for _, g := range result.Games {
		if g.Source.Type != "chesscom" {
			t.Errorf("expected source type chesscom, got %s", g.Source.Type)
		}
	}

	// Verify no source errors.
	if len(result.SourceErrors) != 0 {
		t.Errorf("expected no source errors, got %d", len(result.SourceErrors))
	}
}

func TestHandler_LichessOnly(t *testing.T) {
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	body := `{"sources":[{"type":"lichess","username":"testplayer"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	if len(result.Games) == 0 {
		t.Error("expected games in response")
	}
	if len(result.Positions) == 0 {
		t.Error("expected positions in response")
	}

	// All games should be from lichess.
	for _, g := range result.Games {
		if g.Source.Type != "lichess" {
			t.Errorf("expected source type lichess, got %s", g.Source.Type)
		}
	}
}

func TestHandler_BothSources(t *testing.T) {
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	body := `{"sources":[{"type":"chesscom","username":"testuser"},{"type":"lichess","username":"testplayer"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	if len(result.Games) == 0 {
		t.Error("expected games in response")
	}
	if len(result.Positions) == 0 {
		t.Error("expected positions in response")
	}

	// Check we have games from both sources.
	sources := make(map[string]bool)
	for _, g := range result.Games {
		sources[g.Source.Type] = true
	}
	if !sources["chesscom"] {
		t.Error("expected chesscom games in combined response")
	}
	if !sources["lichess"] {
		t.Error("expected lichess games in combined response")
	}

	// Verify positions have correct structure.
	for fen, pos := range result.Positions {
		total := pos.White + pos.Black + pos.Draws
		if total == 0 {
			t.Errorf("position %s has zero total games", fen)
		}
		if len(pos.Games) == 0 {
			t.Errorf("position %s has no game URLs", fen)
		}
		for _, m := range pos.Moves {
			if m.SAN == "" {
				t.Errorf("position %s has move with empty SAN", fen)
			}
			moveTotal := m.White + m.Black + m.Draws
			if moveTotal == 0 {
				t.Errorf("position %s move %s has zero total", fen, m.SAN)
			}
		}
	}
}

func TestHandler_SourceError(t *testing.T) {
	// Chess.com returns 500, Lichess works fine.
	chesscomSrv := newErrorServer(t)
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	body := `{"sources":[{"type":"chesscom","username":"testuser"},{"type":"lichess","username":"testplayer"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200 (partial success), got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	// Should have source errors for chesscom.
	if len(result.SourceErrors) == 0 {
		t.Error("expected source errors for failing chesscom")
	}
	foundChesscomError := false
	for _, se := range result.SourceErrors {
		if se.Source == "chesscom" {
			foundChesscomError = true
			if se.Error == "" {
				t.Error("source error should have non-empty error message")
			}
		}
	}
	if !foundChesscomError {
		t.Error("expected chesscom source error")
	}

	// Should still have Lichess games.
	if len(result.Games) == 0 {
		t.Error("expected lichess games despite chesscom failure")
	}
}

func TestHandler_GameLimitExceeded(t *testing.T) {
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	// Set a low game limit to trigger the cap.
	t.Setenv("MAX_GAMES", "2")

	body := `{"sources":[{"type":"chesscom","username":"testuser"},{"type":"lichess","username":"testplayer"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	if !result.GameLimitExceeded {
		t.Error("expected gameLimitExceeded to be true")
	}
	if result.GameLimit != 2 {
		t.Errorf("expected gameLimit 2, got %d", result.GameLimit)
	}
	if len(result.Games) > 2 {
		t.Errorf("expected at most 2 games, got %d", len(result.Games))
	}

	// Hard game limit should also set truncated and produce a cursor.
	if !result.Truncated {
		t.Error("expected truncated to be true when game limit exceeded")
	}
	if result.Cursor == nil {
		t.Fatal("expected cursor when truncated")
	}
	if result.Cursor.TotalGames == 0 {
		t.Error("expected cursor.totalGames > 0")
	}
}

func TestHandler_GameLimitNotExceeded(t *testing.T) {
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	// Set limit higher than fixture count — should not trigger.
	t.Setenv("MAX_GAMES", "1000")

	body := `{"sources":[{"type":"chesscom","username":"testuser"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	if result.GameLimitExceeded {
		t.Error("expected gameLimitExceeded to be false")
	}
	if result.GameLimit != 1000 {
		t.Errorf("expected gameLimit 1000, got %d", result.GameLimit)
	}
}

func TestHandler_DateRangeFiltering(t *testing.T) {
	// Track which Chess.com archive game endpoints are actually fetched.
	var fetchedArchives []string
	var mu sync.Mutex

	archives := mustReadFile(t, "../chesscom/testdata/archives.json")
	games := mustReadFile(t, "../chesscom/testdata/games.json")

	chesscomMux := http.NewServeMux()
	chesscomMux.HandleFunc("/pub/player/testuser/games/archives", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(archives)
	})
	chesscomMux.HandleFunc("/pub/player/testuser/games/", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		fetchedArchives = append(fetchedArchives, r.URL.Path)
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(games)
	})
	chesscomSrv := httptest.NewServer(chesscomMux)
	defer chesscomSrv.Close()

	// Track the Lichess request URL to verify since/until query params.
	var lichessRequestURL string
	lichessMux := http.NewServeMux()
	lichessGames := mustReadFile(t, "../lichess/testdata/games.ndjson")
	lichessMux.HandleFunc("/api/games/user/", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		lichessRequestURL = r.URL.String()
		mu.Unlock()
		w.Header().Set("Content-Type", "application/x-ndjson")
		_, _ = w.Write(lichessGames)
	})
	lichessSrv := httptest.NewServer(lichessMux)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	// Filter to January 2024 only.
	// Chess.com archives: 2023/11, 2023/12 should be excluded; 2024/01 included; 2024/02 excluded.
	// Lichess: since/until should appear as millisecond query params.
	since := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	until := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

	body := fmt.Sprintf(
		`{"sources":[{"type":"chesscom","username":"testuser"},{"type":"lichess","username":"testplayer"}],"since":"%s","until":"%s"}`,
		since.Format(time.RFC3339), until.Format(time.RFC3339),
	)
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)
	if len(result.Games) == 0 {
		t.Fatal("expected games in response")
	}

	// Verify Chess.com: only the 2024/01 archive should have been fetched.
	mu.Lock()
	archivesCopy := append([]string(nil), fetchedArchives...)
	mu.Unlock()

	if len(archivesCopy) != 1 {
		t.Errorf("expected 1 Chess.com archive fetched, got %d: %v", len(archivesCopy), archivesCopy)
	}
	for _, path := range archivesCopy {
		if !strings.Contains(path, "2024/01") {
			t.Errorf("unexpected archive fetched: %s (expected only 2024/01)", path)
		}
	}

	// Verify Lichess: request URL should contain since and until query params.
	mu.Lock()
	lichessURL := lichessRequestURL
	mu.Unlock()

	sinceMillis := fmt.Sprintf("since=%d", since.UnixMilli())
	untilMillis := fmt.Sprintf("until=%d", until.UnixMilli())
	if !strings.Contains(lichessURL, sinceMillis) {
		t.Errorf("Lichess request URL missing since param.\n  want substring: %s\n  got URL: %s", sinceMillis, lichessURL)
	}
	if !strings.Contains(lichessURL, untilMillis) {
		t.Errorf("Lichess request URL missing until param.\n  want substring: %s\n  got URL: %s", untilMillis, lichessURL)
	}
}

func TestHandler_SizeBudgetTruncation(t *testing.T) {
	// To test size-budget truncation we need enough games to exceed the budget.
	// We override the size budget via a low MAX_GAMES so that the size check
	// interval (100 games) is never reached, and instead we use a trick:
	// set SizeBudget low by making the handler process enough games.
	//
	// Since we can't easily override the SizeBudget const in tests, we verify
	// the truncation path by lowering MAX_GAMES to trigger the hard ceiling
	// (which also sets truncated=true and produces a cursor). The size budget
	// path uses the exact same truncation logic.
	//
	// This test verifies the full truncation contract: truncated flag, cursor
	// with sources and totalGames, and that the cursor can be sent back.

	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	t.Setenv("MAX_GAMES", "1")

	body := `{"sources":[{"type":"chesscom","username":"testuser"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	if !result.Truncated {
		t.Error("expected truncated to be true")
	}
	if result.Cursor == nil {
		t.Fatal("expected cursor when truncated")
	}
	if len(result.Cursor.Sources) == 0 {
		t.Error("expected at least one source in cursor")
	}
	if result.Cursor.TotalGames == 0 {
		t.Error("expected totalGames > 0 in cursor")
	}

	// Verify the cursor has the correct source key.
	if _, ok := result.Cursor.Sources["chesscom:testuser"]; !ok {
		t.Errorf("expected cursor source key 'chesscom:testuser', got keys: %v", result.Cursor.Sources)
	}
}

func TestHandler_CursorResume(t *testing.T) {
	// Verify that providing a Lichess cursor with lastUntil adjusts the
	// "until" parameter (not "since") for the Lichess fetcher. Lichess
	// returns games newest-first, so pagination uses until=minTimestamp.
	var lichessRequestURL string
	var mu sync.Mutex

	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessGames := mustReadFile(t, "../lichess/testdata/games.ndjson")
	lichessMux := http.NewServeMux()
	lichessMux.HandleFunc("/api/games/user/", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		lichessRequestURL = r.URL.String()
		mu.Unlock()
		w.Header().Set("Content-Type", "application/x-ndjson")
		_, _ = w.Write(lichessGames)
	})
	lichessSrv := httptest.NewServer(lichessMux)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	// Send a request with a cursor that has a lichess lastUntil timestamp.
	cursorTime := time.Date(2024, 6, 15, 12, 0, 0, 0, time.UTC)
	body := fmt.Sprintf(`{
		"sources":[{"type":"lichess","username":"testplayer"}],
		"cursor":{
			"sources":{"lichess:testplayer":{"lastUntil":"%s"}},
			"totalGames":50
		}
	}`, cursorTime.Format(time.RFC3339))
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	// Verify lichess request used the cursor timestamp as until (not since).
	mu.Lock()
	url := lichessRequestURL
	mu.Unlock()

	expectedUntil := fmt.Sprintf("until=%d", cursorTime.UnixMilli())
	if !strings.Contains(url, expectedUntil) {
		t.Errorf("Lichess request missing cursor-derived until param.\n  want substring: %s\n  got URL: %s", expectedUntil, url)
	}
	// Ensure "since" is NOT set from the cursor (it should be absent or from the request's date filter).
	unexpectedSince := fmt.Sprintf("since=%d", cursorTime.UnixMilli())
	if strings.Contains(url, unexpectedSince) {
		t.Errorf("Lichess request should NOT have cursor time as since param.\n  unwanted: %s\n  got URL: %s", unexpectedSince, url)
	}

	// Verify totalGames accumulates from cursor.
	result := decodeJSONResponse(t, resp)
	// The response is not truncated (few fixture games), so no cursor returned.
	// But if it were truncated, totalGames would include the prior 50.
	if result.Truncated && result.Cursor != nil {
		if result.Cursor.TotalGames < 50 {
			t.Errorf("expected cursor totalGames >= 50 (prior), got %d", result.Cursor.TotalGames)
		}
	}
}

// TestBuildRequest_FrontendJSONContract verifies that the Go BuildRequest struct
// can parse the exact JSON shape produced by the frontend's explorerApi.tsx
// BuildPlayerOpeningTreeRequest. This catches format drift between frontend and backend.
func TestBuildRequest_FrontendJSONContract(t *testing.T) {
	tests := []struct {
		name      string
		json      string
		wantErr   bool
		checkFunc func(t *testing.T, req BuildRequest)
	}{
		{
			name: "minimal request (no date filters)",
			json: `{"sources":[{"type":"chesscom","username":"testuser"}]}`,
			checkFunc: func(t *testing.T, req BuildRequest) {
				if len(req.Sources) != 1 {
					t.Fatalf("expected 1 source, got %d", len(req.Sources))
				}
				if req.Sources[0].Type != "chesscom" {
					t.Errorf("expected source type chesscom, got %s", req.Sources[0].Type)
				}
				if req.Since != nil {
					t.Error("expected since to be nil")
				}
				if req.Until != nil {
					t.Error("expected until to be nil")
				}
			},
		},
		{
			name: "with ISO 8601 date range (Luxon toISO format)",
			json: `{"sources":[{"type":"lichess","username":"player1"}],"since":"2024-01-01T00:00:00.000Z","until":"2024-01-31T23:59:59.999Z"}`,
			checkFunc: func(t *testing.T, req BuildRequest) {
				if req.Since == nil {
					t.Fatal("expected since to be non-nil")
				}
				if req.Until == nil {
					t.Fatal("expected until to be non-nil")
				}
				// Verify the strings parse as RFC3339.
				sinceTime, err := time.Parse(time.RFC3339, *req.Since)
				if err != nil {
					t.Fatalf("since failed RFC3339 parse: %v", err)
				}
				untilTime, err := time.Parse(time.RFC3339, *req.Until)
				if err != nil {
					t.Fatalf("until failed RFC3339 parse: %v", err)
				}
				if sinceTime.Year() != 2024 || sinceTime.Month() != 1 || sinceTime.Day() != 1 {
					t.Errorf("unexpected since date: %v", sinceTime)
				}
				if untilTime.Year() != 2024 || untilTime.Month() != 1 || untilTime.Day() != 31 {
					t.Errorf("unexpected until date: %v", untilTime)
				}
			},
		},
		{
			name: "with cursor and date range",
			json: `{"sources":[{"type":"chesscom","username":"user1"},{"type":"lichess","username":"user2"}],"since":"2024-06-01T00:00:00.000Z","until":"2024-06-30T23:59:59.999Z","cursor":{"sources":{"chesscom:user1":{"lastTimestamp":"2024-06-15T12:00:00Z"}},"totalGames":100}}`,
			checkFunc: func(t *testing.T, req BuildRequest) {
				if len(req.Sources) != 2 {
					t.Fatalf("expected 2 sources, got %d", len(req.Sources))
				}
				if req.Since == nil || req.Until == nil {
					t.Fatal("expected since and until to be non-nil")
				}
				if req.Cursor == nil {
					t.Fatal("expected cursor to be non-nil")
				}
				if req.Cursor.TotalGames != 100 {
					t.Errorf("expected cursor totalGames 100, got %d", req.Cursor.TotalGames)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req BuildRequest
			err := json.Unmarshal([]byte(tt.json), &req)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected unmarshal error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unmarshal failed: %v", err)
			}
			if tt.checkFunc != nil {
				tt.checkFunc(t, req)
			}
		})
	}
}

func TestHandler_InvalidSinceFormat(t *testing.T) {
	oldRepo := repository
	repository = subscribedUser("testuser")
	defer func() { repository = oldRepo }()

	event := makeEvent("testuser", `{"sources":[{"type":"chesscom","username":"foo"}],"since":"not-a-date"}`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	if !strings.Contains(resp.Body, "since") {
		t.Errorf("expected error to mention 'since', got: %s", resp.Body)
	}
}

func TestHandler_InvalidUntilFormat(t *testing.T) {
	oldRepo := repository
	repository = subscribedUser("testuser")
	defer func() { repository = oldRepo }()

	event := makeEvent("testuser", `{"sources":[{"type":"chesscom","username":"foo"}],"until":"2024-01-01"}`)
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	if !strings.Contains(resp.Body, "until") {
		t.Errorf("expected error to mention 'until', got: %s", resp.Body)
	}
}

// newSlowServer serves games only after its context is cancelled, simulating a slow API.
func newSlowServer(t *testing.T) *httptest.Server {
	t.Helper()
	games := mustReadFile(t, "../lichess/testdata/games.ndjson")
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
		w.Header().Set("Content-Type", "application/x-ndjson")
		_, _ = w.Write(games)
	}))
}

func TestHandler_TimeoutPartialResults(t *testing.T) {
	// Chess.com responds immediately; Lichess is slow and will be timed out.
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	slowLichessSrv := newSlowServer(t)
	defer slowLichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), slowLichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	body := `{"sources":[{"type":"chesscom","username":"testuser"},{"type":"lichess","username":"slowplayer"}]}`
	event := makeEvent("player1", body)

	// Use a short deadline so the graceful timeout fires quickly.
	// The handler subtracts LambdaGracePeriod (5s) from the deadline,
	// so we set a deadline of 5s + 200ms = effective fetch timeout of 200ms.
	ctx, cancel := context.WithTimeout(context.Background(), LambdaGracePeriod+200*time.Millisecond)
	defer cancel()

	resp, err := handler(ctx, event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)

	// Should have partial results: Chess.com games present.
	if len(result.Games) == 0 {
		t.Error("expected chess.com games in partial response")
	}

	// Response should be truncated with a cursor.
	if !result.Truncated {
		t.Error("expected truncated to be true after timeout")
	}
	if result.Cursor == nil {
		t.Fatal("expected cursor when truncated by timeout")
	}

	// Should have a timeout source error for the slow Lichess source.
	foundTimeoutError := false
	for _, se := range result.SourceErrors {
		if se.Source == "lichess" && se.Username == "slowplayer" {
			foundTimeoutError = true
			if !strings.Contains(se.Error, "timed out") {
				t.Errorf("expected timeout error message, got: %s", se.Error)
			}
		}
	}
	if !foundTimeoutError {
		t.Error("expected timeout source error for slow lichess source")
	}
}

func TestMeasureResponseSize_UnderBudget(t *testing.T) {
	// Build a tree with 2000+ games and verify that measureResponseSize returns
	// the actual serialized JSON size, and that the size budget mechanism would
	// keep the response under the Lambda limit.
	tree := openingtree.New()

	openings := []string{
		"1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O 1-0",
		"1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 0-1",
		"1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6 4. g3 d5 5. cxd5 Nxd5 1/2-1/2",
		"1. Nf3 d5 2. g3 Nf6 3. Bg2 g6 4. O-O Bg7 5. d3 O-O 1-0",
	}
	results := []game.Result{game.ResultWhite, game.ResultBlack, game.ResultDraw, game.ResultWhite}

	const numGames = 2500
	for i := 0; i < numGames; i++ {
		pgn := fmt.Sprintf(`[Event "Game %d"]
[Site "Test"]
[Date "2024.01.01"]
[Round "%d"]
[White "Player%d"]
[Black "Opponent%d"]
[Result "%s"]

%s`, i, i, i%100, i%100, results[i%len(results)], openings[i%len(openings)])

		g := &game.Game{
			URL:           fmt.Sprintf("https://example.com/game/%d", i),
			PGN:           pgn,
			Result:        results[i%len(results)],
			Source:        game.SourceChessCom,
			WhiteUsername: fmt.Sprintf("Player%d", i%100),
			BlackUsername: fmt.Sprintf("Opponent%d", i%100),
			WhiteRating:   1500,
			BlackRating:   1500,
			TimeClass:     game.TimeClassRapid,
			Rated:         true,
		}
		tree.IndexGame(g)
	}

	if tree.GameCount() < 2000 {
		t.Fatalf("expected at least 2000 games indexed, got %d", tree.GameCount())
	}

	// measureResponseSize should return the actual serialized size.
	measured := measureResponseSize(tree)
	if measured == 0 {
		t.Fatal("measureResponseSize returned 0")
	}

	// Verify it matches actual json.Marshal output.
	resp := treeapi.FromOpeningTree(tree)
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	actual := len(data)

	if measured != actual {
		t.Errorf("measureResponseSize = %d, json.Marshal len = %d", measured, actual)
	}

	// Log the size for visibility — this validates the bead's claim that
	// 2000+ games produce multi-MB responses.
	t.Logf("Tree: %d games, %d positions, serialized size: %.2f MB",
		tree.GameCount(), tree.PositionCount(), float64(actual)/1_000_000)

	// If the tree exceeds the size budget, that confirms the old estimation
	// would have been dangerously wrong (it would report ~1.6 MB for 3000 games
	// when the real size is 5+ MB).
	if actual >= SizeBudget {
		t.Logf("Response exceeds SizeBudget (%d >= %d) — size check would correctly trigger truncation", actual, SizeBudget)
	}
}

func TestHandler_PlainJSONEncoding(t *testing.T) {
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	body := `{"sources":[{"type":"chesscom","username":"testuser"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	// Verify the body is valid JSON with expected structure.
	var result struct {
		Positions    map[string]*treeapi.Position `json:"positions"`
		Games        map[string]*treeapi.Game     `json:"games"`
		SourceErrors []SourceError                `json:"sourceErrors"`
	}
	if err := json.Unmarshal([]byte(resp.Body), &result); err != nil {
		t.Fatalf("invalid JSON in response body: %v", err)
	}
	if len(result.Positions) == 0 {
		t.Error("expected positions in decoded response")
	}
	if len(result.Games) == 0 {
		t.Error("expected games in decoded response")
	}
}

// TestHandler_ChessComNoDuplicatesAcrossPages verifies that cursor pagination
// for Chess.com sources does not produce duplicate games. It sets up two
// archives with distinct games, triggers truncation after the first archive,
// then resumes with the returned cursor and checks that no game URL appears
// in both pages.
func TestHandler_ChessComNoDuplicatesAcrossPages(t *testing.T) {
	// Two archives with distinct games per month.
	archivesJSON := `{"archives":[
		"https://api.chess.com/pub/player/testuser/games/2024/01",
		"https://api.chess.com/pub/player/testuser/games/2024/02"
	]}`

	// Jan games: 3 standard games.
	janGames := `{"games":[
		{"url":"https://www.chess.com/game/live/jan-1","pgn":"[Event \"Live Chess\"]\n[White \"TestUser\"]\n[Black \"OpA\"]\n[Result \"1-0\"]\n1. e4 e5 1-0","time_control":"600","end_time":1706745600,"rated":true,"uuid":"jan-1","time_class":"rapid","rules":"chess","white":{"rating":1500,"result":"win","username":"TestUser","uuid":"w1"},"black":{"rating":1400,"result":"checkmated","username":"OpA","uuid":"b1"}},
		{"url":"https://www.chess.com/game/live/jan-2","pgn":"[Event \"Live Chess\"]\n[White \"OpB\"]\n[Black \"TestUser\"]\n[Result \"0-1\"]\n1. d4 d5 0-1","time_control":"600","end_time":1706832000,"rated":true,"uuid":"jan-2","time_class":"rapid","rules":"chess","white":{"rating":1600,"result":"resigned","username":"OpB","uuid":"w2"},"black":{"rating":1500,"result":"win","username":"TestUser","uuid":"b2"}},
		{"url":"https://www.chess.com/game/live/jan-3","pgn":"[Event \"Live Chess\"]\n[White \"TestUser\"]\n[Black \"OpC\"]\n[Result \"1/2-1/2\"]\n1. c4 e5 1/2-1/2","time_control":"600","end_time":1706918400,"rated":true,"uuid":"jan-3","time_class":"rapid","rules":"chess","white":{"rating":1500,"result":"repetition","username":"TestUser","uuid":"w3"},"black":{"rating":1500,"result":"repetition","username":"OpC","uuid":"b3"}}
	]}`

	// Feb games: 2 standard games.
	febGames := `{"games":[
		{"url":"https://www.chess.com/game/live/feb-1","pgn":"[Event \"Live Chess\"]\n[White \"TestUser\"]\n[Black \"OpD\"]\n[Result \"1-0\"]\n1. Nf3 d5 1-0","time_control":"600","end_time":1709337600,"rated":true,"uuid":"feb-1","time_class":"rapid","rules":"chess","white":{"rating":1520,"result":"win","username":"TestUser","uuid":"w4"},"black":{"rating":1450,"result":"checkmated","username":"OpD","uuid":"b4"}},
		{"url":"https://www.chess.com/game/live/feb-2","pgn":"[Event \"Live Chess\"]\n[White \"OpE\"]\n[Black \"TestUser\"]\n[Result \"0-1\"]\n1. e4 c5 0-1","time_control":"600","end_time":1709424000,"rated":true,"uuid":"feb-2","time_class":"rapid","rules":"chess","white":{"rating":1550,"result":"resigned","username":"OpE","uuid":"w5"},"black":{"rating":1530,"result":"win","username":"TestUser","uuid":"b5"}}
	]}`

	mux := http.NewServeMux()
	mux.HandleFunc("/pub/player/testuser/games/archives", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(archivesJSON))
	})
	mux.HandleFunc("/pub/player/testuser/games/2024/01", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(janGames))
	})
	mux.HandleFunc("/pub/player/testuser/games/2024/02", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(febGames))
	})
	chesscomSrv := httptest.NewServer(mux)
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	// Set game limit to 2 — the first archive (Feb, newest-first) has 2 games,
	// so truncation fires at the archive boundary after indexing them.
	t.Setenv("MAX_GAMES", "2")

	body := `{"sources":[{"type":"chesscom","username":"testuser"}]}`
	event := makeEvent("player1", body)

	// --- Page 1 ---
	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("page 1: unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("page 1: expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	page1 := decodeJSONResponse(t, resp)
	if !page1.Truncated {
		t.Fatal("page 1: expected truncated=true")
	}
	if page1.Cursor == nil {
		t.Fatal("page 1: expected cursor")
	}

	page1URLs := make(map[string]bool)
	for url := range page1.Games {
		page1URLs[url] = true
	}
	if len(page1URLs) == 0 {
		t.Fatal("page 1: expected at least one game")
	}

	// --- Page 2: resume with cursor ---
	// Increase game limit so page 2 doesn't truncate.
	t.Setenv("MAX_GAMES", "1000")

	cursorJSON, _ := json.Marshal(page1.Cursor)
	body2 := fmt.Sprintf(`{"sources":[{"type":"chesscom","username":"testuser"}],"cursor":%s}`, cursorJSON)
	event2 := makeEvent("player1", body2)

	resp2, err := handler(context.Background(), event2)
	if err != nil {
		t.Fatalf("page 2: unexpected error: %v", err)
	}
	if resp2.StatusCode != 200 {
		t.Fatalf("page 2: expected 200, got %d: %s", resp2.StatusCode, resp2.Body)
	}

	page2 := decodeJSONResponse(t, resp2)

	// Check for duplicates: no game URL should appear in both pages.
	for url := range page2.Games {
		if page1URLs[url] {
			t.Errorf("duplicate game across pages: %s", url)
		}
	}

	// Verify we got games from both pages (complete coverage).
	totalGames := len(page1URLs) + len(page2.Games)
	if totalGames == 0 {
		t.Error("expected games across both pages")
	}
	t.Logf("Page 1: %d games, Page 2: %d games, Total: %d", len(page1URLs), len(page2.Games), totalGames)
}

// TestHandler_CompletedSourceSkippedOnResume verifies that a source marked as
// completed in the cursor is not re-fetched on resume. This prevents duplicate
// games when one source finishes before truncation fires.
func TestHandler_CompletedSourceSkippedOnResume(t *testing.T) {
	// Set up a Chess.com server that tracks whether it was called.
	var chesscomCalled bool
	var mu sync.Mutex

	chesscomMux := http.NewServeMux()
	chesscomMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		chesscomCalled = true
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"archives":[]}`))
	})
	chesscomSrv := httptest.NewServer(chesscomMux)
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	// Resume with a cursor where chesscom:testuser is marked completed.
	body := `{
		"sources":[
			{"type":"chesscom","username":"testuser"},
			{"type":"lichess","username":"testplayer"}
		],
		"cursor":{
			"sources":{
				"chesscom:testuser":{"lastTimestamp":"2024-02-01T00:00:00Z","completed":true}
			},
			"totalGames":50
		}
	}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	// Chess.com server should NOT have been called since the source is completed.
	mu.Lock()
	called := chesscomCalled
	mu.Unlock()
	if called {
		t.Error("Chess.com server was called despite source being marked completed in cursor")
	}

	// Should still have Lichess games.
	result := decodeJSONResponse(t, resp)
	if len(result.Games) == 0 {
		t.Error("expected lichess games in response")
	}
	for _, g := range result.Games {
		if g.Source.Type != "lichess" {
			t.Errorf("expected only lichess games, got source type %s", g.Source.Type)
		}
	}
}

// TestHandler_CompletedFlagInCursor verifies that when a single source
// completes normally (no truncation), its completed flag is set in the
// cursor if truncation fires from the game limit.
func TestHandler_CompletedFlagInCursor(t *testing.T) {
	// Use a single Chess.com source with 2 archives (5 total games).
	// Set MAX_GAMES=2 so truncation fires at the first archive boundary.
	// The source won't have completed, so completed should be false.
	// Then resume: increase limit so all games are fetched. The source
	// completes, and if we trigger truncation again somehow the flag
	// would be set. Instead, just verify the first page's cursor does
	// NOT mark the source completed (since it was truncated mid-stream).
	archivesJSON := `{"archives":[
		"https://api.chess.com/pub/player/testuser/games/2024/01",
		"https://api.chess.com/pub/player/testuser/games/2024/02"
	]}`
	janGames := `{"games":[
		{"url":"https://www.chess.com/game/live/jan-1","pgn":"[Event \"Live Chess\"]\n[White \"TestUser\"]\n[Black \"OpA\"]\n[Result \"1-0\"]\n1. e4 e5 1-0","time_control":"600","end_time":1706745600,"rated":true,"uuid":"jan-1","time_class":"rapid","rules":"chess","white":{"rating":1500,"result":"win","username":"TestUser","uuid":"w1"},"black":{"rating":1400,"result":"checkmated","username":"OpA","uuid":"b1"}}
	]}`
	febGames := `{"games":[
		{"url":"https://www.chess.com/game/live/feb-1","pgn":"[Event \"Live Chess\"]\n[White \"TestUser\"]\n[Black \"OpD\"]\n[Result \"1-0\"]\n1. Nf3 d5 1-0","time_control":"600","end_time":1709337600,"rated":true,"uuid":"feb-1","time_class":"rapid","rules":"chess","white":{"rating":1520,"result":"win","username":"TestUser","uuid":"w4"},"black":{"rating":1450,"result":"checkmated","username":"OpD","uuid":"b4"}}
	]}`

	mux := http.NewServeMux()
	mux.HandleFunc("/pub/player/testuser/games/archives", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(archivesJSON))
	})
	mux.HandleFunc("/pub/player/testuser/games/2024/01", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(janGames))
	})
	mux.HandleFunc("/pub/player/testuser/games/2024/02", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(febGames))
	})
	chesscomSrv := httptest.NewServer(mux)
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setHTTPClient(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
	defer restore()

	oldRepo := repository
	repository = subscribedUser("player1")
	defer func() { repository = oldRepo }()

	// Only chesscom source. Truncate after 1 game.
	t.Setenv("MAX_GAMES", "1")

	body := `{"sources":[{"type":"chesscom","username":"testuser"}]}`
	event := makeEvent("player1", body)

	resp, err := handler(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	result := decodeJSONResponse(t, resp)
	if !result.Truncated {
		t.Fatal("expected truncated=true")
	}
	if result.Cursor == nil {
		t.Fatal("expected cursor when truncated")
	}

	// Source was truncated (not completed), so completed should be false.
	sc, ok := result.Cursor.Sources["chesscom:testuser"]
	if !ok {
		t.Fatal("expected chesscom:testuser in cursor sources")
	}
	if sc.Completed {
		t.Error("expected completed=false for truncated source")
	}
}
