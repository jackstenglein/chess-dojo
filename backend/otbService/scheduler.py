"""Nightly scheduler: keep every linked member's OTB cache warm, top-down.

EventBridge cron wakes this up nightly. It scans the users table for
members with a FIDE and/or US Chess ID on their profile, selects up to BATCH_SIZE due members via
otb_lib.select_batch (never-scraped first by cohort strength, then
stalest-first), and invokes the worker for each. Failures simply stay
stale and are retried the next night. Manual refreshes (30-day cooldown
in the tab) and new-signup first scrapes happen through /otb/jobs.
"""
import json
import os
import time
import uuid

import boto3

import otb_lib as lib

REGION = "us-east-1"
BATCH_SIZE = int(os.environ.get("SCHEDULER_BATCH_SIZE", "65"))

_stage = os.environ.get("stage", "dev")
_users_table_arn = os.environ["USERS_TABLE_ARN"]
_users_table_name = _users_table_arn.split("/")[-1]
_ddb = boto3.resource("dynamodb", region_name=REGION)
_users = _ddb.Table(_users_table_name)
_jobs = _ddb.Table(f"{_stage}-otb-jobs")
_cache = _ddb.Table(f"{_stage}-otb-cache")
_lambda = boto3.client("lambda", region_name=REGION)


def _scan_all(table, **kwargs):
    items, start = [], None
    while True:
        if start:
            kwargs["ExclusiveStartKey"] = start
        resp = table.scan(**kwargs)
        items.extend(resp.get("Items", []))
        start = resp.get("LastEvaluatedKey")
        if not start:
            return items


def _rating_id(ratings, system):
    """Numeric rating ID the member entered on their profile, or ''."""
    value = str((ratings.get(system) or {}).get("username") or "").strip()
    return value if value.isdigit() else ""


def run(event, context):
    """Scheduled entrypoint. Returns {scheduled: [playerKeys]}."""
    users = []
    for u in _scan_all(
        _users,
        ProjectionExpression="username, ratings, dojoCohort",
    ):
        ratings = u.get("ratings") or {}
        fide_id = _rating_id(ratings, "FIDE")
        uscf_id = _rating_id(ratings, "USCF")
        if fide_id or uscf_id:
            users.append(
                {
                    "username": u.get("username", ""),
                    "fide_id": fide_id,
                    "uscf_id": uscf_id,
                    "cohort": u.get("dojoCohort", ""),
                }
            )

    cache_state = {}
    for row in _scan_all(
        _cache, ProjectionExpression="playerKey, updatedAt"
    ):
        try:
            cache_state[str(row["playerKey"])] = int(row.get("updatedAt", 0))
        except (ValueError, TypeError):
            continue

    batch = lib.select_batch(users, cache_state, BATCH_SIZE, int(time.time()))
    worker_fn = os.environ["WORKER_FUNCTION"]
    for u in batch:
        job_id = uuid.uuid4().hex[:12]
        _jobs.put_item(
            Item={
                "jobId": job_id,
                "fideId": u["fide_id"],
                "uscfId": u["uscf_id"],
                "status": "starting",
                "done": 0,
                "total": 0,
                "label": "scheduled",
                "updatedAt": int(time.time()),
            }
        )
        _lambda.invoke(
            FunctionName=worker_fn,
            InvocationType="Event",
            Payload=json.dumps(
                {"jobId": job_id, "fideId": u["fide_id"], "uscfId": u["uscf_id"]}
            ),
        )
    scheduled = [lib.player_key(u["fide_id"], u["uscf_id"]) for u in batch]
    return {"statusCode": 200, "body": json.dumps({"scheduled": scheduled})}
