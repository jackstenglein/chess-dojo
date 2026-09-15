package database

import "testing"

func TestGetCohort(t *testing.T) {
	table := []struct {
		name         string
		ratingSystem RatingSystem
		rating       int
		want         DojoCohort
	}{
		{
			name:         "ChesscomBelowFirstBoundary",
			ratingSystem: Chesscom,
			rating:       499,
			want:         "0-300",
		},
		{
			name:         "ChesscomAtFirstBoundary",
			ratingSystem: Chesscom,
			rating:       500,
			want:         "300-400",
		},
		{
			name:         "ChesscomMidRange",
			ratingSystem: Chesscom,
			rating:       1000,
			want:         "800-900",
		},
		{
			name:         "ChesscomAtTopBoundary",
			ratingSystem: Chesscom,
			rating:       2549,
			want:         "2300-2400",
		},
		{
			name:         "ChesscomAboveTopBoundary",
			ratingSystem: Chesscom,
			rating:       2550,
			want:         "2400+",
		},
		{
			name:         "LichessMidRange",
			ratingSystem: Lichess,
			rating:       1700,
			want:         "1100-1200",
		},
		{
			name:         "UscfMidRange",
			ratingSystem: Uscf,
			rating:       1150,
			want:         "1100-1200",
		},
		{
			name:         "UnknownRatingSystem",
			ratingSystem: RatingSystem("UNKNOWN"),
			rating:       1500,
			want:         NoCohort,
		},
	}

	for _, tc := range table {
		t.Run(tc.name, func(t *testing.T) {
			got := getCohort(tc.ratingSystem, tc.rating)
			if got != tc.want {
				t.Errorf("getCohort(%s, %d) = %q; want %q", tc.ratingSystem, tc.rating, got, tc.want)
			}
		})
	}
}

func TestRatingBoundariesLength(t *testing.T) {
	for system, boundaries := range ratingBoundaries {
		if len(boundaries) != len(Cohorts)-1 {
			t.Errorf("ratingBoundaries[%s] has length %d; want %d", system, len(boundaries), len(Cohorts)-1)
		}
	}
}
