import boto3
import csv

db = boto3.resource('dynamodb')
table = db.Table('prod-requirements')


def get_csv_ids(path: str) -> set[str]:
    ids = set()
    with open(path, newline='', encoding='utf8') as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            if row['ID']:
                ids.add(row['ID'])
    return ids


def scan_requirements():
    items = []
    res = table.scan()
    items.extend(res.get('Items', []))

    last_key = res.get('LastEvaluatedKey')
    while last_key:
        res = table.scan(ExclusiveStartKey=last_key)
        items.extend(res.get('Items', []))
        last_key = res.get('LastEvaluatedKey')

    return items


def main():
    csv_ids = get_csv_ids('requirements.csv')
    db_items = scan_requirements()

    extra = [item for item in db_items if item['id'] not in csv_ids]
    extra.sort(key=lambda item: (item.get('category', ''), item.get('sortPriority', ''), item.get('name', '')))

    print(f'Found {len(db_items)} requirements in database')
    print(f'Found {len(csv_ids)} requirements in requirements.csv')
    print(f'Found {len(extra)} requirements in database but not in requirements.csv:\n')

    for item in extra:
        print(f"{item['id']}\t{item.get('status', '')}\t{item.get('category', '')}\t{item.get('name', '')}")


if __name__ == '__main__':
    main()
