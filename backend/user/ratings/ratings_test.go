package ratings

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

const chesscomStatsBody = `{"chess_rapid": {"last": {"rating": 1500, "rd": 50}, "record": {"win": 10, "loss": 5, "draw": 2}}}`

// setupChesscom points the fetcher at a test server and captures sleeps.
func setupChesscom(t *testing.T, handler http.HandlerFunc) *[]time.Duration {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	originalHost := chesscomHost
	chesscomHost = server.URL
	t.Cleanup(func() { chesscomHost = originalHost })

	var slept []time.Duration
	sleepFunc = func(d time.Duration) { slept = append(slept, d) }
	t.Cleanup(func() { sleepFunc = time.Sleep })
	return &slept
}

func TestFetchChesscomRating_Success(t *testing.T) {
	var gotUserAgent string
	setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		gotUserAgent = r.Header.Get("User-Agent")
		_, _ = w.Write([]byte(chesscomStatsBody))
	})

	rating, err := FetchChesscomRating("testuser")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if rating.CurrentRating != 1500 {
		t.Errorf("expected rating 1500, got %d", rating.CurrentRating)
	}
	if rating.NumGames != 17 {
		t.Errorf("expected 17 games, got %d", rating.NumGames)
	}
	if gotUserAgent != chesscomUserAgent {
		t.Errorf("expected User-Agent %q, got %q", chesscomUserAgent, gotUserAgent)
	}
}

func TestFetchChesscomRating_DoesNotRetry429(t *testing.T) {
	calls := 0
	slept := setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(429)
	})

	_, err := FetchChesscomRating("testuser")
	if err == nil {
		t.Fatal("expected error from single-attempt fetch")
	}
	if calls != 1 {
		t.Errorf("interactive fetch must not retry, got %d calls", calls)
	}
	if len(*slept) != 0 {
		t.Errorf("interactive fetch must not sleep, got %v", *slept)
	}
	var apiErr *errors.Error
	if !errors.As(err, &apiErr) || apiErr.Code != 429 {
		t.Errorf("expected api error with code 429, got %v", err)
	}
}

func TestFetchChesscomRatingWithRetry_RetriesOn429ThenSucceeds(t *testing.T) {
	calls := 0
	slept := setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls < 3 {
			w.WriteHeader(429)
			return
		}
		_, _ = w.Write([]byte(chesscomStatsBody))
	})

	rating, err := FetchChesscomRatingWithRetry("testuser")
	if err != nil {
		t.Fatalf("expected success after retries, got %v", err)
	}
	if rating.CurrentRating != 1500 {
		t.Errorf("expected rating 1500, got %d", rating.CurrentRating)
	}
	if calls != 3 {
		t.Errorf("expected 3 attempts, got %d", calls)
	}
	if len(*slept) != 2 {
		t.Fatalf("expected 2 sleeps, got %d", len(*slept))
	}
	// Backoff base is 1s then 2s, each plus up to 500ms jitter.
	if (*slept)[0] < time.Second || (*slept)[0] > time.Second+500*time.Millisecond {
		t.Errorf("first sleep out of range: %v", (*slept)[0])
	}
	if (*slept)[1] < 2*time.Second || (*slept)[1] > 2*time.Second+500*time.Millisecond {
		t.Errorf("second sleep out of range: %v", (*slept)[1])
	}
}

func TestFetchChesscomRatingWithRetry_GivesUpAfterThree429s(t *testing.T) {
	calls := 0
	setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(429)
	})

	_, err := FetchChesscomRatingWithRetry("testuser")
	if err == nil {
		t.Fatal("expected error after exhausting retries")
	}
	if calls != 3 {
		t.Errorf("expected 3 attempts, got %d", calls)
	}
	if errors.Is(err, ErrNotFound) {
		t.Error("429 give-up must not be ErrNotFound")
	}
	var apiErr *errors.Error
	if !errors.As(err, &apiErr) || apiErr.Code != 429 {
		t.Errorf("expected api error with code 429 on give-up, got %v", err)
	}
}

func TestFetchChesscomRatingWithRetry_HonorsRetryAfter(t *testing.T) {
	calls := 0
	slept := setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.Header().Set("Retry-After", "3")
			w.WriteHeader(429)
			return
		}
		_, _ = w.Write([]byte(chesscomStatsBody))
	})

	if _, err := FetchChesscomRatingWithRetry("testuser"); err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(*slept) != 1 || (*slept)[0] != 3*time.Second {
		t.Errorf("expected exactly one 3s sleep, got %v", *slept)
	}
}

func TestFetchChesscomRatingWithRetry_HonorsRetryAfterDate(t *testing.T) {
	calls := 0
	slept := setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.Header().Set("Retry-After", time.Now().Add(3*time.Second).UTC().Format(http.TimeFormat))
			w.WriteHeader(429)
			return
		}
		_, _ = w.Write([]byte(chesscomStatsBody))
	})

	if _, err := FetchChesscomRatingWithRetry("testuser"); err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(*slept) != 1 || (*slept)[0] <= 0 || (*slept)[0] > 3*time.Second {
		t.Errorf("expected one sleep of at most 3s from date header, got %v", *slept)
	}
}

func TestFetchChesscomRatingWithRetry_GivesUpOnLongRetryAfter(t *testing.T) {
	calls := 0
	slept := setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Header().Set("Retry-After", "30")
		w.WriteHeader(429)
	})

	_, err := FetchChesscomRatingWithRetry("testuser")
	if err == nil {
		t.Fatal("expected error for Retry-After above the cap")
	}
	if calls != 1 {
		t.Errorf("expected 1 attempt (no retry), got %d", calls)
	}
	if len(*slept) != 0 {
		t.Errorf("expected no sleeps, got %v", *slept)
	}
}

func TestFetchChesscomRating_404IsErrNotFound(t *testing.T) {
	setupChesscom(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(404)
	})

	_, err := FetchChesscomRating("missinguser")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
	var apiErr *errors.Error
	if !errors.As(err, &apiErr) || apiErr.Code != 404 {
		t.Errorf("expected api error with code 404, got %v", err)
	}
}

func setupLichess(t *testing.T, handler http.HandlerFunc) {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	originalHost := lichessHost
	lichessHost = server.URL
	t.Cleanup(func() { lichessHost = originalHost })
}

func TestFetchBulkLichessRatings_ErrorOnNon200(t *testing.T) {
	setupLichess(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(429)
	})

	_, err := FetchBulkLichessRatings([]string{"user1"})
	if err == nil {
		t.Fatal("expected error for non-200 bulk response")
	}
}

func TestFetchBulkLichessRatings_Success(t *testing.T) {
	setupLichess(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`[{"id": "user1", "username": "User1", "perfs": {"classical": {"rating": 1800, "games": 100, "rd": 45, "prov": false}}}]`))
	})

	result, err := FetchBulkLichessRatings([]string{"User1"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if r, ok := result["user1"]; !ok || r.Performances.Classical.Rating != 1800 {
		t.Errorf("expected user1 with rating 1800, got %+v", result)
	}
}

func TestMonthlyFetchers_PreservePlayerNotFoundStatus(t *testing.T) {
	originalClient := client
	t.Cleanup(func() { client = originalClient })
	client = http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusNotFound,
			Body:       io.NopCloser(strings.NewReader("")),
			Header:     make(http.Header),
			Request:    req,
		}, nil
	})}

	tests := []struct {
		name  string
		fetch func() error
	}{
		{"USCF", func() error { _, err := FetchUscfRating("123"); return err }},
		{"ECF", func() error { _, err := FetchEcfRating("123"); return err }},
		{"ACF", func() error { _, err := FetchAcfRating("123"); return err }},
		{"KNSB player", func() error { _, err := fetchKnsbListRating("123", 1); return err }},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.fetch()
			var apiErr *errors.Error
			if !errors.As(err, &apiErr) || apiErr.Code != http.StatusNotFound {
				t.Fatalf("expected API 404, got %v", err)
			}
		})
	}
}
