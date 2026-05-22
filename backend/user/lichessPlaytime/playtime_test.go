package lichessplaytime

import (
	"testing"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/lichess"
)

func TestBuildTrainingPlanEntry_UsesRequirement(t *testing.T) {
	t.Parallel()
	u := &database.User{
		Username:         "u1",
		DisplayName:      "U1",
		DojoCohort:       "1500-1600",
		TimezoneOverride: "UTC",
	}
	g := &lichess.Game{
		ID:         "g1",
		CreatedAt:  time.Date(2024, 3, 1, 10, 0, 0, 0, time.UTC).UnixMilli(),
		LastMoveAt: time.Date(2024, 3, 1, 10, 30, 0, 0, time.UTC).UnixMilli(),
		Speed:      lichess.TimeClassRapid,
		Rated:      true,
		Players: lichess.Players{
			White: lichess.Player{User: &lichess.User{ID: "a", Name: "A"}},
			Black: lichess.Player{User: &lichess.User{ID: "b", Name: "B"}},
		},
	}
	task := &database.Requirement{
		Id:                  "req-rapid",
		Name:                "Play Rapid Games",
		Category:            GamesCategory,
		ScoreboardDisplay:   database.ProgressBar,
		NumberOfCohorts:     2,
		Counts:              map[database.DojoCohort]int{"1500-1600": 50},
		UnitScore:           0.5,
	}
	at := time.Date(2024, 3, 2, 0, 0, 0, 0, time.UTC)
	e := BuildTrainingPlanEntry(u, g, task, "1500-1600", "1500-1600", 2, 3, 30, 90, 0.5, 1.0, at)
	if e.RequirementId != "req-rapid" {
		t.Fatalf("requirementId = %q", e.RequirementId)
	}
	if e.Id != "2024-03-01_lichess_req-rapid_g1" {
		t.Fatalf("id = %q", e.Id)
	}
	if e.NewCount != 3 || e.PreviousCount != 2 {
		t.Fatalf("counts %d -> %d", e.PreviousCount, e.NewCount)
	}
}

func TestPlaytimeMinutes(t *testing.T) {
	t.Parallel()
	g := &lichess.Game{CreatedAt: 0, LastMoveAt: 3_600_000} // 1 hour
	if got := PlaytimeMinutes(g); got != 60 {
		t.Fatalf("got %d, want 60", got)
	}
}

func TestPlaytimeMinutes_Cap(t *testing.T) {
	t.Parallel()
	g := &lichess.Game{CreatedAt: 0, LastMoveAt: int64(24 * time.Hour / time.Millisecond)}
	if got := PlaytimeMinutes(g); got != maxGameMinutes {
		t.Fatalf("got %d, want cap %d", got, maxGameMinutes)
	}
}

func TestLocalDateKey(t *testing.T) {
	t.Parallel()
	// 2024-01-28 01:00 UTC -> still 27th in Los Angeles
	ms := time.Date(2024, 1, 28, 1, 0, 0, 0, time.UTC).UnixMilli()
	if got := localDateKey(ms, "America/Los_Angeles"); got != "2024-01-27" {
		t.Fatalf("got %q", got)
	}
}

func TestBuildFallbackEntry_IdAndCategory(t *testing.T) {
	t.Parallel()
	u := &database.User{
		Username:          "dojo_user",
		DisplayName:       "Dojo User",
		DojoCohort:        "1500-1600",
		TimezoneOverride:  "UTC",
		Ratings:           map[database.RatingSystem]*database.Rating{database.Lichess: {Username: "liuser"}},
	}
	g := &lichess.Game{
		ID:         "gameXYZ1",
		Rated:      true,
		Speed:      lichess.TimeClassBlitz,
		Variant:    "standard",
		CreatedAt:  time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC).UnixMilli(),
		LastMoveAt: time.Date(2024, 1, 15, 12, 45, 0, 0, time.UTC).UnixMilli(),
		Players: lichess.Players{
			White: lichess.Player{User: &lichess.User{ID: "liuser", Name: "LiUser"}},
			Black: lichess.Player{User: &lichess.User{ID: "opp", Name: "Opp"}},
		},
	}
	at := time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC)
	e := BuildFallbackEntry(u, g, at)
	if e.Id != "2024-01-15_lichess_gameXYZ1" {
		t.Fatalf("id = %q", e.Id)
	}
	if e.RequirementId != SpecialRequirementID {
		t.Fatalf("requirementId = %q", e.RequirementId)
	}
	if e.RequirementCategory != GamesCategory {
		t.Fatalf("category = %q", e.RequirementCategory)
	}
	if e.MinutesSpent != 45 {
		t.Fatalf("minutes = %d", e.MinutesSpent)
	}
	if e.DojoPoints != 0 {
		t.Fatalf("dojoPoints = %f", e.DojoPoints)
	}
}

func TestShouldSkipGame(t *testing.T) {
	t.Parallel()
	human := lichess.Players{
		White: lichess.Player{User: &lichess.User{ID: "a", Name: "A"}},
		Black: lichess.Player{User: &lichess.User{ID: "b", Name: "B"}},
	}
	g1 := &lichess.Game{Speed: lichess.TimeClassCorrespondence, Players: human, CreatedAt: 1, LastMoveAt: 2}
	if !shouldSkipGame(g1) {
		t.Fatal("correspondence should skip")
	}
	g2 := &lichess.Game{Speed: lichess.TimeClassBlitz, Players: human, CreatedAt: 100, LastMoveAt: 50}
	if !shouldSkipGame(g2) {
		t.Fatal("negative duration should skip")
	}
}
