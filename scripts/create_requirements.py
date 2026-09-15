import boto3
import csv
import datetime
from decimal import Decimal
import json

db = boto3.resource('dynamodb')
table = db.Table('dev-requirements')

cohorts = [
    "0-300",
    "300-400",
    "400-500",
    "500-600",
    "600-700",
    "700-800",
    "800-900",
    "900-1000",
    "1000-1100",
    "1100-1200",
    "1200-1300",
    "1300-1400",
    "1400-1500",
    "1500-1600",
    "1600-1700",
    "1700-1800",
    "1800-1900",
    "1900-2000",
    "2000-2100",
    "2100-2200",
    "2200-2300",
    "2300-2400",
    "2400+",
]


def getCounts(row: dict):
    result = {}
    for cohort in cohorts:
        if row[cohort] is None or row[cohort] == '':
            continue

        count = row[cohort]
        if "-" in count:
            count = count[count.find("-") + 1:]
        result[cohort] = int(count)

    return result


def getStartCount(row: dict):
    for cohort in cohorts:
        if row[cohort] is None:
            continue

        count = row[cohort]
        if "-" in count:
            return int(count[: count.find("-")]) - 1

    return 0


def getUnitScoreOverride(row: dict):
    result = {}
    for cohort in cohorts:
        uso_name = "USO " + cohort
        value = row.get(uso_name, None)
        if value is None or value == '':
            continue

        result[cohort] = Decimal(value)

    return result


def getPositions(row: dict):
    if not row['FENs']:
        return None

    positions = []
    fens = row['FENs'].split(',')

    limitSeconds = int(row['Limit Seconds'])
    incrementSeconds = int(row['Increment Seconds']) if row['Increment Seconds'] else 0
    result = row['Expected Result']
    title = row['Position Title']

    # Optional per-position videos column. Comma-separated, one URL per FEN
    # in the same order as FENs. Empty entries (e.g. "url1,,url3") mean the
    # corresponding position has no video.
    position_videos_raw = row.get('Position Videos', '') or ''
    position_videos = position_videos_raw.split(',') if position_videos_raw else []

    index = 1
    for fen in fens:
        ptitle = title
        if len(fens) > 1:
            ptitle = f'{title} #{index}'
        elif len(title) == 0:
            ptitle = f'#{index}'

        position = {
            'title': ptitle,
            'fen': fen,
            'limitSeconds': limitSeconds,
            'incrementSeconds': incrementSeconds,
            'result': result,
        }

        video_url = ''
        if index - 1 < len(position_videos):
            video_url = position_videos[index - 1].strip()
        if video_url:
            position['videoUrl'] = video_url

        positions.append(position)
        index += 1
    return positions



def getBlockers(row: dict):
    if not row['Blockers']:
        return None
    
    blockers = row['Blockers'].split(',')
    return blockers


def getSubscriptionTiers(row: dict):
    if not row['Tiers']:
        return None

    tiers = row['Tiers'].split(',')
    return tiers


def main():
    items = []
    categories = {
        'Welcome to the Dojo': [],
        'Games + Analysis': [],
        'Tactics': [],
        'Middlegames + Strategy': [],
        'Endgame': [],
        'Opening': [],
    }
    updatedAt = datetime.datetime.utcnow().isoformat('T') + 'Z'

    with open('requirements.csv', newline='', encoding='utf8') as infile:
        reader = csv.DictReader(infile)

        for row in reader:
            if row['Requirement Name'] is None or row['Requirement Name'] == '':
                continue

            counts = getCounts(row)
            startCount = getStartCount(row)
            unitScoreOverride = getUnitScoreOverride(row)
            positions = getPositions(row)

            if not row['ID'] or row['ID'] == '':
                raise Exception('Row missing ID: ', row)

            item = {
                'id': row['ID'],
                'status': 'ACTIVE',
                'category': row['Category'],
                'name': row['Requirement Name'],
                'shortName': row['Requirement Short Name'],
                'dailyName': row['Daily Name'],
                'description': row['Description'] if row['Description'] else '',
                'freeDescription': row['Free Description'] if row['Free Description'] else '',
                'counts': counts,
                'startCount': startCount,
                'numberOfCohorts': int(row['# of Cohorts']) if row['# of Cohorts'] else 1,
                'unitScore': Decimal(row['Unit Score']) if row['Unit Score'] else 0,
                'unitScoreOverride': unitScoreOverride,
                'totalScore': Decimal(row['Total Score']) if row['Total Score'] else 0,
                'videoUrls': row['Videos'].split(',') if row['Videos'] else [],
                'positions': positions,
                'scoreboardDisplay': row['Scoreboard Display'],
                'updatedAt': updatedAt,
                'sortPriority': row['Sort Priority'],
                'progressBarSuffix': row['Progress Bar Suffix'] if row['Progress Bar Suffix'] else '',
                'expirationDays': int(row['Expiration Days']) if row['Expiration Days'] else -1,
                'isFree': row['Free?'] == '1',
                'blockers': getBlockers(row),
                'atomic': row['Atomic'] == 'TRUE',
                'subscriptionTiers': getSubscriptionTiers(row),
            }
            if row['Expected Minutes']:
                item['expectedMinutes'] = int(row['Expected Minutes'])

            items.append(item)
            categories[row['Category']].append(item)

    print(f'Got {len(items)} requirements')
    print(
        f'Got {len(categories["Games + Analysis"])} Games + Analysis requirements')
    print(f'Got {len(categories["Tactics"])} Tactics requirements')
    print(
        f'Got {len(categories["Middlegames + Strategy"])} Middlegames + Strategy requirements')
    print(f'Got {len(categories["Endgame"])} Endgame requirements')
    print(f'Got {len(categories["Opening"])} Opening requirements')

    print('Uploading items')

    # with open('requirements.json', 'w') as out:
    #     out.write(json.dumps(items))

    updated = 0
    try:
        with table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)
                updated += 1
    except Exception as e:
        print(e)
    print("Updated: ", updated)


if __name__ == '__main__':
    main()
