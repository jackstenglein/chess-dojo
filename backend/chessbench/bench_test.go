package chessbench

import (
	"os"
	"strings"
	"testing"

	corentings "github.com/corentings/chess"
	notnil "github.com/notnil/chess"
)

var samplePGN []byte

func init() {
	var err error
	samplePGN, err = os.ReadFile("testdata/sample.pgn")
	if err != nil {
		panic("failed to read sample PGN: " + err.Error())
	}
}

// --- notnil/chess benchmarks ---

func BenchmarkParsePGN_Notnil(b *testing.B) {
	data := string(samplePGN)
	b.ResetTimer()
	for b.Loop() {
		scanner := notnil.NewScanner(strings.NewReader(data))
		for scanner.Scan() {
			_ = scanner.Next()
		}
	}
}

func BenchmarkReplayMoves_Notnil(b *testing.B) {
	// Parse PGN text of each game to replay from scratch
	data := string(samplePGN)
	scanner := notnil.NewScanner(strings.NewReader(data))
	var gameTexts []string
	for scanner.Scan() {
		game := scanner.Next()
		text, _ := game.MarshalText()
		gameTexts = append(gameTexts, string(text))
	}

	b.ResetTimer()
	for b.Loop() {
		for _, text := range gameTexts {
			pgn, err := notnil.PGN(strings.NewReader(text))
			if err != nil {
				b.Fatal(err)
			}
			_ = notnil.NewGame(pgn)
		}
	}
}

func BenchmarkGenerateFEN_Notnil(b *testing.B) {
	data := string(samplePGN)
	scanner := notnil.NewScanner(strings.NewReader(data))
	var games []*notnil.Game
	for scanner.Scan() {
		games = append(games, scanner.Next())
	}

	b.ResetTimer()
	for b.Loop() {
		for _, game := range games {
			for _, pos := range game.Positions() {
				_ = pos.String()
			}
		}
	}
}

// --- corentings/chess benchmarks ---

func BenchmarkParsePGN_Corentings(b *testing.B) {
	data := string(samplePGN)
	b.ResetTimer()
	for b.Loop() {
		scanner := corentings.NewScanner(strings.NewReader(data))
		for scanner.Scan() {
			_ = scanner.Next()
		}
	}
}

func BenchmarkReplayMoves_Corentings(b *testing.B) {
	data := string(samplePGN)
	scanner := corentings.NewScanner(strings.NewReader(data))
	var gameTexts []string
	for scanner.Scan() {
		game := scanner.Next()
		text, _ := game.MarshalText()
		gameTexts = append(gameTexts, string(text))
	}

	b.ResetTimer()
	for b.Loop() {
		for _, text := range gameTexts {
			pgn, err := corentings.PGN(strings.NewReader(text))
			if err != nil {
				b.Fatal(err)
			}
			_ = corentings.NewGame(pgn)
		}
	}
}

func BenchmarkGenerateFEN_Corentings(b *testing.B) {
	data := string(samplePGN)
	scanner := corentings.NewScanner(strings.NewReader(data))
	var games []*corentings.Game
	for scanner.Scan() {
		games = append(games, scanner.Next())
	}

	b.ResetTimer()
	for b.Loop() {
		for _, game := range games {
			for _, pos := range game.Positions() {
				_ = pos.String()
			}
		}
	}
}
