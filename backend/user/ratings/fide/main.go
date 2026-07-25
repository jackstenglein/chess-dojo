// Package main implements the downloadFideRatings lambda, which imports the
// monthly FIDE rating list into the fide-ratings DynamoDB table.
package main

import (
	"archive/zip"
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/request"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"golang.org/x/sync/errgroup"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

const (
	srtngWidth        = len("SRtng")
	batchSize         = 25
	maxBatchAttempts  = 6
	metadataId        = "METADATA"
	numWriters        = 8
	maxMalformedLines = 1000
	ttlDuration       = 90 * 24 * time.Hour
)

// minImportRows guards against a truncated-but-parseable file: importing a
// small subset and recording its Last-Modified would block a rerun with the
// same file via the strictly-newer check. The combined list has ~1.9M rows.
// var (not const) so handler tests can use tiny fixtures.
var minImportRows = 1_000_000

var listUrl = "https://ratings.fide.com/download/players_list.zip"

// The shared ratings client has a 5s timeout; a ~44MB download needs its own.
var downloadClient = &http.Client{Timeout: 5 * time.Minute}

type dynamoClient interface {
	BatchWriteItemWithContext(ctx aws.Context, input *dynamodb.BatchWriteItemInput, opts ...request.Option) (*dynamodb.BatchWriteItemOutput, error)
	GetItemWithContext(ctx aws.Context, input *dynamodb.GetItemInput, opts ...request.Option) (*dynamodb.GetItemOutput, error)
	PutItemWithContext(ctx aws.Context, input *dynamodb.PutItemInput, opts ...request.Option) (*dynamodb.PutItemOutput, error)
}

var svc dynamoClient = dynamodb.New(session.Must(session.NewSession()))
var fideRatingsTable = os.Getenv("stage") + "-fide-ratings"
var sleepFunc = func(ctx context.Context, duration time.Duration) error {
	timer := time.NewTimer(duration)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// fideParser extracts FIDE ID and standard rating from fixed-width lines of
// the combined players list. Column offsets are derived from the header line
// so FIDE layout shifts fail loudly instead of silently misparsing.
type fideParser struct {
	idEnd       int
	ratingStart int
}

func newFideParser(header string) (*fideParser, error) {
	idStart := strings.Index(header, "ID Number")
	idEnd := strings.Index(header, "Name")
	ratingStart := strings.Index(header, "SRtng")
	if idStart != 0 || idEnd <= len("ID Number") || ratingStart <= idEnd {
		return nil, errors.New(500, "Temporary server error", "FIDE list header is missing or misorders ID Number, Name, or SRtng columns; wrong file?")
	}
	return &fideParser{idEnd: idEnd, ratingStart: ratingStart}, nil
}

func (p *fideParser) parse(line string) (string, int, bool) {
	if len(line) < p.ratingStart+srtngWidth {
		return "", 0, false
	}
	id := strings.TrimSpace(line[:p.idEnd])
	if id == "" || strings.IndexFunc(id, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
		return "", 0, false
	}
	field := strings.TrimSpace(line[p.ratingStart : p.ratingStart+srtngWidth])
	if field == "" {
		return id, 0, true
	}
	rating, err := strconv.Atoi(field)
	if err != nil {
		return "", 0, false
	}
	return id, rating, true
}

// writeBatch sends one BatchWriteItem, retrying unprocessed items with
// exponential backoff. The existing database.batchWrite is not used because
// it errors out on UnprocessedItems, which are expected at ~76K batches.
func writeBatch(ctx context.Context, reqs []*dynamodb.WriteRequest) error {
	for attempt := 1; ; attempt++ {
		output, err := svc.BatchWriteItemWithContext(ctx, &dynamodb.BatchWriteItemInput{
			RequestItems: map[string][]*dynamodb.WriteRequest{fideRatingsTable: reqs},
		})
		if err != nil {
			return errors.Wrap(500, "Temporary server error", "Failed DynamoDB BatchWriteItem", err)
		}
		unprocessed := output.UnprocessedItems[fideRatingsTable]
		if len(unprocessed) == 0 {
			return nil
		}
		if attempt >= maxBatchAttempts {
			return errors.New(500, "Temporary server error", fmt.Sprintf("%d items still unprocessed after %d attempts", len(unprocessed), attempt))
		}
		reqs = unprocessed
		if err := sleepFunc(ctx, time.Duration(1<<attempt)*100*time.Millisecond); err != nil {
			return errors.Wrap(500, "Temporary server error", "DynamoDB BatchWriteItem retry canceled", err)
		}
	}
}

// download fetches the list zip to ephemeral storage and returns the local
// path and the Last-Modified header. Downloading fully before parsing means
// no DynamoDB writes can happen on a failed or truncated download.
func download(ctx context.Context) (string, time.Time, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, listUrl, nil)
	if err != nil {
		return "", time.Time{}, errors.Wrap(500, "Temporary server error", "Failed to create FIDE rating list request", err)
	}
	resp, err := downloadClient.Do(req)
	if err != nil {
		return "", time.Time{}, errors.Wrap(500, "Temporary server error", "Failed to download FIDE rating list", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", time.Time{}, errors.New(500, "Temporary server error", fmt.Sprintf("FIDE list download returned status %d", resp.StatusCode))
	}
	lastModified, err := http.ParseTime(resp.Header.Get("Last-Modified"))
	if err != nil {
		return "", time.Time{}, errors.Wrap(500, "Temporary server error", "FIDE list response has no valid Last-Modified header", err)
	}

	f, err := os.CreateTemp("", "players_list_*.zip")
	if err != nil {
		return "", time.Time{}, errors.Wrap(500, "Temporary server error", "Failed to create temp file", err)
	}
	if _, err := io.Copy(f, resp.Body); err != nil {
		f.Close()
		os.Remove(f.Name())
		return "", time.Time{}, errors.Wrap(500, "Temporary server error", "Failed to write FIDE list to disk", err)
	}
	if err := f.Close(); err != nil {
		os.Remove(f.Name())
		return "", time.Time{}, errors.Wrap(500, "Temporary server error", "Failed to close temp file", err)
	}
	return f.Name(), lastModified, nil
}

// lastImportedModified returns the Last-Modified recorded by the previous
// successful import, or ok=false if none exists.
func lastImportedModified(ctx context.Context) (time.Time, bool, error) {
	output, err := svc.GetItemWithContext(ctx, &dynamodb.GetItemInput{
		Key:            map[string]*dynamodb.AttributeValue{"id": {S: aws.String(metadataId)}},
		TableName:      aws.String(fideRatingsTable),
		ConsistentRead: aws.Bool(true),
	})
	if err != nil {
		return time.Time{}, false, errors.Wrap(500, "Temporary server error", "Failed to get FIDE import metadata", err)
	}
	if output.Item == nil || output.Item["lastModified"] == nil || output.Item["lastModified"].S == nil {
		return time.Time{}, false, nil
	}
	stored, err := http.ParseTime(*output.Item["lastModified"].S)
	if err != nil {
		return time.Time{}, false, errors.Wrap(500, "Temporary server error", "Stored FIDE import metadata is invalid", err)
	}
	return stored, true, nil
}

func recordImport(ctx context.Context, lastModified time.Time, written int) error {
	lastModifiedUnix := strconv.FormatInt(lastModified.Unix(), 10)
	_, err := svc.PutItemWithContext(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(fideRatingsTable),
		ConditionExpression: aws.String("attribute_not_exists(lastModifiedUnix) OR lastModifiedUnix < :lastModifiedUnix"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":lastModifiedUnix": {N: aws.String(lastModifiedUnix)},
		},
		Item: map[string]*dynamodb.AttributeValue{
			"id":               {S: aws.String(metadataId)},
			"lastModified":     {S: aws.String(lastModified.UTC().Format(http.TimeFormat))},
			"lastModifiedUnix": {N: aws.String(lastModifiedUnix)},
			"importedAt":       {S: aws.String(time.Now().Format(time.RFC3339))},
			"written":          {N: aws.String(strconv.Itoa(written))},
		},
	})
	return errors.Wrap(500, "Temporary server error", "Failed to record FIDE import metadata", err)
}

// writeRatings streams parsed rows to a pool of batch writers. Returns the
// number of rows written and the number of malformed lines skipped.
func writeRatings(ctx context.Context, scanner *bufio.Scanner, parser *fideParser) (int, int, error) {
	expiresAt := time.Now().Add(ttlDuration).Unix()
	group, groupCtx := errgroup.WithContext(ctx)
	batches := make(chan []*dynamodb.WriteRequest)
	for range numWriters {
		group.Go(func() error {
			for reqs := range batches {
				if err := writeBatch(groupCtx, reqs); err != nil {
					return err
				}
			}
			return nil
		})
	}

	send := func(reqs []*dynamodb.WriteRequest) bool {
		select {
		case batches <- reqs:
			return true
		case <-groupCtx.Done():
			return false
		}
	}

	written, malformed := 0, 0
	var loopErr error
	var reqs []*dynamodb.WriteRequest
	for scanner.Scan() {
		id, rating, ok := parser.parse(scanner.Text())
		if !ok {
			malformed++
			if malformed > maxMalformedLines {
				loopErr = errors.New(500, "Temporary server error", fmt.Sprintf("FIDE list import aborted: more than %d malformed lines", maxMalformedLines))
				break
			}
			continue
		}
		item, err := dynamodbattribute.MarshalMap(database.FideRating{Id: id, Rating: rating, ExpiresAt: expiresAt})
		if err != nil {
			loopErr = errors.Wrap(500, "Temporary server error", "Failed to marshal FideRating", err)
			break
		}
		reqs = append(reqs, &dynamodb.WriteRequest{PutRequest: &dynamodb.PutRequest{Item: item}})
		if len(reqs) == batchSize {
			if !send(reqs) {
				loopErr = errors.Wrap(500, "Temporary server error", "FIDE list import canceled", groupCtx.Err())
				break
			}
			written += batchSize
			reqs = nil
		}
	}
	if loopErr == nil {
		if err := scanner.Err(); err != nil {
			loopErr = errors.Wrap(500, "Temporary server error", "Failed reading FIDE list", err)
		}
	}
	if loopErr == nil && len(reqs) > 0 {
		if send(reqs) {
			written += len(reqs)
		} else {
			loopErr = errors.Wrap(500, "Temporary server error", "FIDE list import canceled", groupCtx.Err())
		}
	}
	close(batches)
	if err := group.Wait(); err != nil {
		return written, malformed, err
	}
	if loopErr == nil && ctx.Err() != nil {
		loopErr = errors.Wrap(500, "Temporary server error", "FIDE list import canceled", ctx.Err())
	}
	return written, malformed, loopErr
}

func Handler(ctx context.Context, event events.CloudWatchEvent) error {
	log.SetRequestId(event.ID)

	path, lastModified, err := download(ctx)
	if err != nil {
		log.Error(err)
		return err
	}
	defer os.Remove(path)

	stored, ok, err := lastImportedModified(ctx)
	if err != nil {
		log.Error(err)
		return err
	}
	if ok && !lastModified.After(stored) {
		err := errors.New(500, "Temporary server error", fmt.Sprintf("FIDE list (Last-Modified %s) is not newer than last import (%s)", lastModified, stored))
		log.Error(err)
		return err
	}

	reader, err := zip.OpenReader(path)
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to open FIDE list zip", err)
		log.Error(err)
		return err
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
		err := errors.New(500, "Temporary server error", "FIDE list zip contains no .txt file")
		log.Error(err)
		return err
	}
	contents, err := txt.Open()
	if err != nil {
		err = errors.Wrap(500, "Temporary server error", "Failed to open FIDE list txt", err)
		log.Error(err)
		return err
	}
	defer contents.Close()

	scanner := bufio.NewScanner(contents)
	if !scanner.Scan() {
		err := errors.New(500, "Temporary server error", "FIDE list txt is empty")
		log.Error(err)
		return err
	}
	parser, err := newFideParser(scanner.Text())
	if err != nil {
		log.Error(err)
		return err
	}

	written, malformed, err := writeRatings(ctx, scanner, parser)
	if err != nil {
		log.Errorf("FIDE import failed after %d writes (%d malformed): %v", written, malformed, err)
		return err
	}
	if written < minImportRows {
		err := errors.New(500, "Temporary server error", fmt.Sprintf("FIDE import wrote only %d rows (minimum %d); refusing to record metadata for a truncated list", written, minImportRows))
		log.Error(err)
		return err
	}
	if err := ctx.Err(); err != nil {
		err = errors.Wrap(500, "Temporary server error", "FIDE list import canceled before recording metadata", err)
		log.Error(err)
		return err
	}
	if err := recordImport(ctx, lastModified, written); err != nil {
		log.Error(err)
		return err
	}
	log.Infof("FIDE import complete: written=%d malformed=%d lastModified=%s", written, malformed, lastModified)
	return nil
}

func main() {
	lambda.Start(Handler)
}
