#!/usr/bin/env python3
"""
Export round robin winners to a CSV.

Loops through all completed round robins in the tournaments table, collects
winners, and writes: Tournament, Display Name, Username, Current Cohort.

Usage:
  STAGE=prod python scripts/export_round_robin_winners.py [output.csv]
  # or from repo root with default stage (dev):
  python scripts/export_round_robin_winners.py
"""

import csv
import os
import sys

import boto3
from boto3.dynamodb.types import TypeDeserializer

COHORTS = [
    '0-300', '300-400', '400-500', '500-600', '600-700', '700-800', '800-900',
    '900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400', '1400-1500',
    '1500-1600', '1600-1700', '1700-1800', '1800-1900', '1900-2000', '2000-2100',
    '2100-2200', '2200-2300', '2300-2400', '2400+',
]

DEFAULT_STAGE = 'dev'
DESERIALIZER = TypeDeserializer()


def unmarshall(item):
    """Convert DynamoDB item to Python dict."""
    return {k: DESERIALIZER.deserialize(v) for k, v in item.items()}


def fetch_complete_round_robins(client, table_name):
    """Yield all completed round robin tournaments (with winners) across all cohorts."""
    for cohort in COHORTS:
        paginator = client.get_paginator('query')
        request = {
            'TableName': table_name,
            'KeyConditionExpression': '#type = :type AND begins_with(#startsAt, :status)',
            'ExpressionAttributeNames': {'#type': 'type', '#startsAt': 'startsAt'},
            'ExpressionAttributeValues': {
                ':type': {'S': f'ROUND_ROBIN_{cohort}'},
                ':status': {'S': 'COMPLETE'},
            },
        }
        for page in paginator.paginate(**request):
            for item in page.get('Items', []):
                tournament = unmarshall(item)
                winners = tournament.get('winners', [])
                if not winners:
                    continue
                yield tournament


def fetch_player(client, table_name, username):
    response = client.get_item(
        TableName=table_name,
        Key={'username': {'S': username}},
    )
    return unmarshall(response.get('Item', {}))

def main():
    tournaments_table = f'{os.environ.get('STAGE', DEFAULT_STAGE)}-tournaments'
    users_table = f'{os.environ.get('STAGE', DEFAULT_STAGE)}-users'
    output_path = sys.argv[1] if len(sys.argv) > 1 else 'round_robin_winners.csv'

    client = boto3.client('dynamodb')
    rows = []
    added_users = set()

    for tournament in fetch_complete_round_robins(client, tournaments_table):
        name = tournament.get('name', '')
        cohort = tournament.get('cohort', '')
        players = tournament.get('players') or {}
        for username in tournament.get('winners') or []:
            player = players.get(username, None)
            if not player: continue

            user = fetch_player(client, users_table, username)
            if not user: continue

            if username in added_users: continue
            added_users.add(username)

            rows.append({
                'Tournament': f'{cohort} {name}',
                'Display Name': player.get('displayName', ''),
                'Username': player.get('username', username),
                'Email': user.get('email', ''),
                'Current Cohort': user.get('dojoCohort', ''),
                'Active': user.get('updatedAt', '') >= '2026-01-27',
            })

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Tournament', 'Display Name', 'Username', 'Email', 'Current Cohort', 'Active'])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} winner row(s) to {output_path}")


if __name__ == '__main__':
    main()
