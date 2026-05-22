package lichessplaytime

import (
	"testing"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/lichess"
)

func TestResolvePlayGamesRequirement_ClassicalByID(t *testing.T) {
	t.Parallel()
	cohort := database.DojoCohort("1500-1600")
	reqs := []*database.Requirement{
		{
			Id: ClassicalGamesRequirementID, Name: "Play Classical Games", Category: GamesCategory,
			Status: database.Active, Counts: map[database.DojoCohort]int{cohort: 100},
		},
		{
			Id: "blitz-id", Name: "Play Blitz Games", Category: GamesCategory,
			Status: database.Active, Counts: map[database.DojoCohort]int{cohort: 200},
		},
	}
	got := ResolvePlayGamesRequirement(lichess.TimeClassClassical, reqs, cohort)
	if got == nil || got.Id != ClassicalGamesRequirementID {
		t.Fatalf("got %#v", got)
	}
}

func TestResolvePlayGamesRequirement_Blitz(t *testing.T) {
	t.Parallel()
	cohort := database.DojoCohort("1500-1600")
	reqs := []*database.Requirement{
		{
			Id: "b1", Name: "Play Blitz Games", Category: GamesCategory,
			Status: database.Active, Counts: map[database.DojoCohort]int{cohort: 200},
		},
		{
			Id: "b2", Name: "Analyze Blitz Mistakes", Category: GamesCategory,
			Status: database.Active, Counts: map[database.DojoCohort]int{cohort: 50},
		},
	}
	got := ResolvePlayGamesRequirement(lichess.TimeClassBlitz, reqs, cohort)
	if got == nil || got.Id != "b1" {
		t.Fatalf("got %#v", got)
	}
}

func TestResolvePlayGamesRequirement_NoCohort(t *testing.T) {
	t.Parallel()
	if got := ResolvePlayGamesRequirement(lichess.TimeClassBlitz, nil, database.NoCohort); got != nil {
		t.Fatalf("want nil, got %#v", got)
	}
}
