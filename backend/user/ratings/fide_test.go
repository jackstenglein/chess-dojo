package ratings

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

// Layout copied from the real July 2026 file: Name at 15, SRtng at 113.
const testFideHeader = "ID Number      Name                                                         Fed Sex Tit  WTit OTit           FOA SRtng SGm SK RRtng RGm Rk BRtng BGm BK B-day Flag"

func testFideLine(id, name, rating string) string {
	line := []byte(testFideHeader)
	for i := range line {
		line[i] = ' '
	}
	copy(line[0:], id)
	copy(line[15:], name)
	copy(line[113+5-len(rating):], rating)
	return string(line)
}

func writeTestFideZip(t *testing.T, lines []string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "players_list.zip")
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	w := zip.NewWriter(f)
	zf, err := w.Create("players_list_foa.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := zf.Write([]byte(strings.Join(lines, "\n"))); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	if err := f.Close(); err != nil {
		t.Fatal(err)
	}
	return path
}

func resetFideCache(t *testing.T) {
	t.Helper()
	fideCacheMu.Lock()
	defer fideCacheMu.Unlock()
	fideCache = nil
}

func TestFetchFideRating_UsesCache(t *testing.T) {
	resetFideCache(t)
	loads := 0
	orig := loadFideRatingsMap
	t.Cleanup(func() {
		loadFideRatingsMap = orig
		resetFideCache(t)
	})
	loadFideRatingsMap = func() (map[string]int, error) {
		loads++
		return map[string]int{"1503014": 2839, "123": 0}, nil
	}

	r1, err := FetchFideRating("1503014")
	if err != nil {
		t.Fatalf("first fetch: %v", err)
	}
	if r1.CurrentRating != 2839 {
		t.Errorf("expected 2839, got %d", r1.CurrentRating)
	}
	r2, err := FetchFideRating(" 123 ")
	if err != nil {
		t.Fatalf("second fetch: %v", err)
	}
	if r2.CurrentRating != 0 {
		t.Errorf("expected 0, got %d", r2.CurrentRating)
	}
	if loads != 1 {
		t.Errorf("expected one S3 load for both lookups, got %d", loads)
	}
}

func TestFetchFideRating_NotFound(t *testing.T) {
	resetFideCache(t)
	orig := loadFideRatingsMap
	t.Cleanup(func() {
		loadFideRatingsMap = orig
		resetFideCache(t)
	})
	loadFideRatingsMap = func() (map[string]int, error) {
		return map[string]int{"1": 1000}, nil
	}

	_, err := FetchFideRating("missing")
	if err == nil {
		t.Fatal("expected not-found error")
	}
}

func TestParseFideRatingsZip(t *testing.T) {
	path := writeTestFideZip(t, []string{
		testFideHeader,
		testFideLine("1503014", "Carlsen, Magnus", "2839"),
		"garbage",
		testFideLine("537001345", "A Arbhin Vanniarajan", "0"),
	})
	ratings, err := parseFideRatingsZip(path)
	if err != nil {
		t.Fatal(err)
	}
	if ratings["1503014"] != 2839 {
		t.Errorf("got %+v", ratings)
	}
	if ratings["537001345"] != 0 {
		t.Errorf("got %+v", ratings)
	}
	if len(ratings) != 2 {
		t.Errorf("expected 2 ratings, got %d", len(ratings))
	}
}

func TestParseFideRatingsZip_RejectsBadHeader(t *testing.T) {
	path := writeTestFideZip(t, []string{"WRONG HEADER", testFideLine("1", "A", "1000")})
	if _, err := parseFideRatingsZip(path); err == nil {
		t.Fatal("expected header error")
	}
}

func TestParseFideRatingsZip_RejectsCorruptZip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.zip")
	if err := os.WriteFile(path, []byte("not a zip"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := parseFideRatingsZip(path); err == nil {
		t.Fatal("expected zip error")
	}
}

func TestNewFideListParser_RejectsWrongHeader(t *testing.T) {
	if _, err := newFideListParser("ID Number      Name   Fed"); err == nil {
		t.Error("expected error for header without SRtng")
	}
	if _, err := newFideListParser(""); err == nil {
		t.Error("expected error for empty header")
	}
}

func TestFetchFideRating_PropagatesLoadError(t *testing.T) {
	resetFideCache(t)
	orig := loadFideRatingsMap
	t.Cleanup(func() {
		loadFideRatingsMap = orig
		resetFideCache(t)
	})
	loadFideRatingsMap = func() (map[string]int, error) {
		return nil, errors.New(500, "Temporary server error", "load failed")
	}
	if _, err := FetchFideRating("1"); err == nil {
		t.Fatal("expected load error")
	}
}
