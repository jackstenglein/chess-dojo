package lichessplaytime

import (
	"strings"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/lichess"
)

// ClassicalGamesRequirementID matches frontend CLASSICAL_GAMES_TASK_ID / heatmap constant.
const ClassicalGamesRequirementID = "38f46441-7a4e-4506-8632-166bcbe78baf"

func isGamesAnalysis(r *database.Requirement) bool {
	return r != nil && r.Status == database.Active && r.Category == GamesCategory
}

func excludeByName(name string) bool {
	n := strings.ToLower(strings.TrimSpace(name))
	return strings.Contains(n, "annotat") ||
		strings.Contains(n, "postmortem") ||
		strings.HasPrefix(n, "analyze") ||
		strings.Contains(n, " analysis")
}

func appliesToCohort(r *database.Requirement, cohort database.DojoCohort) bool {
	if r == nil || len(r.Counts) == 0 {
		return false
	}
	_, ok := r.Counts[cohort]
	return ok
}

func scoreNameMatch(r *database.Requirement, keywords []string) int {
	if excludeByName(r.Name) {
		return 0
	}
	hay := strings.ToLower(r.Name + " " + r.ShortName + " " + r.DailyName)
	score := 0
	for _, kw := range keywords {
		if strings.Contains(hay, kw) {
			score += 100
		}
	}
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(r.Name)), "play ") {
		score += 50
	}
	return score
}

func bestRequirement(reqs []*database.Requirement, cohort database.DojoCohort, keywords []string) *database.Requirement {
	var best *database.Requirement
	bestScore := 0
	for _, r := range reqs {
		if !isGamesAnalysis(r) || !appliesToCohort(r, cohort) {
			continue
		}
		s := scoreNameMatch(r, keywords)
		if s > bestScore {
			bestScore = s
			best = r
		}
	}
	if bestScore < 100 {
		return nil
	}
	return best
}

// ResolvePlayGamesRequirement picks the training-plan row for this Lichess speed and user cohort.
func ResolvePlayGamesRequirement(speed lichess.TimeClass, reqs []*database.Requirement, cohort database.DojoCohort) *database.Requirement {
	if !cohort.IsValid() || cohort == database.AllCohorts || cohort == database.NoCohort {
		return nil
	}

	var candidates []*database.Requirement
	for _, r := range reqs {
		if isGamesAnalysis(r) && appliesToCohort(r, cohort) {
			candidates = append(candidates, r)
		}
	}

	switch speed {
	case lichess.TimeClassClassical:
		for _, r := range candidates {
			if r.Id == ClassicalGamesRequirementID {
				return r
			}
		}
		return bestRequirement(candidates, cohort, []string{"classical"})

	case lichess.TimeClassRapid:
		return bestRequirement(candidates, cohort, []string{"rapid"})

	case lichess.TimeClassBlitz:
		return bestRequirement(candidates, cohort, []string{"blitz"})

	case lichess.TimeClassBullet, lichess.TimeClassUltraBullet:
		if r := bestRequirement(candidates, cohort, []string{"bullet"}); r != nil {
			return r
		}
		return bestRequirement(candidates, cohort, []string{"ultra"})
	default:
		return nil
	}
}
