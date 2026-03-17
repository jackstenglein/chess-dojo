package openingtree

import (
	"fmt"
	"math/rand"
	"strings"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
	"github.com/corentings/chess"
)

// generateRandomGames generates n random chess games using the corentings/chess
// library. A fixed seed ensures reproducibility across runs. Games naturally
// vary in length and result because moves are chosen uniformly at random from
// all legal moves at each position.
func generateRandomGames(n int, seed int64) []*game.Game {
	rng := rand.New(rand.NewSource(seed))
	games := make([]*game.Game, n)
	for i := range games {
		games[i] = generateOneGame(rng, i)
	}
	return games
}

func generateOneGame(rng *rand.Rand, id int) *game.Game {
	g := chess.NewGame()
	for g.Outcome() == chess.NoOutcome {
		moves := g.ValidMoves()
		if len(moves) == 0 {
			break
		}
		_ = g.Move(moves[rng.Intn(len(moves))])
	}

	var result game.Result
	switch g.Outcome() {
	case chess.WhiteWon:
		result = game.ResultWhite
	case chess.BlackWon:
		result = game.ResultBlack
	default:
		result = game.ResultDraw
	}

	pgn := pgnString(g, result)
	return &game.Game{
		URL:    fmt.Sprintf("rand-%d", id),
		Result: result,
		PGN:    pgn,
	}
}

// pgnString builds a minimal PGN string from a corentings/chess game.
func pgnString(g *chess.Game, result game.Result) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("[Result \"%s\"]\n\n", result))

	moves := g.Moves()
	positions := g.Positions()
	notation := chess.AlgebraicNotation{}

	for i, m := range moves {
		if i%2 == 0 {
			sb.WriteString(fmt.Sprintf("%d. ", i/2+1))
		}
		sb.WriteString(notation.Encode(positions[i], m))
		sb.WriteByte(' ')
	}
	sb.WriteString(string(result))
	return sb.String()
}
