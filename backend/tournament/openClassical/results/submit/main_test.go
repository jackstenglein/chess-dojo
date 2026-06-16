package main

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

type mockOpenClassicalRepository struct {
	openClassical *database.OpenClassical
	getErr        error
	updateErr     error
	lastUpdate    *database.OpenClassicalPairingUpdate
}

func (m *mockOpenClassicalRepository) GetOpenClassical(startsAt string) (*database.OpenClassical, error) {
	return m.openClassical, m.getErr
}

func (m *mockOpenClassicalRepository) UpdateOpenClassicalResult(update *database.OpenClassicalPairingUpdate) (*database.OpenClassical, error) {
	m.lastUpdate = update
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	return m.openClassical, nil
}

type mockMediaStore struct {
	uploads []uploadCall
	err     error
}

type uploadCall struct {
	key  string
	data string
}

func (m *mockMediaStore) UploadImage(key, imageData string) error {
	m.uploads = append(m.uploads, uploadCall{key: key, data: imageData})
	return m.err
}

func (m *mockMediaStore) CopyImageFromURL(url, key string) error {
	return nil
}

func (m *mockMediaStore) DeleteImage(key string) error {
	return nil
}

func (m *mockMediaStore) Download(bucket, key string, file *os.File) error {
	return nil
}

func resetDependencies(t *testing.T) func() {
	t.Helper()

	originalRepository := repository
	originalMediaStore := mediaStore

	return func() {
		repository = originalRepository
		mediaStore = originalMediaStore
	}
}

func testOpenClassical() *database.OpenClassical {
	return &database.OpenClassical{
		StartsAt:   database.CurrentLeaderboard,
		StartMonth: "2026-01",
		Sections: map[string]database.OpenClassicalSection{
			"A_Open": {
				Name:    "A_Open",
				Region:  "A",
				Section: "Open",
				Rounds: []database.OpenClassicalRound{
					{
						Pairings: []database.OpenClassicalPairing{
							{
								White: database.OpenClassicalPlayerSummary{LichessUsername: "WhitePlayer"},
								Black: database.OpenClassicalPlayerSummary{LichessUsername: "BlackPlayer"},
							},
						},
					},
				},
			},
		},
	}
}

func validRequest() *SubmitResultsRequest {
	return &SubmitResultsRequest{
		Region:  "A",
		Section: "Open",
		White:   "WhitePlayer",
		Black:   "BlackPlayer",
		Result:  "1-0",
		Notes:   "Good game",
	}
}

func TestCheckRequest(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		request *SubmitResultsRequest
		wantErr string
	}{
		{
			name: "ValidRequest",
			request: &SubmitResultsRequest{
				Region:  "A",
				Section: "Open",
				White:   "white",
				Black:   "black",
				Result:  "1-0",
			},
		},
		{
			name: "MissingRegion",
			request: &SubmitResultsRequest{
				Section: "Open",
				White:   "white",
				Black:   "black",
				Result:  "1-0",
			},
			wantErr: "region is required",
		},
		{
			name: "MissingSection",
			request: &SubmitResultsRequest{
				Region: "A",
				White:  "white",
				Black:  "black",
				Result: "1-0",
			},
			wantErr: "section is required",
		},
		{
			name: "MissingWhite",
			request: &SubmitResultsRequest{
				Region:  "A",
				Section: "Open",
				Black:   "black",
				Result:  "1-0",
			},
			wantErr: "white is required",
		},
		{
			name: "MissingBlack",
			request: &SubmitResultsRequest{
				Region:  "A",
				Section: "Open",
				White:   "white",
				Result:  "1-0",
			},
			wantErr: "black is required",
		},
		{
			name: "MissingResult",
			request: &SubmitResultsRequest{
				Region:  "A",
				Section: "Open",
				White:   "white",
				Black:   "black",
			},
			wantErr: "result is required",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := checkRequest(tc.request)
			if tc.wantErr == "" {
				if err != nil {
					t.Fatalf("checkRequest() error = %v, want nil", err)
				}
				return
			}

			if err == nil {
				t.Fatal("checkRequest() error = nil, want error")
			}
			if !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("checkRequest() error = %q, want substring %q", err.Error(), tc.wantErr)
			}
		})
	}
}

func TestGetPairingUpdate(t *testing.T) {
	t.Parallel()

	openClassical := testOpenClassical()

	tests := []struct {
		name    string
		request *SubmitResultsRequest
		want    *database.OpenClassicalPairingUpdate
		wantErr string
	}{
		{
			name:    "MatchingPairing",
			request: validRequest(),
			want: &database.OpenClassicalPairingUpdate{
				Region:       "A",
				Section:      "Open",
				Round:        0,
				PairingIndex: 0,
				Pairing: &database.OpenClassicalPairing{
					White:    openClassical.Sections["A_Open"].Rounds[0].Pairings[0].White,
					Black:    openClassical.Sections["A_Open"].Rounds[0].Pairings[0].Black,
					Result:   "1-0",
					Notes:    "Good game",
					Verified: false,
				},
			},
		},
		{
			name: "CaseInsensitiveUsernames",
			request: &SubmitResultsRequest{
				Region:  "A",
				Section: "Open",
				White:   "WHITEPLAYER",
				Black:   "blackplayer",
				Result:  "0-1",
			},
			want: &database.OpenClassicalPairingUpdate{
				Region:       "A",
				Section:      "Open",
				Round:        0,
				PairingIndex: 0,
				Pairing: &database.OpenClassicalPairing{
					White:    openClassical.Sections["A_Open"].Rounds[0].Pairings[0].White,
					Black:    openClassical.Sections["A_Open"].Rounds[0].Pairings[0].Black,
					Result:   "0-1",
					Verified: false,
				},
			},
		},
		{
			name: "UnknownSection",
			request: &SubmitResultsRequest{
				Region:  "A",
				Section: "U1900",
				White:   "WhitePlayer",
				Black:   "BlackPlayer",
				Result:  "1-0",
			},
			wantErr: "region/section combo `A/U1900` does not exist",
		},
		{
			name: "UnknownPairing",
			request: &SubmitResultsRequest{
				Region:  "A",
				Section: "Open",
				White:   "UnknownWhite",
				Black:   "UnknownBlack",
				Result:  "1-0",
			},
			wantErr: "does not contain a pairing",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			request := tc.request
			got, err := getPairingUpdate(openClassical, request)
			if tc.wantErr != "" {
				if err == nil {
					t.Fatal("getPairingUpdate() error = nil, want error")
				}
				if !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("getPairingUpdate() error = %q, want substring %q", err.Error(), tc.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("getPairingUpdate() error = %v, want nil", err)
			}
			if request.Round != 1 {
				t.Fatalf("request.Round = %d, want 1", request.Round)
			}
			if diff := cmp.Diff(tc.want, got, cmpopts.EquateEmpty()); diff != "" {
				t.Fatalf("getPairingUpdate() diff (-want +got):\n%s", diff)
			}
		})
	}
}

func TestGetScreenshotKey(t *testing.T) {
	t.Parallel()

	openClassical := testOpenClassical()
	update := &database.OpenClassicalPairingUpdate{
		Region:  "A",
		Section: "Open",
		Round:   0,
		Pairing: &database.OpenClassicalPairing{
			White: database.OpenClassicalPlayerSummary{LichessUsername: "WhitePlayer"},
			Black: database.OpenClassicalPlayerSummary{LichessUsername: "BlackPlayer"},
		},
	}

	got := getScreenshotKey(openClassical, update, 1)
	want := "/open-classical/2026-01/A/Open/r1/whiteplayer_blackplayer_1"
	if got != want {
		t.Fatalf("getScreenshotKey() = %q, want %q", got, want)
	}
}

func TestUploadScreenshots(t *testing.T) {
	t.Parallel()

	openClassical := testOpenClassical()
	update := &database.OpenClassicalPairingUpdate{
		Region:  "A",
		Section: "Open",
		Round:   0,
		Pairing: &database.OpenClassicalPairing{
			White: database.OpenClassicalPlayerSummary{LichessUsername: "WhitePlayer"},
			Black: database.OpenClassicalPlayerSummary{LichessUsername: "BlackPlayer"},
		},
	}

	tests := []struct {
		name            string
		screenshotsData []string
		uploadErr       error
		wantKeys        []string
		wantUploads     int
		wantErr         bool
	}{
		{
			name:            "UploadsNonEmptyScreenshots",
			screenshotsData: []string{"dGVzdDE=", "dGVzdDI="},
			wantKeys: []string{
				"/open-classical/2026-01/A/Open/r1/whiteplayer_blackplayer",
				"/open-classical/2026-01/A/Open/r1/whiteplayer_blackplayer",
			},
			wantUploads: 2,
		},
		{
			name:            "SkipsEmptyScreenshots",
			screenshotsData: []string{"dGVzdDE=", "  ", "dGVzdDI="},
			wantKeys: []string{
				"/open-classical/2026-01/A/Open/r1/whiteplayer_blackplayer",
				"/open-classical/2026-01/A/Open/r1/whiteplayer_blackplayer",
			},
			wantUploads: 2,
		},
		{
			name:            "UploadFailure",
			screenshotsData: []string{"dGVzdDE="},
			uploadErr:       errors.New(500, "Temporary server error", "Failed to upload image"),
			wantErr:         true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			restore := resetDependencies(t)
			defer restore()

			mockStore := &mockMediaStore{err: tc.uploadErr}
			mediaStore = mockStore

			got, err := uploadScreenshots(openClassical, update, tc.screenshotsData)
			if tc.wantErr {
				if err == nil {
					t.Fatal("uploadScreenshots() error = nil, want error")
				}
				return
			}

			if err != nil {
				t.Fatalf("uploadScreenshots() error = %v, want nil", err)
			}
			if diff := cmp.Diff(tc.wantKeys, got); diff != "" {
				t.Fatalf("uploadScreenshots() keys diff (-want +got):\n%s", diff)
			}
			if len(mockStore.uploads) != tc.wantUploads {
				t.Fatalf("upload count = %d, want %d", len(mockStore.uploads), tc.wantUploads)
			}
		})
	}
}

func TestGetGameUrl(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		request *SubmitResultsRequest
		wantErr bool
	}{
		{
			name: "EmptyGameUrl",
			request: &SubmitResultsRequest{
				GameUrl: "",
			},
		},
		{
			name: "UnknownGameUrl",
			request: &SubmitResultsRequest{
				GameUrl: "https://example.com/game/123",
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := getGameUrl(tc.request)
			if tc.wantErr && err == nil {
				t.Fatal("getGameUrl() error = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("getGameUrl() error = %v, want nil", err)
			}
		})
	}
}

func TestHandler(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	tests := []struct {
		name         string
		username     string
		body         string
		repo         *mockOpenClassicalRepository
		media        *mockMediaStore
		wantCode     int
		wantErr      bool
		wantUpdate   *database.OpenClassicalPairingUpdate
		wantUploads  int
		checkUploads bool
		wantResponse bool
	}{
		{
			name:     "NotSignedIn",
			username: "",
			body:     `{}`,
			wantCode: 403,
			wantErr:  true,
		},
		{
			name:     "InvalidJSON",
			username: "test-user",
			body:     `{`,
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "MissingRequiredFields",
			username: "test-user",
			body:     `{"region":"A"}`,
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "PairingNotFound",
			username: "test-user",
			repo:     &mockOpenClassicalRepository{openClassical: testOpenClassical()},
			body: mustJSON(t, &SubmitResultsRequest{
				Region:  "A",
				Section: "Open",
				White:   "MissingWhite",
				Black:   "MissingBlack",
				Result:  "1-0",
			}),
			wantCode: 400,
			wantErr:  true,
		},
		{
			name:     "SuccessfulSubmission",
			username: "test-user",
			repo:     &mockOpenClassicalRepository{openClassical: testOpenClassical()},
			body:     mustJSON(t, validRequest()),
			wantCode: 200,
			wantUpdate: &database.OpenClassicalPairingUpdate{
				Region:       "A",
				Section:      "Open",
				Round:        0,
				PairingIndex: 0,
				Pairing: &database.OpenClassicalPairing{
					White:    testOpenClassical().Sections["A_Open"].Rounds[0].Pairings[0].White,
					Black:    testOpenClassical().Sections["A_Open"].Rounds[0].Pairings[0].Black,
					Result:   "1-0",
					Notes:    "Good game",
					Verified: false,
				},
			},
			wantResponse: true,
		},
		{
			name:     "SuccessfulSubmissionWithScreenshots",
			username: "test-user",
			repo:     &mockOpenClassicalRepository{openClassical: testOpenClassical()},
			media:    &mockMediaStore{},
			body: mustJSON(t, func() *SubmitResultsRequest {
				req := validRequest()
				req.ScreenshotsData = []string{"dGVzdDE=", "dGVzdDI="}
				return req
			}()),
			wantCode: 200,
			wantUpdate: &database.OpenClassicalPairingUpdate{
				Region:       "A",
				Section:      "Open",
				Round:        0,
				PairingIndex: 0,
				Pairing: &database.OpenClassicalPairing{
					White:    testOpenClassical().Sections["A_Open"].Rounds[0].Pairings[0].White,
					Black:    testOpenClassical().Sections["A_Open"].Rounds[0].Pairings[0].Black,
					Result:   "1-0",
					Notes:    "Good game",
					Verified: false,
					Screenshots: []string{
						"/open-classical/2026-01/A/Open/r1/whiteplayer_blackplayer",
						"/open-classical/2026-01/A/Open/r1/whiteplayer_blackplayer",
					},
				},
			},
			wantUploads:  2,
			checkUploads: true,
			wantResponse: true,
		},
		{
			name:     "ScreenshotUploadFailure",
			username: "test-user",
			repo:     &mockOpenClassicalRepository{openClassical: testOpenClassical()},
			media:    &mockMediaStore{err: errors.New(500, "Temporary server error", "Failed to upload image")},
			body: mustJSON(t, func() *SubmitResultsRequest {
				req := validRequest()
				req.ScreenshotsData = []string{"dGVzdDE="}
				return req
			}()),
			wantCode: 500,
			wantErr:  true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			restore := resetDependencies(t)
			defer restore()

			if tc.repo != nil {
				repository = tc.repo
			}
			if tc.media != nil {
				mediaStore = tc.media
			}

			event := api.Request{
				RequestContext: events.APIGatewayV2HTTPRequestContext{
					RequestID: tc.name,
				},
				Body: tc.body,
			}
			if tc.username != "" {
				event.RequestContext.Authorizer = &events.APIGatewayV2HTTPRequestContextAuthorizerDescription{
					JWT: &events.APIGatewayV2HTTPRequestContextAuthorizerJWTDescription{
						Claims: map[string]string{
							"cognito:username": tc.username,
						},
					},
				}
			}

			got, err := Handler(ctx, event)
			if err != nil {
				t.Fatalf("Handler() error = %v, want nil", err)
			}
			if got.StatusCode != tc.wantCode {
				t.Fatalf("Handler() status = %d, want %d; body = %s", got.StatusCode, tc.wantCode, got.Body)
			}

			if tc.wantUpdate != nil {
				if tc.repo == nil || tc.repo.lastUpdate == nil {
					t.Fatal("Handler() did not persist update")
				}
				if diff := cmp.Diff(tc.wantUpdate, tc.repo.lastUpdate, cmpopts.EquateEmpty()); diff != "" {
					t.Fatalf("Handler() update diff (-want +got):\n%s", diff)
				}
			}

			if tc.checkUploads && tc.media != nil && len(tc.media.uploads) != tc.wantUploads {
				t.Fatalf("Handler() upload count = %d, want %d", len(tc.media.uploads), tc.wantUploads)
			}

			if tc.wantResponse {
				var gotOpenClassical database.OpenClassical
				if err := json.Unmarshal([]byte(got.Body), &gotOpenClassical); err != nil {
					t.Fatalf("json.Unmarshal() error = %v", err)
				}
				if gotOpenClassical.StartsAt != database.CurrentLeaderboard {
					t.Fatalf("Handler() StartsAt = %q, want %q", gotOpenClassical.StartsAt, database.CurrentLeaderboard)
				}
			}
		})
	}
}

func TestGetLichessGameEmptyGameId(t *testing.T) {
	t.Parallel()

	request := &SubmitResultsRequest{
		GameUrl: "https://lichess.org/",
		Result:  "1-0",
	}

	if err := getLichessGame(request); err != nil {
		t.Fatalf("getLichessGame() error = %v, want nil for empty game id", err)
	}
	if request.Verified {
		t.Fatal("getLichessGame() set Verified = true, want false")
	}
}

func TestGetChesscomGameEmptyGameId(t *testing.T) {
	t.Parallel()

	request := &SubmitResultsRequest{
		GameUrl: "https://www.chess.com/game/live/",
		Result:  "1-0",
	}

	if err := getChesscomGame(request); err != nil {
		t.Fatalf("getChesscomGame() error = %v, want nil for empty game id", err)
	}
	if request.Verified {
		t.Fatal("getChesscomGame() set Verified = true, want false")
	}
}

func mustJSON(t *testing.T, v any) string {
	t.Helper()

	body, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	return string(body)
}
