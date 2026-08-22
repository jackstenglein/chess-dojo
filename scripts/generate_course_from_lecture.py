import json
import os
import uuid
from decimal import Decimal

import boto3

db = boto3.resource('dynamodb')

STAGE = os.environ.get('stage', 'dev')
table = db.Table(f'{STAGE}-live-classes')

STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
LECTURE_TYPES = ['LECTURE', 'GAME_REVIEW']

DOJO_COHORTS = [
    '0-300',
    '300-400',
    '400-500',
    '500-600',
    '600-700',
    '700-800',
    '800-900',
    '900-1000',
    '1000-1100',
    '1100-1200',
    '1200-1300',
    '1300-1400',
    '1400-1500',
    '1500-1600',
    '1600-1700',
    '1700-1800',
    '1800-1900',
    '1900-2000',
    '2000-2100',
    '2100-2200',
    '2200-2300',
    '2300-2400',
    '2400+',
]

TAG_TO_COURSE_TYPE = {
    'Opening': 'OPENING',
    'Endgame': 'ENDGAME',
}


def get_cohort_range_int(range_str: str) -> tuple[int, float]:
    parts = range_str.replace('+', '').split('-')
    if len(parts) > 0:
        min_cohort = int(parts[0])

    if len(parts) > 1:
        try:
            max_cohort = int(parts[1])
        except ValueError:
            max_cohort = float('inf')
    else:
        max_cohort = float('inf')
    return min_cohort, max_cohort


def cohorts_in_range(range_str: str) -> list[str]:
    min_cohort, max_cohort = get_cohort_range_int(range_str)
    result = []
    for cohort in DOJO_COHORTS:
        compare = int(cohort.split('-')[0].split('+')[0])
        if compare >= min_cohort and compare < max_cohort:
            result.append(cohort)
    return result


def course_type_from_tags(tags: list[str] | None) -> str:
    for tag in tags or []:
        if tag in TAG_TO_COURSE_TYPE:
            return TAG_TO_COURSE_TYPE[tag]
    return 'WORKSHOP'


def to_embed_url(url: str) -> str:
    if '/embed/' in url:
        return url
    if 'watch?v=' in url:
        video_id = url.split('watch?v=')[1].split('&')[0]
        return f'https://www.youtube.com/embed/{video_id}'
    if 'youtu.be/' in url:
        video_id = url.split('youtu.be/')[1].split('?')[0]
        return f'https://www.youtube.com/embed/{video_id}'
    return url


def fetch_lecture(lecture_id: str) -> dict:
    for lecture_type in LECTURE_TYPES:
        res = table.get_item(Key={'type': lecture_type, 'id': lecture_id})
        item = res.get('Item')
        if item:
            return item
    raise Exception(f'Lecture not found: {lecture_id}')


def video_module(recording: dict) -> dict:
    url = recording.get('url', '')
    date = recording.get('date', '')
    name = recording.get('title') or date or 'Recording'
    return {
        'name': name,
        'type': 'VIDEO',
        'description': recording.get('description') or '',
        'videoUrls': [to_embed_url(url)] if url else [],
    }


def lecture_to_course(lecture: dict) -> dict:
    recordings = sorted(lecture.get('recordings') or [], key=lambda r: r.get('date', ''))
    modules = []
    skipped = 0
    for recording in recordings:
        if not recording.get('url'):
            skipped += 1
            print(f'Skipping recording without URL: {recording.get("date", "unknown date")}')
            continue
        modules.append(video_module(recording))

    if skipped:
        print(f'Skipped {skipped} recording(s) without a URL')

    cohort_range = lecture.get('cohortRange') or '0-2400+'
    name = lecture.get('name', '')
    return {
        'type': 'WORKSHOP', #course_type_from_tags(lecture.get('tags')),
        'id': str(uuid.uuid4()),
        'owner': '',
        'ownerDisplayName': lecture.get('teacher') or '',
        'name': name,
        'description': lecture.get('description') or '',
        'whatsIncluded': [f'{len(modules)} hour-long recordings of live workshop classes'],
        'color': 'None',
        'cohorts': cohorts_in_range(cohort_range),
        'cohortRange': cohort_range,
        'includedWithSubscription': False,
        'availableForFreeUsers': True,
        'imageUrl': lecture.get('imageUrl') or '',
        'chapters': [
            {
                'name': 'Recordings',
                'modules': modules,
            }
        ],
        'purchaseOptions': [
            {
                'name': name,
                'fullPrice': min(len(modules) * 1000, 10000),
                'currentPrice': 0,
            }
        ],
    }


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def main():
    lecture_id = input('Lecture ID: ').strip()
    if not lecture_id:
        raise Exception('Lecture ID is required')

    lecture = fetch_lecture(lecture_id)
    print(f'Fetched "{lecture.get("name")}" ({lecture.get("type")}) from {table.name}')

    course = lecture_to_course(lecture)
    course_json = json.dumps(course, indent=4, cls=DecimalEncoder)

    print(course_json)
    with open('out.json', 'w') as outfile:
        outfile.write(course_json)
    print(f'\nWrote course JSON to out.json ({len(course["chapters"][0]["modules"])} videos)')


if __name__ == '__main__':
    main()
