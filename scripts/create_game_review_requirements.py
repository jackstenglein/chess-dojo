"""
Seed the two new Game Review requirements into DynamoDB.

Usage:
    python scripts/create_game_review_requirements.py --stage dev
    python scripts/create_game_review_requirements.py --stage prod

Requires:
    - AWS credentials with DynamoDB write access
    - boto3: pip install boto3

Before running, fill in:
    - EQUAL_RATED_REQ_ID: look up "Review Games with Equal-Rated Players" in DynamoDB
    - COUNTS: per-cohort target counts (ask maintainer)
"""

import argparse
import re
import sys
from datetime import datetime, timezone

import boto3

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)

# -- Deterministic IDs for idempotency (re-running overwrites, not duplicates) --
PEER_REVIEW_REQ_ID = "a1b2c3d4-peer-review-session-placeholder"
SENSEI_REVIEW_REQ_ID = "a1b2c3d4-sensei-review-session-placeholder"

# -- IDs of existing requirements that the new ones cascade to --
HIGHER_RATED_REQ_ID = "72241c06-5d06-4245-92da-9b294c6b736a"
EQUAL_RATED_REQ_ID = "TODO_LOOK_UP_FROM_DYNAMODB"

# -- Per-cohort target counts (placeholder — ask maintainer) --
COUNTS = {
    # "0-300": 0,
    # "300-400": 0,
    # ...fill in from existing review requirements or maintainer input
}

def validate():
    """Check that all placeholder values have been filled in before writing."""
    errors = []
    for name, val in [
        ("PEER_REVIEW_REQ_ID", PEER_REVIEW_REQ_ID),
        ("SENSEI_REVIEW_REQ_ID", SENSEI_REVIEW_REQ_ID),
        ("EQUAL_RATED_REQ_ID", EQUAL_RATED_REQ_ID),
        ("HIGHER_RATED_REQ_ID", HIGHER_RATED_REQ_ID),
    ]:
        if not UUID_PATTERN.match(val):
            errors.append(f"{name} is not a valid UUID: {val}")
    if not COUNTS:
        errors.append("COUNTS dict is empty — no cohort targets defined")
    if errors:
        print("ERROR: Cannot run script with incomplete configuration:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)


REQUIREMENTS = [
    {
        "id": {"S": PEER_REVIEW_REQ_ID},
        "status": {"S": "ACTIVE"},
        "category": {"S": "Games + Analysis"},
        "name": {"S": "Peer Review Session"},
        "description": {"S": ""},
        "freeDescription": {"S": ""},
        "counts": {"M": {k: {"N": str(v)} for k, v in COUNTS.items()}},
        "startCount": {"N": "0"},
        "numberOfCohorts": {"N": "-1"},
        "unitScore": {"N": "0"},
        "totalScore": {"N": "0"},
        "scoreboardDisplay": {"S": "PROGRESS_BAR"},
        "progressBarSuffix": {"S": ""},
        "sortPriority": {"S": ""},
        "expirationDays": {"N": "-1"},
        "isFree": {"BOOL": False},
        "subscriptionTiers": {"L": [{"S": "GAME_REVIEW"}]},
        "linkedRequirementId": {"S": EQUAL_RATED_REQ_ID},
        "updatedAt": {"S": ""},
    },
    {
        "id": {"S": SENSEI_REVIEW_REQ_ID},
        "status": {"S": "ACTIVE"},
        "category": {"S": "Games + Analysis"},
        "name": {"S": "Review with Sensei"},
        "description": {"S": ""},
        "freeDescription": {"S": ""},
        "counts": {"M": {k: {"N": str(v)} for k, v in COUNTS.items()}},
        "startCount": {"N": "0"},
        "numberOfCohorts": {"N": "-1"},
        "unitScore": {"N": "0"},
        "totalScore": {"N": "0"},
        "scoreboardDisplay": {"S": "PROGRESS_BAR"},
        "progressBarSuffix": {"S": ""},
        "sortPriority": {"S": ""},
        "expirationDays": {"N": "-1"},
        "isFree": {"BOOL": False},
        "subscriptionTiers": {"L": [{"S": "GAME_REVIEW"}]},
        "linkedRequirementId": {"S": HIGHER_RATED_REQ_ID},
        "updatedAt": {"S": ""},
    },
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", required=True, choices=["dev", "prod"])
    parser.add_argument(
        "--dry-run", action="store_true", help="Print items without writing"
    )
    args = parser.parse_args()

    validate()

    table_name = f"{args.stage}-requirements"
    client = boto3.client("dynamodb", region_name="us-east-1")

    now = datetime.now(timezone.utc).isoformat()

    for req in REQUIREMENTS:
        req["updatedAt"]["S"] = now
        if args.dry_run:
            print(f"Would write: {req['name']['S']} ({req['id']['S']})")
            continue

        try:
            client.put_item(TableName=table_name, Item=req)
            print(f"Created: {req['name']['S']} ({req['id']['S']})")
        except Exception as e:
            print(f"FAILED to write {req['name']['S']}: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
