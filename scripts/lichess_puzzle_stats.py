import sqlite3
import csv

MATE_THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5', 'mate']
BIN_EDGES = [0, 1250, 1310, 1370, 1435, 1500, 1550, 1600, 1665, 1730, 1795, 1850, 1910, 1970, 2030, 2090, 2150, 2225, 2310, 2370, 2410, 2470, 3800]

THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'mate', 'advancedPawn', 'advantage', 'anastasiaMate', 'arabianMate', 'attackingF2F7', 'attraction', 'backRankMate', 'bishopEndgame', 'bodenMate', 'castling', 'capturingDefender', 'crushing', 'doubleBishopMate', 'dovetailMate', 'enPassant', 'equality', 'kingsideAttack', 'clearance', 'defensiveMove', 'deflection', 'discoveredAttack', 'doubleCheck', 'endgame', 'exposedKing', 'fork', 'hangingPiece', 'hookMate', 'interference', 'intermezzo', 'killBoxMate', 'vukovicMate', 'knightEndgame', 'long', 'master', 'masterVsMaster', 'middlegame', 'oneMove', 'opening', 'pawnEndgame', 'pin', 'promotion', 'queenEndgame', 'queenRookEndgame', 'queensideAttack', 'quietMove', 'rookEndgame', 'sacrifice', 'short', 'skewer', 'smotheredMate', 'superGM', 'trappedPiece', 'underPromotion', 'veryLong', 'xRayAttack', 'zugzwang', 'mix', 'playerGames', 'operaMate', 'pillsburysMate', 'discoveredCheck', 'collinearMove']
COHORTS = ['0-300', '300-400', '400-500', '500-600', '600-700', '700-800', '800-900', '900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400', '1400-1500', '1500-1600', '1600-1700', '1700-1800', '1800-1900', '1900-2000', '2000-2100', '2100-2200', '2200-2300', '2300-2400', '2400+']
RATING_BOUNDARY = [1250, 1310, 1370, 1435, 1500, 1550, 1600, 1665, 1730, 1795, 1850, 1910, 1970, 2030, 2090, 2150, 2225, 2310, 2370, 2410, 2440, 2470]

PLAYS_INDEX = 6
POPULARITY_INDEX = 5
THEMES_INDEX = 7

MAX_RATING_DEVIATION = 100
CSV_FILE = '/Users/jackstenglein/Downloads/lichess_db_puzzle.csv'


def get_cohort(lichess_rating) -> str:
    for i, boundary in enumerate(RATING_BOUNDARY):
        if lichess_rating < boundary:
            return COHORTS[i]
    return '2400+'


def normalize_rating(rating) -> int:
    for i, x2 in enumerate(RATING_BOUNDARY):
        if x2 < rating: continue

        x1 = 0 if i == 0 else RATING_BOUNDARY[i-1]
        y1 = float(COHORTS[i].split('-')[0])
        y2 = float(COHORTS[i].split('-')[1])
        result = ((y2-y1) / (x2-x1)) * (rating - x1) + y1
        return round(result)
    
    x1 = RATING_BOUNDARY[-2]
    x2 = RATING_BOUNDARY[-1]
    y1 = 2300.0
    y2 = 2400.0
    result = ((y2-y1) / (x2-x1)) * (rating - x1) + y1
    return round(result)


def count_row_if_necessary(row, themes_per_cohort) -> bool:
    for theme in MATE_THEMES:
        if theme in row['Themes']:
            return False
    
    if int(row['RatingDeviation']) > MAX_RATING_DEVIATION:
        return False
    
    cohort = get_cohort(int(row['Rating']))
    cohort_theme_count = themes_per_cohort.get(cohort, {})
    cohort_theme_count['total'] = cohort_theme_count.get('total', 0) + 1
   
    for theme in row['Themes'].split(' '):
        cohort_theme_count[theme] = cohort_theme_count.get(theme, 0) + 1
    themes_per_cohort[cohort] = cohort_theme_count



def main():
    themes_per_cohort = {}

    with open(CSV_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            count_row_if_necessary(row, themes_per_cohort)

    with open('lichess_puzzle_cohort_stats.csv', 'w') as f:
        writer = csv.DictWriter(f, fieldnames=['cohort', 'total'] + THEMES)
        writer.writeheader()
        for cohort in COHORTS:
            cohort_themes = themes_per_cohort.get(cohort, {})
            cohort_themes['cohort'] = cohort
            writer.writerow(cohort_themes)



if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(e)
