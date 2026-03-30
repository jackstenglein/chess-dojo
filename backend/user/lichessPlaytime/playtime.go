// Package lichessplaytime imports Lichess standard games as timeline entries for activity / heatmap.
package lichessplaytime

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/lichess"
)

const (
	// SpecialRequirementID is used when no training-plan row matches this speed (matches common enum).
	SpecialRequirementID = "LichessOnlinePlay"

	// SpecialRequirementName is a short label for activity UI.
	SpecialRequirementName = "Lichess (online)"

	// GamesCategory matches RequirementCategory.Games in common.
	GamesCategory = "Games + Analysis"

	maxGamesPerRun  = 400
	firstSyncWindow = 30 * 24 * time.Hour
	maxGameMinutes  = 8 * 60
)

// Store lists requirements, writes timeline + user progress, and updates the Lichess cursor.
type Store interface {
	PutTimelineEntry(entry *database.TimelineEntry) error
	UpdateUser(username string, update *database.UserUpdate) (*database.User, error)
	UpdateUserProgress(username string, progressEntry *database.RequirementProgress) (*database.User, error)
	ListRequirements(cohort database.DojoCohort, scoreboardOnly bool, startKey string) ([]*database.Requirement, string, error)
}

// PlaytimeMinutes returns wall-clock minutes from Lichess timestamps, capped per game.
func PlaytimeMinutes(g *lichess.Game) int {
	if g.LastMoveAt <= g.CreatedAt {
		return 0
	}
	ms := g.LastMoveAt - g.CreatedAt
	m := int((ms + 59_999) / 60_000)
	if m > maxGameMinutes {
		m = maxGameMinutes
	}
	return m
}

func localDateKey(lastMoveMs int64, tz string) string {
	loc := time.UTC
	if tz != "" {
		if l, err := time.LoadLocation(tz); err == nil {
			loc = l
		}
	}
	return time.UnixMilli(lastMoveMs).In(loc).Format(time.DateOnly)
}

func timelineCohort(u *database.User) database.DojoCohort {
	if u.DojoCohort.IsValid() && u.DojoCohort != database.NoCohort {
		return u.DojoCohort
	}
	return database.AllCohorts
}

func buildNotes(g *lichess.Game) string {
	rated := "Casual"
	if g.Rated {
		rated = "Rated"
	}
	return fmt.Sprintf("%s %s game on Lichess — %s", rated, g.Speed, g.URL())
}

// BuildFallbackEntry is used when no Games + Analysis task matches this speed.
func BuildFallbackEntry(u *database.User, g *lichess.Game, importedAt time.Time) *database.TimelineEntry {
	lastMove := time.UnixMilli(g.LastMoveAt).UTC().Format(time.RFC3339)
	dateKey := localDateKey(g.LastMoveAt, u.TimezoneOverride)
	minutes := PlaytimeMinutes(g)
	cohort := timelineCohort(u)

	return &database.TimelineEntry{
		TimelineEntryKey: database.TimelineEntryKey{
			Owner: u.Username,
			Id:    fmt.Sprintf("%s_lichess_%s", dateKey, g.ID),
		},
		OwnerDisplayName:    u.DisplayName,
		RequirementId:       SpecialRequirementID,
		RequirementName:     SpecialRequirementName,
		RequirementCategory: GamesCategory,
		ScoreboardDisplay:   database.Hidden,
		Cohort:              cohort,
		TotalCount:          1,
		PreviousCount:       0,
		NewCount:            1,
		DojoPoints:          0,
		TotalDojoPoints:     0,
		MinutesSpent:        minutes,
		TotalMinutesSpent:   minutes,
		Date:                lastMove,
		CreatedAt:           importedAt.UTC().Format(time.RFC3339),
		Notes:               buildNotes(g),
		Reactions:           map[string]database.Reaction{},
	}
}

func listRequirementsForCohort(store Store, cohort database.DojoCohort) ([]*database.Requirement, error) {
	var out []*database.Requirement
	sk := ""
	for {
		batch, next, err := store.ListRequirements(cohort, false, sk)
		if err != nil {
			return nil, err
		}
		out = append(out, batch...)
		if next == "" {
			break
		}
		sk = next
	}
	return out, nil
}

// scoreCohort is the cohort key used for total targets, clamping, and scoring (must exist in task.Counts).
func scoreCohort(task *database.Requirement, u *database.User) (database.DojoCohort, error) {
	if u.DojoCohort.IsValid() && u.DojoCohort != database.AllCohorts && u.DojoCohort != database.NoCohort {
		if _, ok := task.Counts[u.DojoCohort]; ok {
			return u.DojoCohort, nil
		}
	}
	for c := range task.Counts {
		if c != database.AllCohorts {
			return c, nil
		}
	}
	if _, ok := task.Counts[database.AllCohorts]; ok {
		return database.AllCohorts, nil
	}
	return "", fmt.Errorf("lichessplaytime: requirement %s has no applicable counts", task.Id)
}

func minutesCohortForUpdate(task *database.Requirement, scoreCohort database.DojoCohort, u *database.User) database.DojoCohort {
	if task.NumberOfCohorts == 1 || task.NumberOfCohorts == 0 {
		if u.DojoCohort.IsValid() && u.DojoCohort != database.NoCohort {
			return u.DojoCohort
		}
		return database.AllCohorts
	}
	return scoreCohort
}

func timelineDisplayCohort(task *database.Requirement, scoreCohort, minCohort database.DojoCohort) database.DojoCohort {
	if task.NumberOfCohorts == 1 || task.NumberOfCohorts == 0 {
		return minCohort
	}
	return scoreCohort
}

func previousCount(task *database.Requirement, prog *database.RequirementProgress, scoreCohort database.DojoCohort) int {
	prev := task.StartCount
	if prog != nil && prog.Counts != nil {
		if task.NumberOfCohorts == 1 || task.NumberOfCohorts == 0 {
			if v, ok := prog.Counts[database.AllCohorts]; ok {
				prev = v
			}
		} else if v, ok := prog.Counts[scoreCohort]; ok {
			prev = v
		}
	}
	return prev
}

func cloneProgress(p *database.RequirementProgress, reqID string) *database.RequirementProgress {
	out := &database.RequirementProgress{
		RequirementId: reqID,
		Counts:        map[database.DojoCohort]int{},
		MinutesSpent:  map[database.DojoCohort]int{},
	}
	if p != nil {
		for k, v := range p.Counts {
			out.Counts[k] = v
		}
		for k, v := range p.MinutesSpent {
			out.MinutesSpent[k] = v
		}
	}
	return out
}

func totalCountForTask(task *database.Requirement, scoreCohort database.DojoCohort) int {
	if v, ok := task.Counts[scoreCohort]; ok {
		return v
	}
	return 0
}

// BuildTrainingPlanEntry mirrors user/progress/update timeline rows for a real requirement.
func BuildTrainingPlanEntry(
	u *database.User,
	g *lichess.Game,
	task *database.Requirement,
	scoreCohort, minCohort database.DojoCohort,
	prevCount, newCount int,
	minutes, totalMinutesAfter int,
	dojoDelta, totalDojo float32,
	importedAt time.Time,
) *database.TimelineEntry {
	dateKey := localDateKey(g.LastMoveAt, u.TimezoneOverride)
	lastMove := time.UnixMilli(g.LastMoveAt).UTC().Format(time.RFC3339)
	createdAt := importedAt.UTC().Format(time.RFC3339)
	displayCohort := timelineDisplayCohort(task, scoreCohort, minCohort)

	return &database.TimelineEntry{
		TimelineEntryKey: database.TimelineEntryKey{
			Owner: u.Username,
			Id:    fmt.Sprintf("%s_lichess_%s_%s", dateKey, task.Id, g.ID),
		},
		OwnerDisplayName:    u.DisplayName,
		RequirementId:       task.Id,
		RequirementName:     task.Name,
		RequirementCategory: task.Category,
		ScoreboardDisplay:   task.ScoreboardDisplay,
		ProgressBarSuffix:   task.ProgressBarSuffix,
		Cohort:              displayCohort,
		TotalCount:          totalCountForTask(task, scoreCohort),
		PreviousCount:       prevCount,
		NewCount:            newCount,
		DojoPoints:          dojoDelta,
		TotalDojoPoints:     totalDojo,
		MinutesSpent:        minutes,
		TotalMinutesSpent:   totalMinutesAfter,
		Date:                lastMove,
		CreatedAt:           createdAt,
		Notes:               buildNotes(g),
		Reactions:           map[string]database.Reaction{},
	}
}

func applyProgressIncrement(
	task *database.Requirement,
	u *database.User,
	minutes int,
	updatedAt string,
) (*database.RequirementProgress, database.DojoCohort, database.DojoCohort, int, int, float32, float32, error) {
	sc, err := scoreCohort(task, u)
	if err != nil {
		return nil, "", "", 0, 0, 0, 0, err
	}
	minCohort := minutesCohortForUpdate(task, sc, u)

	prog := u.Progress[task.Id]
	newProg := cloneProgress(prog, task.Id)
	prev := previousCount(task, prog, sc)
	newCount := prev + 1

	if task.NumberOfCohorts == 1 || task.NumberOfCohorts == 0 {
		newProg.Counts[database.AllCohorts] = newCount
	} else {
		newProg.Counts[sc] = newCount
	}
	newProg.MinutesSpent[minCohort] += minutes
	newProg.UpdatedAt = updatedAt

	origScore := task.CalculateScoreCount(sc, prev)
	newScore := task.CalculateScoreCount(sc, newCount)
	return newProg, sc, minCohort, prev, newCount, origScore, newScore, nil
}

func shouldSkipUser(u *database.User) bool {
	r := u.Ratings[database.Lichess]
	if r == nil || strings.TrimSpace(r.Username) == "" {
		return true
	}
	if u.LichessBan != "" && strings.EqualFold(strings.TrimSpace(u.LichessBan), strings.TrimSpace(r.Username)) {
		return true
	}
	return false
}

func shouldSkipGame(g *lichess.Game) bool {
	if g.Speed == lichess.TimeClassCorrespondence {
		return true
	}
	if !g.IsHumanVsHuman() {
		return true
	}
	return PlaytimeMinutes(g) <= 0
}

// ImportUser fetches new standard games from Lichess, updates training-plan progress when a task matches, and advances the cursor.
func ImportUser(ctx context.Context, u *database.User, client *lichess.Client, clock time.Time, store Store) error {
	if shouldSkipUser(u) {
		return nil
	}
	lichessUser := strings.TrimSpace(u.Ratings[database.Lichess].Username)

	var reqs []*database.Requirement
	if u.DojoCohort.IsValid() && u.DojoCohort != database.NoCohort && u.DojoCohort != database.AllCohorts {
		var err error
		reqs, err = listRequirementsForCohort(store, u.DojoCohort)
		if err != nil {
			return err
		}
	}

	since := clock.Add(-firstSyncWindow)
	if u.LichessPlaytimeSyncAt > 0 {
		since = time.UnixMilli(u.LichessPlaytimeSyncAt + 1)
	}

	params := lichess.FetchParams{
		Username: lichessUser,
		Since:    since,
		Max:      maxGamesPerRun,
	}

	var maxLastMove int64
	importedAt := clock
	updatedAt := clock.UTC().Format(time.RFC3339)
	working := u

	for g, err := range client.EachStandardGame(ctx, params) {
		if err != nil {
			return err
		}
		if g.LastMoveAt > maxLastMove {
			maxLastMove = g.LastMoveAt
		}
		if shouldSkipGame(&g) {
			continue
		}

		minutes := PlaytimeMinutes(&g)
		task := ResolvePlayGamesRequirement(g.Speed, reqs, working.DojoCohort)
		if task == nil {
			entry := BuildFallbackEntry(working, &g, importedAt)
			if err := store.PutTimelineEntry(entry); err != nil {
				return err
			}
			continue
		}

		newProg, scoreCohort, minCohort, prev, newCount, oScore, nScore, err := applyProgressIncrement(task, working, minutes, updatedAt)
		if err != nil {
			entry := BuildFallbackEntry(working, &g, importedAt)
			if err := store.PutTimelineEntry(entry); err != nil {
				return err
			}
			continue
		}

		totalMin := newProg.MinutesSpent[minCohort]
		entry := BuildTrainingPlanEntry(working, &g, task, scoreCohort, minCohort, prev, newCount, minutes, totalMin, nScore-oScore, nScore, importedAt)
		if err := store.PutTimelineEntry(entry); err != nil {
			return err
		}
		updated, err := store.UpdateUserProgress(working.Username, newProg)
		if err != nil {
			return err
		}
		working = updated
	}

	if maxLastMove > 0 && maxLastMove > u.LichessPlaytimeSyncAt {
		cursor := maxLastMove
		_, err := store.UpdateUser(working.Username, &database.UserUpdate{
			LichessPlaytimeSyncAt: &cursor,
		})
		return err
	}
	return nil
}
