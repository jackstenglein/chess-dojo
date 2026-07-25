package main

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/request"
	"github.com/aws/aws-sdk-go/service/dynamodb"
)

// Layout copied from the real July 2026 file: Name at 15, SRtng at 113.
const testHeader = "ID Number      Name                                                         Fed Sex Tit  WTit OTit           FOA SRtng SGm SK RRtng RGm Rk BRtng BGm BK B-day Flag"

func testLine(id, name, rating string) string {
	line := []byte(testHeader)
	for i := range line {
		line[i] = ' '
	}
	copy(line[0:], id)
	copy(line[15:], name)
	// Right-align within the 5-char SRtng column like the real file.
	copy(line[113+5-len(rating):], rating)
	return string(line)
}

func TestNewFideParser_RejectsWrongHeader(t *testing.T) {
	if _, err := newFideParser("ID Number      Name   Fed"); err == nil {
		t.Error("expected error for header without SRtng column")
	}
	if _, err := newFideParser(""); err == nil {
		t.Error("expected error for empty header")
	}
	if _, err := newFideParser("prefix Name SRtng"); err == nil {
		t.Error("expected error for header without ID Number column")
	}
	if _, err := newFideParser("ID Number SRtng Name"); err == nil {
		t.Error("expected error when SRtng appears before Name")
	}
}

func TestFideParser_ParsesRatedPlayer(t *testing.T) {
	p, err := newFideParser(testHeader)
	if err != nil {
		t.Fatal(err)
	}
	id, rating, ok := p.parse(testLine("1503014", "Carlsen, Magnus", "2839"))
	if !ok || id != "1503014" || rating != 2839 {
		t.Errorf("got id=%q rating=%d ok=%v", id, rating, ok)
	}
}

func TestFideParser_ParsesUnratedPlayer(t *testing.T) {
	p, _ := newFideParser(testHeader)
	id, rating, ok := p.parse(testLine("537001345", "A Arbhin Vanniarajan", "0"))
	if !ok || id != "537001345" || rating != 0 {
		t.Errorf("got id=%q rating=%d ok=%v", id, rating, ok)
	}
}

func TestFideParser_EmptyRatingFieldIsZero(t *testing.T) {
	p, _ := newFideParser(testHeader)
	id, rating, ok := p.parse(testLine("123", "Blank, Rating", ""))
	if !ok || id != "123" || rating != 0 {
		t.Errorf("got id=%q rating=%d ok=%v", id, rating, ok)
	}
}

func TestFideParser_RejectsMalformedLines(t *testing.T) {
	p, _ := newFideParser(testHeader)
	cases := []string{
		"",                                     // empty
		"short line",                           // shorter than rating column
		testLine("12ab34", "Bad, Id", "2000"),  // non-numeric id
		testLine("", "No, Id", "2000"),         // blank id
		testLine("123", "Bad, Rating", "2x00"), // non-numeric rating
	}
	for _, line := range cases {
		if _, _, ok := p.parse(line); ok {
			t.Errorf("expected parse failure for %q", line)
		}
	}
}

type fakeDynamo struct {
	batchInputs []*dynamodb.BatchWriteItemInput
	// unprocessed[i] is returned as UnprocessedItems for call i; extra calls
	// return none.
	unprocessed [][]*dynamodb.WriteRequest
	batchErr    error
	batchHook   func()

	getInputs []*dynamodb.GetItemInput
	getOutput *dynamodb.GetItemOutput
	getErr    error
	putInputs []*dynamodb.PutItemInput
	putErr    error
}

func (f *fakeDynamo) BatchWriteItemWithContext(ctx aws.Context, input *dynamodb.BatchWriteItemInput, opts ...request.Option) (*dynamodb.BatchWriteItemOutput, error) {
	call := len(f.batchInputs)
	f.batchInputs = append(f.batchInputs, input)
	if f.batchHook != nil {
		f.batchHook()
	}
	if f.batchErr != nil {
		return nil, f.batchErr
	}
	out := &dynamodb.BatchWriteItemOutput{UnprocessedItems: map[string][]*dynamodb.WriteRequest{}}
	if call < len(f.unprocessed) && len(f.unprocessed[call]) > 0 {
		out.UnprocessedItems[fideRatingsTable] = f.unprocessed[call]
	}
	return out, nil
}

func (f *fakeDynamo) GetItemWithContext(ctx aws.Context, input *dynamodb.GetItemInput, opts ...request.Option) (*dynamodb.GetItemOutput, error) {
	f.getInputs = append(f.getInputs, input)
	if f.getErr != nil {
		return nil, f.getErr
	}
	if f.getOutput != nil {
		return f.getOutput, nil
	}
	return &dynamodb.GetItemOutput{}, nil
}

func (f *fakeDynamo) PutItemWithContext(ctx aws.Context, input *dynamodb.PutItemInput, opts ...request.Option) (*dynamodb.PutItemOutput, error) {
	f.putInputs = append(f.putInputs, input)
	return &dynamodb.PutItemOutput{}, f.putErr
}

func setupDynamo(t *testing.T, fake *fakeDynamo) {
	t.Helper()
	origSvc, origSleep := svc, sleepFunc
	t.Cleanup(func() { svc, sleepFunc = origSvc, origSleep })
	svc = fake
	sleepFunc = func(context.Context, time.Duration) error { return nil }
}

func putReq(id string) *dynamodb.WriteRequest {
	return &dynamodb.WriteRequest{PutRequest: &dynamodb.PutRequest{
		Item: map[string]*dynamodb.AttributeValue{"id": {S: aws.String(id)}},
	}}
}

func TestWriteBatch_SucceedsFirstTry(t *testing.T) {
	fake := &fakeDynamo{}
	setupDynamo(t, fake)

	if err := writeBatch(context.Background(), []*dynamodb.WriteRequest{putReq("1")}); err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(fake.batchInputs) != 1 {
		t.Errorf("expected 1 call, got %d", len(fake.batchInputs))
	}
}

func TestWriteBatch_RetriesOnlyUnprocessedItems(t *testing.T) {
	fake := &fakeDynamo{unprocessed: [][]*dynamodb.WriteRequest{{putReq("2")}}}
	setupDynamo(t, fake)

	if err := writeBatch(context.Background(), []*dynamodb.WriteRequest{putReq("1"), putReq("2")}); err != nil {
		t.Fatalf("expected success after retry, got %v", err)
	}
	if len(fake.batchInputs) != 2 {
		t.Fatalf("expected 2 calls, got %d", len(fake.batchInputs))
	}
	retried := fake.batchInputs[1].RequestItems[fideRatingsTable]
	if len(retried) != 1 || *retried[0].PutRequest.Item["id"].S != "2" {
		t.Errorf("second call must contain only the unprocessed item, got %+v", retried)
	}
}

func TestWriteBatch_GivesUpAfterMaxAttempts(t *testing.T) {
	stuck := make([][]*dynamodb.WriteRequest, maxBatchAttempts)
	for i := range stuck {
		stuck[i] = []*dynamodb.WriteRequest{putReq("1")}
	}
	fake := &fakeDynamo{unprocessed: stuck}
	setupDynamo(t, fake)

	if err := writeBatch(context.Background(), []*dynamodb.WriteRequest{putReq("1")}); err == nil {
		t.Fatal("expected error when items never process")
	}
	if len(fake.batchInputs) != maxBatchAttempts {
		t.Errorf("expected %d attempts, got %d", maxBatchAttempts, len(fake.batchInputs))
	}
}

func TestWriteBatch_RequestErrorFails(t *testing.T) {
	fake := &fakeDynamo{batchErr: fmt.Errorf("network down")}
	setupDynamo(t, fake)

	if err := writeBatch(context.Background(), []*dynamodb.WriteRequest{putReq("1")}); err == nil {
		t.Fatal("expected error")
	}
}

// buildZip returns an in-memory players_list.zip containing the given lines.
func buildZip(t *testing.T, lines []string) []byte {
	t.Helper()
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	f, err := w.Create("players_list_foa.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.Write([]byte(strings.Join(lines, "\n"))); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func serveZip(t *testing.T, body []byte, lastModified time.Time) {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Last-Modified", lastModified.UTC().Format(http.TimeFormat))
		w.Write(body)
	}))
	t.Cleanup(server.Close)
	origUrl, origFloor := listUrl, minImportRows
	t.Cleanup(func() { listUrl, minImportRows = origUrl, origFloor })
	listUrl = server.URL
	// Handler tests use tiny fixtures; the production floor is exercised by
	// its dedicated test.
	minImportRows = 1
}

func metadataOutput(lastModified time.Time) *dynamodb.GetItemOutput {
	return &dynamodb.GetItemOutput{Item: map[string]*dynamodb.AttributeValue{
		"id":           {S: aws.String(metadataId)},
		"lastModified": {S: aws.String(lastModified.UTC().Format(http.TimeFormat))},
	}}
}

func handlerEvent() events.CloudWatchEvent {
	return events.CloudWatchEvent{ID: "DownloadFideRatings"}
}

func TestHandler_ImportsListAndRecordsMetadata(t *testing.T) {
	published := time.Date(2026, 7, 20, 21, 3, 32, 0, time.UTC)
	lines := []string{
		testHeader,
		testLine("1503014", "Carlsen, Magnus", "2839"),
		testLine("537001345", "A Arbhin Vanniarajan", "0"),
	}
	serveZip(t, buildZip(t, lines), published)
	fake := &fakeDynamo{}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(fake.batchInputs) != 1 {
		t.Fatalf("expected 1 batch write, got %d", len(fake.batchInputs))
	}
	items := fake.batchInputs[0].RequestItems[fideRatingsTable]
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	first := items[0].PutRequest.Item
	if *first["id"].S != "1503014" || *first["rating"].N != "2839" {
		t.Errorf("unexpected first item: %+v", first)
	}
	if first["expiresAt"] == nil {
		t.Error("expected expiresAt TTL attribute")
	}
	if len(fake.putInputs) != 1 {
		t.Fatalf("expected metadata PutItem, got %d", len(fake.putInputs))
	}
	meta := fake.putInputs[0].Item
	if *meta["id"].S != metadataId || *meta["lastModified"].S != "Mon, 20 Jul 2026 21:03:32 GMT" {
		t.Errorf("unexpected metadata item: %+v", meta)
	}
	if meta["lastModifiedUnix"] == nil || *meta["lastModifiedUnix"].N != fmt.Sprintf("%d", published.Unix()) {
		t.Errorf("metadata must include numeric Last-Modified for ordering: %+v", meta)
	}
	if fake.putInputs[0].ConditionExpression == nil {
		t.Error("metadata write must be conditional so Last-Modified cannot move backward")
	}
	if len(fake.getInputs) != 1 || !aws.BoolValue(fake.getInputs[0].ConsistentRead) {
		t.Error("freshness metadata must use a strongly consistent read")
	}
}

func TestHandler_AbortsWhenListNotNewerThanLastImport(t *testing.T) {
	published := time.Date(2026, 7, 20, 21, 3, 32, 0, time.UTC)
	serveZip(t, buildZip(t, []string{testHeader, testLine("1", "A", "1000")}), published)
	fake := &fakeDynamo{getOutput: metadataOutput(published)}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err == nil {
		t.Fatal("expected error for not-newer list")
	}
	if len(fake.batchInputs) != 0 || len(fake.putInputs) != 0 {
		t.Error("must not write anything when the list is not newer")
	}
}

func TestHandler_ImportsWhenListIsNewer(t *testing.T) {
	serveZip(t, buildZip(t, []string{testHeader, testLine("1", "A", "1000")}), time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC))
	fake := &fakeDynamo{getOutput: metadataOutput(time.Date(2026, 7, 20, 21, 3, 32, 0, time.UTC))}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(fake.batchInputs) != 1 {
		t.Errorf("expected 1 batch write, got %d", len(fake.batchInputs))
	}
}

func TestHandler_AbortsOnWrongHeaderWithoutWrites(t *testing.T) {
	serveZip(t, buildZip(t, []string{"WRONG HEADER", testLine("1", "A", "1000")}), time.Now())
	fake := &fakeDynamo{}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err == nil {
		t.Fatal("expected error for wrong header")
	}
	if len(fake.batchInputs) != 0 || len(fake.putInputs) != 0 {
		t.Error("must not write anything on header mismatch")
	}
}

func TestHandler_AbortsOnBadZipWithoutWrites(t *testing.T) {
	serveZip(t, []byte("this is not a zip"), time.Now())
	fake := &fakeDynamo{}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err == nil {
		t.Fatal("expected error for corrupt zip")
	}
	if len(fake.batchInputs) != 0 || len(fake.putInputs) != 0 {
		t.Error("must not write anything on corrupt zip")
	}
}

func TestHandler_WriteFailureSkipsMetadata(t *testing.T) {
	serveZip(t, buildZip(t, []string{testHeader, testLine("1", "A", "1000")}), time.Now())
	fake := &fakeDynamo{batchErr: fmt.Errorf("throttled forever")}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err == nil {
		t.Fatal("expected error when writes fail")
	}
	if len(fake.putInputs) != 0 {
		t.Error("metadata must not be recorded after failed writes")
	}
}

func TestHandler_AbortsBelowRowFloorWithoutMetadata(t *testing.T) {
	serveZip(t, buildZip(t, []string{testHeader, testLine("1", "A", "1000")}), time.Now())
	minImportRows = 5 // one row is below the floor
	fake := &fakeDynamo{}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err == nil {
		t.Fatal("expected error when fewer rows than the floor were written")
	}
	if len(fake.putInputs) != 0 {
		t.Error("metadata must not be recorded for an incomplete import")
	}
}

func TestHandler_SkipsMalformedLinesButCountsThem(t *testing.T) {
	lines := []string{
		testHeader,
		testLine("1", "A", "1000"),
		"garbage line",
		testLine("2", "B", "1200"),
	}
	serveZip(t, buildZip(t, lines), time.Now())
	fake := &fakeDynamo{}
	setupDynamo(t, fake)

	if err := Handler(context.Background(), handlerEvent()); err != nil {
		t.Fatalf("expected success with skipped line, got %v", err)
	}
	items := fake.batchInputs[0].RequestItems[fideRatingsTable]
	if len(items) != 2 {
		t.Errorf("expected 2 items (malformed skipped), got %d", len(items))
	}
}

func TestHandler_CancellationAfterWritesSkipsMetadata(t *testing.T) {
	lines := []string{testHeader}
	for i := 0; i < batchSize; i++ {
		lines = append(lines, testLine(fmt.Sprintf("%d", i+1), "A", "1000"))
	}
	serveZip(t, buildZip(t, lines), time.Now())

	ctx, cancel := context.WithCancel(context.Background())
	fake := &fakeDynamo{batchHook: cancel}
	setupDynamo(t, fake)

	if err := Handler(ctx, handlerEvent()); err == nil {
		t.Fatal("expected cancellation error")
	}
	if len(fake.batchInputs) != 1 {
		t.Fatalf("expected first batch to be submitted before cancellation, got %d", len(fake.batchInputs))
	}
	if len(fake.putInputs) != 0 {
		t.Error("metadata must not be recorded after cancellation")
	}
}
