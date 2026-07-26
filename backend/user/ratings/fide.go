package ratings

import (
	"archive/zip"
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

const (
	fideListObjectKey = "players_list.zip"
	fideSrtngWidth    = len("SRtng")
)

var (
	fideRatingsBucket = os.Getenv("fideRatingsBucket")
	fideS3Downloader  = s3manager.NewDownloader(session.Must(session.NewSession()))

	fideCacheMu sync.Mutex
	fideCache   map[string]int

	// loadFideRatingsMap downloads and parses the staged FIDE list. Replaced in tests.
	loadFideRatingsMap = loadFideRatingsMapFromS3
)

// FetchFideRating looks up a FIDE ID in the staged players_list.zip. The full
// list is downloaded from S3 once per Lambda instance and cached in memory for
// subsequent lookups.
func FetchFideRating(fideId string) (*database.Rating, error) {
	id := strings.TrimSpace(fideId)
	ratings, err := cachedFideRatings()
	if err != nil {
		return nil, err
	}
	rating, ok := ratings[id]
	if !ok {
		return nil, errors.New(404, "Invalid request: FIDE ID not found in rating list", fmt.Sprintf("FIDE ID %q not in list", id))
	}
	return &database.Rating{CurrentRating: rating}, nil
}

func cachedFideRatings() (map[string]int, error) {
	fideCacheMu.Lock()
	defer fideCacheMu.Unlock()
	if fideCache != nil {
		return fideCache, nil
	}
	log.Info("Loading FIDE rating list from S3 into memory cache")
	ratings, err := loadFideRatingsMap()
	if err != nil {
		return nil, err
	}
	fideCache = ratings
	log.Infof("Cached %d FIDE ratings", len(fideCache))
	return fideCache, nil
}

func loadFideRatingsMapFromS3() (map[string]int, error) {
	if fideRatingsBucket == "" {
		return nil, errors.New(500, "Temporary server error", "fideRatingsBucket environment variable is not set")
	}
	f, err := os.CreateTemp("", "players_list_*.zip")
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to create temp file for FIDE list", err)
	}
	path := f.Name()
	defer os.Remove(path)

	if _, err := fideS3Downloader.Download(f, &s3.GetObjectInput{
		Bucket: aws.String(fideRatingsBucket),
		Key:    aws.String(fideListObjectKey),
	}); err != nil {
		f.Close()
		return nil, errors.Wrap(500, "Temporary server error", "Failed to download staged FIDE rating list from S3", err)
	}
	if err := f.Close(); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to close FIDE list temp file", err)
	}
	return parseFideRatingsZip(path)
}

func parseFideRatingsZip(path string) (map[string]int, error) {
	reader, err := zip.OpenReader(path)
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to open FIDE list zip", err)
	}
	defer reader.Close()

	var txt *zip.File
	for _, f := range reader.File {
		if strings.HasSuffix(f.Name, ".txt") {
			txt = f
			break
		}
	}
	if txt == nil {
		return nil, errors.New(500, "Temporary server error", "FIDE list zip contains no .txt file")
	}
	contents, err := txt.Open()
	if err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed to open FIDE list txt", err)
	}
	defer contents.Close()

	scanner := bufio.NewScanner(contents)
	// Some FIDE lines exceed the default 64KiB token limit.
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	if !scanner.Scan() {
		return nil, errors.New(500, "Temporary server error", "FIDE list txt is empty")
	}
	parser, err := newFideListParser(scanner.Text())
	if err != nil {
		return nil, err
	}

	ratings := make(map[string]int, 2_000_000)
	for scanner.Scan() {
		id, rating, ok := parser.parse(scanner.Text())
		if ok {
			ratings[id] = rating
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, errors.Wrap(500, "Temporary server error", "Failed reading FIDE list", err)
	}
	return ratings, nil
}

// fideListParser extracts FIDE ID and standard rating from fixed-width lines.
// Column offsets come from the header so layout shifts fail loudly.
type fideListParser struct {
	idEnd       int
	ratingStart int
}

func newFideListParser(header string) (*fideListParser, error) {
	idStart := strings.Index(header, "ID Number")
	idEnd := strings.Index(header, "Name")
	ratingStart := strings.Index(header, "SRtng")
	if idStart != 0 || idEnd <= len("ID Number") || ratingStart <= idEnd {
		return nil, errors.New(500, "Temporary server error", "FIDE list header is missing or misorders ID Number, Name, or SRtng columns; wrong file?")
	}
	return &fideListParser{idEnd: idEnd, ratingStart: ratingStart}, nil
}

func (p *fideListParser) parse(line string) (string, int, bool) {
	if len(line) < p.ratingStart+fideSrtngWidth {
		return "", 0, false
	}
	id := strings.TrimSpace(line[:p.idEnd])
	if id == "" || strings.IndexFunc(id, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
		return "", 0, false
	}
	field := strings.TrimSpace(line[p.ratingStart : p.ratingStart+fideSrtngWidth])
	if field == "" {
		return id, 0, true
	}
	rating, err := strconv.Atoi(field)
	if err != nil {
		return "", 0, false
	}
	return id, rating, true
}
