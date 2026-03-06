// Package game defines a common Game model that unifies Chess.com and Lichess
// game representations for use by the opening tree and other services.
package game

// SourceType identifies which platform a game originated from.
type SourceType string

const (
	SourceChessCom SourceType = "chesscom"
	SourceLichess  SourceType = "lichess"
)

// TimeClass represents the speed category of a game, normalized across platforms.
type TimeClass string

const (
	TimeClassBullet         TimeClass = "bullet"
	TimeClassBlitz          TimeClass = "blitz"
	TimeClassRapid          TimeClass = "rapid"
	TimeClassClassical      TimeClass = "classical"
	TimeClassCorrespondence TimeClass = "correspondence"
)

// Result represents the PGN result of a game.
type Result string

const (
	ResultWhite Result = "1-0"
	ResultBlack Result = "0-1"
	ResultDraw  Result = "1/2-1/2"
)

// Game is a platform-agnostic representation of a chess game.
type Game struct {
	PGN           string     `json:"pgn"`
	PlayerColor   string     `json:"playerColor"`
	WhiteUsername  string     `json:"whiteUsername"`
	BlackUsername  string     `json:"blackUsername"`
	WhiteRating   int        `json:"whiteRating"`
	BlackRating   int        `json:"blackRating"`
	Result        Result     `json:"result"`
	TimeClass     TimeClass  `json:"timeClass"`
	Rated         bool       `json:"rated"`
	URL           string     `json:"url"`
	Source        SourceType `json:"source"`
}
