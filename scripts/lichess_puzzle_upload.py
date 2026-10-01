import csv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import certifi

THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'mate', 'advancedPawn', 'advantage', 'anastasiaMate', 'arabianMate', 'attackingF2F7', 'attraction', 'backRankMate', 'bishopEndgame', 'bodenMate', 'castling', 'capturingDefender', 'crushing', 'doubleBishopMate', 'dovetailMate', 'enPassant', 'equality', 'kingsideAttack', 'clearance', 'defensiveMove', 'deflection', 'discoveredAttack', 'doubleCheck', 'endgame', 'exposedKing', 'fork', 'hangingPiece', 'hookMate', 'interference', 'intermezzo', 'killBoxMate', 'vukovicMate', 'knightEndgame', 'long', 'master', 'masterVsMaster', 'middlegame', 'oneMove', 'opening', 'pawnEndgame', 'pin', 'promotion', 'queenEndgame', 'queenRookEndgame', 'queensideAttack', 'quietMove', 'rookEndgame', 'sacrifice', 'short', 'skewer', 'smotheredMate', 'superGM', 'trappedPiece', 'underPromotion', 'veryLong', 'xRayAttack', 'zugzwang', 'mix', 'playerGames']
COHORTS = ['0-300', '300-400', '400-500', '500-600', '600-700', '700-800', '800-900', '900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400', '1400-1500', '1500-1600', '1600-1700', '1700-1800', '1800-1900', '1900-2000', '2000-2100', '2100-2200', '2200-2300', '2300-2400', '2400+']
RATING_BOUNDARY = [1250, 1310, 1370, 1435, 1500, 1550, 1600, 1665, 1730, 1795, 1850, 1910, 1970, 2030, 2090, 2150, 2225, 2310, 2370, 2410, 2440, 2470]
MATE_THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5', 'mate']

CSV_FILE = '/Users/jackstenglein/Downloads/lichess_db_puzzle.csv'
MAX_RATING_DEVIATION = 100
LIMITED_THEMES = [
    # 'attackingF2F7',
    # 'backRankMate',
    # 'smotheredMate'
]
MAX_LIMITED_THEMES = 200

ca = certifi.where()
uri = "mongodb+srv://puzzle_writer:<password>@chess-dojo-prod.bsc8oxy.mongodb.net/?retryWrites=true&w=majority&appName=chess-dojo-prod"
client = MongoClient(uri, server_api=ServerApi('1'), tlsCAFile=ca)


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


def insert_row_if_necessary(row, collection, themes_per_cohort) -> bool:
    for theme in MATE_THEMES:
        if theme in row['Themes']:
            return False
    
    if int(row['RatingDeviation']) > MAX_RATING_DEVIATION:
        return False
    
    cohort = get_cohort(int(row['Rating']))
    cohort_theme_count = themes_per_cohort.get(cohort, {})
    for theme in LIMITED_THEMES:
        if theme in row['Themes'] and cohort_theme_count.get(theme, 0) >= MAX_LIMITED_THEMES:
            return False
        
    for theme in row['Themes'].split(' '):
        cohort_theme_count[theme] = cohort_theme_count.get(theme, 0) + 1
    themes_per_cohort[cohort] = cohort_theme_count

    try:
        collection.insert_one({
            '_id': row['PuzzleId'],
            'fen': row['FEN'],
            'moves': row['Moves'].split(' '),
            'rating': normalize_rating(int(row['Rating'])),
            'ratingDeviation': 2*int(row['RatingDeviation']),
            'themes': row['Themes'].split(' '),
            'openingTags': row['OpeningTags'].split(' '),
            'lichessId': row['PuzzleId'],
            'lichessGameUrl': row['GameUrl'],
            'plays': 0,
            'successfulPlays': 0,
        })
        return True
    except Exception as e:
        print(e)
        return False


def main():
    database = client["puzzles"]
    collection = database["puzzles"]
    themes_per_cohort = {}

    count = 0
    with open(CSV_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if insert_row_if_necessary(row, collection, themes_per_cohort):
                count += 1
            if count % 1000 == 0:
                print(f'Inserted {count} puzzles...')

    print(f'Finished. Inserted {count} total puzzles')

    with open('lichess_puzzle_cohort_stats.csv', 'w') as f:
        writer = csv.DictWriter(f, fieldnames=['cohort'] + THEMES)
        writer.writeheader()
        for cohort in COHORTS:
            cohort_themes = themes_per_cohort.get(cohort, {})
            cohort_themes['cohort'] = cohort
            writer.writerow(cohort_themes)



if __name__ == '__main__':
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        main()
        client.close()
    except Exception as e:
        print(e)
