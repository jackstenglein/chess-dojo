package chesscom

import (
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

// toCommonTimeClass maps a Chess.com TimeClass to the common TimeClass.
func toCommonTimeClass(tc timeClass) game.TimeClass {
	switch tc {
	case timeClassBullet:
		return game.TimeClassBullet
	case timeClassBlitz:
		return game.TimeClassBlitz
	case timeClassRapid:
		return game.TimeClassRapid
	case timeClassDaily:
		return game.TimeClassCorrespondence
	default:
		return game.TimeClass(tc)
	}
}

// ToGame converts a Chess.com Game to the common game model.
// The username parameter identifies which player's perspective to use for PlayerColor.
func ToGame(g *chesscomGame, username string) (game.Game, error) {
	var result game.Result
	switch g.Result() {
	case resultWhite:
		result = game.ResultWhite
	case resultBlack:
		result = game.ResultBlack
	default:
		result = game.ResultDraw
	}

	color, err := g.PlayerColor(username)
	if err != nil {
		return game.Game{}, err
	}

	return game.Game{
		PGN:           g.PGN,
		PlayerColor:   color,
		WhiteUsername: g.White.Username,
		BlackUsername: g.Black.Username,
		WhiteRating:   g.White.Rating,
		BlackRating:   g.Black.Rating,
		Result:        result,
		TimeClass:     toCommonTimeClass(g.TimeClass),
		Rated:         g.Rated,
		URL:           g.URL,
		Source:        game.SourceChesscom,
		EndTime:       time.Unix(g.EndTime, 0),
	}, nil
}
