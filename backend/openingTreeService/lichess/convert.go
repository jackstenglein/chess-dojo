package lichess

import (
	"time"

	"github.com/jackstenglein/chess-dojo-scheduler/backend/openingTreeService/game"
)

// toCommonTimeClass maps a Lichess TimeClass to the common TimeClass.
func toCommonTimeClass(tc TimeClass) game.TimeClass {
	switch tc {
	case TimeClassUltraBullet, TimeClassBullet:
		return game.TimeClassBullet
	case TimeClassBlitz:
		return game.TimeClassBlitz
	case TimeClassRapid:
		return game.TimeClassRapid
	case TimeClassClassical:
		return game.TimeClassClassical
	case TimeClassCorrespondence:
		return game.TimeClassCorrespondence
	default:
		return game.TimeClass(tc)
	}
}

// ToGame converts a Lichess Game to the common game model.
// The username parameter identifies which player's perspective to use for PlayerColor.
func ToGame(g *Game, username string) (game.Game, error) {
	var result game.Result
	switch g.Result() {
	case "1-0":
		result = game.ResultWhite
	case "0-1":
		result = game.ResultBlack
	default:
		result = game.ResultDraw
	}

	var whiteUsername, blackUsername string
	var whiteRating, blackRating int

	if g.Players.White.User != nil {
		whiteUsername = g.Players.White.User.Name
	}
	if g.Players.Black.User != nil {
		blackUsername = g.Players.Black.User.Name
	}
	whiteRating = g.Players.White.Rating
	blackRating = g.Players.Black.Rating

	color, err := g.PlayerColor(username)
	if err != nil {
		return game.Game{}, err
	}

	return game.Game{
		PGN:          g.PGN,
		PlayerColor:  color,
		WhiteUsername: whiteUsername,
		BlackUsername: blackUsername,
		WhiteRating:  whiteRating,
		BlackRating:  blackRating,
		Result:       result,
		TimeClass:    toCommonTimeClass(g.Speed),
		Rated:        g.Rated,
		URL:          g.URL(),
		Source:       game.SourceLichess,
		EndTime:      time.UnixMilli(g.CreatedAt),
	}, nil
}
