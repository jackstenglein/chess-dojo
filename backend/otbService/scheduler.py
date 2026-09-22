"""Nightly scheduler: keep every linked member's OTB cache warm, top-down.

EventBridge cron wakes this up nightly. It scans the users table for
members with a FIDE ID linked, selects up to BATCH_SIZE due members via
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


def run(event, context):
    """Scheduled entrypoint. Returns {scheduled: [fideIds]}."""
    users = []
    for u in _scan_all(
        _users,
        ProjectionExpression="username, ratings, dojoCohort",
    ):
        ratings = u.get("ratings") or {}
        fide = ratings.get("FIDE") or {}
        if fide.get("username"):
            users.append(
                {
                    "username": u.get("username", ""),
                    "fide_id": str(fide["username"]).strip(),
                    "cohort": u.get("dojoCohort", ""),
                }
            )

    cache_state = {}
    for row in _scan_all(
        _cache, ProjectionExpression="fideId, updatedAt"
    ):
        try:
            cache_state[str(row["fideId"])] = int(row.get("updatedAt", 0))
        except (ValueError, TypeError):
            continue

    batch = lib.select_batch(users, cache_state, BATCH_SIZE, int(time.time()))
    worker_fn = os.environ["WORKER_FUNCTION"]
    for fide_id in batch:
        job_id = uuid.uuid4().hex[:12]
        _jobs.put_item(
            Item={
                "jobId": job_id,
                "fideId": fide_id,
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
            Payload=json.dumps({"jobId": job_id, "fideId": fide_id}),
        )
    return {"statusCode": 200, "body": json.dumps({"scheduled": batch})}
