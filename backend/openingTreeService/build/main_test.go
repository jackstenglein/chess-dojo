package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	treeapi "github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/api"
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
		w.Write(archives)
	})
	mux.HandleFunc(fmt.Sprintf("/pub/player/%s/games/", username), func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(games)
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
		w.Write(games)
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

// setTransport overrides the default HTTP transport so Chess.com and Lichess
// clients hit the test servers instead of the real APIs.
func setTransport(chesscomHost, lichessHost string) func() {
	original := http.DefaultTransport
	http.DefaultTransport = &rewriteTransport{
		base:        original,
		chesscomURL: chesscomHost,
		lichessURL:  lichessHost,
	}
	return func() { http.DefaultTransport = original }
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

	restore := setTransport(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
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

	restore := setTransport(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
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

	restore := setTransport(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
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

	restore := setTransport(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
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

func TestHandler_PlainJSONEncoding(t *testing.T) {
	chesscomSrv := newChesscomServer(t, "testuser")
	defer chesscomSrv.Close()

	lichessSrv := newLichessServer(t)
	defer lichessSrv.Close()

	restore := setTransport(chesscomSrv.Listener.Addr().String(), lichessSrv.Listener.Addr().String())
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

	// Verify the response is plain JSON (not base64/gzip encoded).
	if resp.IsBase64Encoded {
		t.Fatal("response should not be base64 encoded")
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
