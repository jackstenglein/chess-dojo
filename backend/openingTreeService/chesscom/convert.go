package chesscom

import (
	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

// toCommonTimeClass maps a Chess.com TimeClass to the common TimeClass.
func toCommonTimeClass(tc TimeClass) game.TimeClass {
	switch tc {
	case TimeClassBullet:
		return game.TimeClassBullet
	case TimeClassBlitz:
		return game.TimeClassBlitz
	case TimeClassRapid:
		return game.TimeClassRapid
	case TimeClassDaily:
		return game.TimeClassCorrespondence
	default:
		return game.TimeClass(tc)
	}
}

// ToGame converts a Chess.com Game to the common game model.
// The username parameter identifies which player's perspective to use for PlayerColor.
func ToGame(g *Game, username string) game.Game {
	var result game.Result
	switch g.Result() {
	case ResultWhite:
		result = game.ResultWhite
	case ResultBlack:
		result = game.ResultBlack
	default:
		result = game.ResultDraw
	}

	return game.Game{
		PGN:          g.PGN,
		PlayerColor:  g.PlayerColor(username),
		WhiteUsername: g.White.Username,
		BlackUsername: g.Black.Username,
		WhiteRating:  g.White.Rating,
		BlackRating:  g.Black.Rating,
		Result:       result,
		TimeClass:    toCommonTimeClass(g.TimeClass),
		Rated:        g.Rated,
		URL:          g.URL,
		Source:       game.SourceChessCom,
	}
}
