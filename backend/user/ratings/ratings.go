package ratings

import (
	"encoding/json"
	stderrors "errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

var client = http.Client{Timeout: 5 * time.Second}

// ErrNotFound indicates the rating system reports no account for the given
// username/ID. Fetch errors wrap it so callers can distinguish a missing
// account from a transient failure.
var ErrNotFound = stderrors.New("username not found in rating system")

var chesscomHost = "https://api.chess.com"
var lichessHost = "https://lichess.org"
var sleepFunc = time.Sleep

func ratingResponseErrorCode(status int) int {
	if status == http.StatusNotFound {
		return http.StatusNotFound
	}
	return http.StatusBadRequest
}

const chesscomUserAgent = "ChessDojo rating updater (https://www.chessdojo.club)"
const maxChesscomAttempts = 3
const maxRetryAfter = 10 * time.Second

var acfRegexp, _ = regexp.Compile(`Current Rating:\s*</div>\s*<div id="stats-box-data-col">\s*[-\d]*\s*</div>\s*<div id="stats-box-data-col">\s*(\d+)`)

type ChesscomResponse struct {
	Rapid struct {
		Last struct {
			Rating    int `json:"rating"`
			Deviation int `json:"rd"`
		} `json:"last"`

		Record struct {
			Wins   int `json:"win"`
			Losses int `json:"loss"`
			Draws  int `json:"draw"`
		} `json:"record"`
	} `json:"chess_rapid"`
}

type LichessResponse struct {
	Id       string `json:"id"`
	Username string `json:"username"`

	Performances struct {
		Classical struct {
			Rating        int  `json:"rating"`
			NumGames      int  `json:"games"`
			Deviation     int  `json:"rd"`
			IsProvisional bool `json:"prov"`
		} `json:"classical"`
	} `json:"perfs"`

	TosViolation bool `json:"tosViolation"`
}

type EcfResponse struct {
	Rating int `json:"revised_rating"`
}

type CfcResponse struct {
	Player struct {
		Rating int `json:"regular_rating"`
	} `json:"player"`
}

type KnsbResponse struct {
	Rating   int `json:"rating"`
	NumGames int `json:"num_played"`
}

type KnsbList struct {
	ListId   int    `json:"list_id"`
	Category string `json:"category"`
}

type KnsbListResponse struct {
	Items []KnsbList `json:"items"`
}

type UscfRating struct {
	Rating        int    `json:"rating"`
	RatingSystem  string `json:"ratingSystem"`
	NumGames      int    `json:"gamesPlayed"`
	IsProvisional bool   `json:"isProvisional"`
}

type UscfResponse struct {
	Ratings []UscfRating `json:"ratings"`
}

type RatingFetchFunc func(username string) (*database.Rating, error)

var RatingFetchFuncs map[database.RatingSystem]RatingFetchFunc = map[database.RatingSystem]RatingFetchFunc{
	database.Chesscom: FetchChesscomRating,
	database.Lichess:  FetchLichessRating,
	database.Fide:     FetchFideRating,
	database.Uscf:     FetchUscfRating,
	database.Ecf:      FetchEcfRating,
	database.Cfc:      FetchCfcRating,
	database.Dwz:      FetchDwzRating,
	database.Acf:      FetchAcfRating,
	database.Knsb:     FetchKnsbRating,
}

// FetchChesscomRating fetches with a single attempt. It is called
// synchronously by the profile-update API, where retry sleeps would push
// requests past the API Gateway timeout.
func FetchChesscomRating(chesscomUsername string) (*database.Rating, error) {
	return fetchChesscomRating(chesscomUsername, 1)
}

// FetchChesscomRatingWithRetry retries 429 responses. Batch pipeline only.
func FetchChesscomRatingWithRetry(chesscomUsername string) (*database.Rating, error) {
	return fetchChesscomRating(chesscomUsername, maxChesscomAttempts)
}

func fetchChesscomRating(chesscomUsername string, maxAttempts int) (*database.Rating, error) {
	resp, err := getChesscomStats(chesscomUsername, maxAttempts)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var rating ChesscomResponse
	err = json.NewDecoder(resp.Body).Decode(&rating)
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to read chess.com response", err)
		return nil, err
	}

	dojoRating := &database.Rating{
		CurrentRating: rating.Rapid.Last.Rating,
		Deviation:     rating.Rapid.Last.Deviation,
		NumGames:      rating.Rapid.Record.Wins + rating.Rapid.Record.Draws + rating.Rapid.Record.Losses,
	}

	return dojoRating, nil
}

// getChesscomStats requests the user's stats, retrying on 429 responses up to
// maxAttempts total attempts. On success the caller owns the body.
func getChesscomStats(chesscomUsername string, maxAttempts int) (*http.Response, error) {
	url := fmt.Sprintf("%s/pub/player/%s/stats", chesscomHost, chesscomUsername)

	for attempt := 1; ; attempt++ {
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, errors.Wrap(500, "Temporary server error", "Failed to create chess.com request", err)
		}
		req.Header.Set("User-Agent", chesscomUserAgent)

		resp, err := client.Do(req)
		if err != nil {
			return nil, errors.Wrap(500, "Temporary server error", "Failed to get chess.com stats", err)
		}

		switch {
		case resp.StatusCode == http.StatusOK:
			return resp, nil
		case resp.StatusCode == http.StatusNotFound:
			resp.Body.Close()
			return nil, errors.Wrap(404, "Invalid request: chess.com returned status `404` for given player", "", ErrNotFound)
		case resp.StatusCode == http.StatusTooManyRequests && attempt < maxAttempts:
			resp.Body.Close()
			wait, ok := chesscomRetryDelay(resp.Header.Get("Retry-After"), attempt)
			if !ok {
				return nil, errors.New(429, "Temporary server error: chess.com rate limit requested a wait longer than the cap", "")
			}
			sleepFunc(wait)
		case resp.StatusCode == http.StatusTooManyRequests:
			resp.Body.Close()
			return nil, errors.New(429, "Temporary server error: chess.com rate limit exceeded", "")
		default:
			resp.Body.Close()
			return nil, errors.New(400, fmt.Sprintf("Invalid request: chess.com returned status `%d` for given player", resp.StatusCode), "")
		}
	}
}

// chesscomRetryDelay returns how long to wait before the next attempt, or
// ok=false if the server requested a wait longer than maxRetryAfter.
func chesscomRetryDelay(retryAfter string, attempt int) (time.Duration, bool) {
	if seconds, err := strconv.Atoi(retryAfter); err == nil {
		wait := time.Duration(seconds) * time.Second
		if wait > maxRetryAfter {
			return 0, false
		}
		return wait, true
	}
	if date, err := http.ParseTime(retryAfter); err == nil {
		wait := time.Until(date)
		if wait > maxRetryAfter {
			return 0, false
		}
		if wait < 0 {
			wait = 0
		}
		return wait, true
	}
	backoff := time.Duration(attempt) * time.Second
	jitter := time.Duration(rand.Int63n(int64(500 * time.Millisecond)))
	return backoff + jitter, true
}

func FetchLichessRating(lichessUsername string) (*database.Rating, error) {
	resp, err := client.Get(fmt.Sprintf("%s/api/user/%s", lichessHost, lichessUsername))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to get lichess stats", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		err = errors.New(400, fmt.Sprintf("Invalid request: lichess returned status `%d` for given player", resp.StatusCode), "")
		return nil, err
	}

	var rating LichessResponse
	err = json.NewDecoder(resp.Body).Decode(&rating)
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to read lichess response", err)
		return nil, err
	}

	dojoRating := &database.Rating{
		CurrentRating: rating.Performances.Classical.Rating,
		Deviation:     rating.Performances.Classical.Deviation,
		NumGames:      rating.Performances.Classical.NumGames,
		IsProvisional: rating.Performances.Classical.IsProvisional,
	}
	return dojoRating, nil
}

func FetchBulkLichessRatings(lichessUsernames []string) (map[string]LichessResponse, error) {
	log.Debugf("Fetching bulk lichess usernames: %#v", lichessUsernames)
	if len(lichessUsernames) == 0 {
		return make(map[string]LichessResponse, 0), nil
	}

	resp, err := client.Post(lichessHost+"/api/users", "text/plain", strings.NewReader(strings.Join(lichessUsernames, ",")))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to get lichess bulk stats", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New(500, "Temporary server error", fmt.Sprintf("Lichess bulk API returned status `%d`", resp.StatusCode))
	}

	var rs []*LichessResponse
	if err = json.NewDecoder(resp.Body).Decode(&rs); err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to read lichess response", err)
		return nil, err
	}

	result := make(map[string]LichessResponse, len(rs))
	for _, r := range rs {
		result[r.Id] = *r
	}
	log.Debugf("Bulk Lichess result: %#v", result)
	return result, nil
}

func findRating(body []byte, regex *regexp.Regexp) (int, error) {
	groups := regex.FindSubmatch(body)
	if len(groups) < 2 {
		err := errors.New(400, "Unable to find rating on website", "")
		return 0, err
	}

	rating, err := strconv.Atoi(string(groups[1]))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to convert rating to int", err)
		return 0, err
	}
	return rating, nil
}

func FetchFideRating(fideId string) (*database.Rating, error) {
	return database.DynamoDB.GetFideRating(strings.TrimSpace(fideId))
}

func FetchUscfRating(uscfId string) (*database.Rating, error) {
	resp, err := client.Get(fmt.Sprintf("https://ratings-api.uschess.org/api/v1/members/%s", uscfId))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to get USCF page", err)
		return nil, err
	}

	if resp.StatusCode != 200 {
		err = errors.New(ratingResponseErrorCode(resp.StatusCode), fmt.Sprintf("Invalid request: USCF returned status `%d` for given ID", resp.StatusCode), "")
		return nil, err
	}

	var uscfResp UscfResponse
	err = json.NewDecoder(resp.Body).Decode(&uscfResp)
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to read USCF response", err)
		return nil, err
	}

	var rating *UscfRating
	for _, r := range uscfResp.Ratings {
		if r.RatingSystem == "R" {
			// Regular rating
			rating = &r
		}
	}

	if rating == nil {
		return nil, errors.New(404, "Invalid request: USCF member does not have a regular rating", "")
	}

	return &database.Rating{
		CurrentRating: rating.Rating,
		NumGames:      rating.NumGames,
		IsProvisional: rating.IsProvisional,
	}, nil
}

func FetchEcfRating(ecfId string) (*database.Rating, error) {
	resp, err := client.Get(fmt.Sprintf("https://rating.englishchess.org.uk/v2/new/api.php?v2/ratings/S/%s/%s", ecfId, time.Now().Format(time.DateOnly)))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed call to ECF API", err)
		return nil, err
	}

	if resp.StatusCode != 200 {
		err = errors.New(ratingResponseErrorCode(resp.StatusCode), fmt.Sprintf("Invalid request: ECF API returned status `%d`", resp.StatusCode), "")
		return nil, err
	}

	var rating EcfResponse
	if err := json.NewDecoder(resp.Body).Decode(&rating); err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to parse ECF API response", err)
		return nil, err
	}

	return &database.Rating{CurrentRating: rating.Rating}, nil
}

func FetchCfcRating(cfcId string) (*database.Rating, error) {
	resp, err := client.Get(fmt.Sprintf("https://server.chess.ca/api/player/v1/%s", cfcId))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed call to CFC API", err)
		return nil, err
	}

	if resp.StatusCode != 200 {
		err = errors.New(400, fmt.Sprintf("Invalid request: CFC API returned status `%d`", resp.StatusCode), "")
		return nil, err
	}

	var r CfcResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to parse CFC API response", err)
		return nil, err
	}
	return &database.Rating{CurrentRating: r.Player.Rating}, nil
}

func FetchDwzRating(dwzId string) (*database.Rating, error) {
	resp, err := client.Get(fmt.Sprintf("https://www.schachbund.de/php/dewis/spieler.php?pkz=%s", dwzId))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed call to DWZ API", err)
		return nil, err
	}

	if resp.StatusCode != 200 {
		err = errors.New(400, fmt.Sprintf("Invalid request: DWZ API returned status `%d`", resp.StatusCode), "")
		return nil, err
	}

	b, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to read DWZ response", err)
		return nil, err
	}

	const ratingIndex = 13
	tokens := strings.Split(string(b), "|")
	if ratingIndex >= len(tokens) {
		err = errors.New(400, "Invalid request: DWZ API did not return a rating", fmt.Sprintf("ratingIndex out of bounds for tokens %v", tokens))
		return nil, err
	}

	rating, err := strconv.Atoi(tokens[ratingIndex])
	if err != nil {
		return nil, errors.Wrap(400, fmt.Sprintf("Invalid request: DWZ API returned rating `%s` which cannot be converted to integer", tokens[14]), "", err)
	}
	return &database.Rating{CurrentRating: rating}, nil
}

func FetchAcfRating(acfId string) (*database.Rating, error) {
	resp, err := client.Get(fmt.Sprintf("https://sachess.org.au/ratings/player?id=%s", acfId))
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to fetch ACF site", err)
	}

	if resp.StatusCode != 200 {
		err = errors.New(ratingResponseErrorCode(resp.StatusCode), fmt.Sprintf("Invalid request: ACF site returned status `%d`", resp.StatusCode), "")
		return nil, err
	}

	b, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to read ACF response", err)
		return nil, err
	}

	rating, err := findRating(b, acfRegexp)
	if err != nil {
		log.Warnf("ACF id %q: no rating found on website", acfId)
		rating = 0
	}
	return &database.Rating{CurrentRating: rating}, nil
}

func FetchKnsbRating(knsbId string) (*database.Rating, error) {
	resp, err := client.Get("https://ratingviewer.nl/rating-lists/index.json?page=1&pageSize=10")
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed call to KNSB list API", err)
	}
	if resp.StatusCode != 200 {
		return nil, errors.New(500, "Temporary server error", fmt.Sprintf("Invalid request: KNSB list API returned status `%d`", resp.StatusCode))
	}

	var listResp KnsbListResponse
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal KNSB list response", err)
	}

	for _, item := range listResp.Items {
		if item.Category == "C" {
			return fetchKnsbListRating(knsbId, item.ListId)
		}
	}
	return nil, errors.New(500, "Temporary server error", "Failed to find category C in KNSB list API response")
}

func fetchKnsbListRating(knsbId string, listId int) (*database.Rating, error) {
	resp, err := client.Get(fmt.Sprintf("https://ratingviewer.nl/metrics/ratingList/%s/%d.json", knsbId, listId))
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed call to KNSB API", err)
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New(ratingResponseErrorCode(resp.StatusCode), fmt.Sprintf("Invalid request: KNSB API returned status `%d`", resp.StatusCode), "")
	}

	var r KnsbResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to unmarshal KNSB response", err)
	}
	return &database.Rating{CurrentRating: r.Rating, NumGames: r.NumGames}, nil
}
