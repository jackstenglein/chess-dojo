"""HTTP + worker handlers for the OTB (FIDE + US Chess) service.

Endpoints (JWT-protected, attached to the shared httpApi):
  POST /otb/jobs  {fideId} -> {jobId} (+ cached:true on a fresh cache hit)
  GET  /otb/jobs/{jobId}   -> {status, done, total, label, error?, url?}
       url is a presigned S3 GET for the finished payload (1h expiry).

The worker runs the full scrape (FIDE polite scrape + USCF fetch) with a
900s timeout, writes the gzipped payload to S3 and upserts the cache index.
A throttled partial never overwrites a fuller cache (same guard as the
Flask prototype).
"""
import gzip
import json
import os
import time
import uuid

import boto3

import otb_lib as lib

REGION = "us-east-1"
CACHE_TTL_SECONDS = 30 * 86400
URL_EXPIRY_SECONDS = 3600

_stage = os.environ.get("stage", "dev")
_jobs_table = boto3.resource("dynamodb", region_name=REGION).Table(
    f"{_stage}-otb-jobs"
)
_cache_table = boto3.resource("dynamodb", region_name=REGION).Table(
    f"{_stage}-otb-cache"
)
_links_table = boto3.resource("dynamodb", region_name=REGION).Table(
    f"{_stage}-otb-links"
)
_bucket = f"{_stage}-otb-payloads"
_s3 = boto3.client("s3", region_name=REGION)
_lambda = boto3.client("lambda", region_name=REGION)


def _resp(status, body):
    return {"statusCode": status, "body": json.dumps(body)}


def _now():
    return int(time.time())


def link_get(fide_id):
    row = _links_table.get_item(Key={"fideId": str(fide_id)}).get("Item")
    return row["uscfId"] if row else None


def link_put(fide_id, uscf_id):
    _links_table.put_item(
        Item={"fideId": str(fide_id), "uscfId": str(uscf_id)}
    )


def start_job(event, context):
    """POST /otb/jobs — start (or reuse) a scrape for one FIDE ID."""
    try:
        body = json.loads(event.get("body") or "{}")
    except (TypeError, ValueError):
        return _resp(400, {"publicMessage": "Invalid request: JSON body required"})
    fide_id = str(body.get("fideId") or "").strip()
    if not fide_id.isdigit():
        return _resp(
            400, {"publicMessage": "Invalid request: numeric fideId required"}
        )

    cached = _cache_table.get_item(Key={"fideId": fide_id}).get("Item")
    if cached and _now() - int(cached.get("updatedAt", 0)) < CACHE_TTL_SECONDS:
        job_id = uuid.uuid4().hex[:12]
        _jobs_table.put_item(
            Item={
                "jobId": job_id,
                "fideId": fide_id,
                "status": "done",
                "done": 1,
                "total": 1,
                "label": "cached",
                "s3key": cached["s3key"],
                "updatedAt": _now(),
            }
        )
        return _resp(200, {"jobId": job_id, "cached": True})

    job_id = uuid.uuid4().hex[:12]
    _jobs_table.put_item(
        Item={
            "jobId": job_id,
            "fideId": fide_id,
            "status": "starting",
            "done": 0,
            "total": 0,
            "label": "",
            "updatedAt": _now(),
        }
    )
    worker_fn = os.environ["WORKER_FUNCTION"]
    _lambda.invoke(
        FunctionName=worker_fn,
        InvocationType="Event",
        Payload=json.dumps({"jobId": job_id, "fideId": fide_id}),
    )
    return _resp(200, {"jobId": job_id, "cached": False})


def get_job(event, context):
    """GET /otb/jobs/{jobId} — poll scrape progress / fetch result URL."""
    job_id = (event.get("pathParameters") or {}).get("jobId", "")
    row = _jobs_table.get_item(Key={"jobId": job_id}).get("Item")
    if not row:
        return _resp(404, {"publicMessage": "Unknown job."})
    out = {
        "status": row.get("status", "starting"),
        "done": int(row.get("done", 0)),
        "total": int(row.get("total", 0)),
        "label": row.get("label", ""),
        "error": row.get("error"),
    }
    if out["status"] == "done" and row.get("s3key"):
        out["url"] = _s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": _bucket, "Key": row["s3key"]},
            ExpiresIn=URL_EXPIRY_SECONDS,
        )
    return _resp(200, out)


def _progress(job_id):
    def report(done, total, label):
        _jobs_table.update_item(
            Key={"jobId": job_id},
            UpdateExpression="SET #s=:s, #d=:d, #t=:t, #l=:l, updatedAt=:u",
            ExpressionAttributeNames={
                "#s": "status",
                "#d": "done",
                "#t": "total",
                "#l": "label",
            },
            ExpressionAttributeValues={
                ":s": "scraping",
                ":d": int(done or 0),
                ":t": int(total or 0),
                ":l": label or "",
                ":u": _now(),
            },
        )

    return report


def _get_object(key):
    obj = _s3.get_object(Bucket=_bucket, Key=key)
    raw = obj["Body"].read()
    try:
        return json.loads(gzip.decompress(raw).decode("utf-8"))
    except OSError:
        return json.loads(raw.decode("utf-8"))


def _put_payload(fide_id, payload):
    key = f"players/{fide_id}/{_now()}.json.gz"
    _s3.put_object(
        Bucket=_bucket,
        Key=key,
        Body=gzip.compress(json.dumps(payload).encode("utf-8")),
        ContentType="application/json",
        ContentEncoding="gzip",
    )
    return key


def worker(event, context):
    """Async scrape: FIDE polite scrape, then USCF leg, then cache + done."""
    job_id = event["jobId"]
    fide_id = str(event["fideId"])
    progress = _progress(job_id)
    try:
        payload = lib.scrape_player(fide_id, progress=progress)
        if not payload["tournaments"] and not payload["info"]["name"]:
            raise RuntimeError("No FIDE player found with that ID.")
        failed = payload.get("failed_periods") or []
        old_index = _cache_table.get_item(Key={"fideId": fide_id}).get("Item")
        old_rounds = {}
        if failed and old_index and int(old_index.get("tournaments", 0)) > len(
            payload["tournaments"]
        ):
            names = ", ".join(
                f"{f['period']} {f['rating_type']}" for f in failed[:8]
            )
            if len(failed) > 8:
                names += ", …"
            raise RuntimeError(
                f"{len(failed)} rating period(s) could not be fetched "
                f"({names}); kept the cached data. Please try again later."
            )
        # USCF leg (tolerant — must not lose FIDE data).
        def usprogress(done, total, label):
            progress(done, total, "US Chess: " + (label or ""))

        try:
            uscf_id = lib.find_uscf_id(
                fide_id,
                (payload["info"] or {}).get("name", ""),
                link_get=link_get,
                link_put=link_put,
            )
            if uscf_id:
                import uschess_api as api

                up = api.fetch_player(uscf_id, progress=usprogress)
                # Round details: reuse across refreshes by section; only
                # new sections cost crosstable calls.
                if old_index and old_index.get("s3key"):
                    try:
                        old_payload = _get_object(old_index["s3key"])
                        old_rounds = {
                            t.get("section_id"): t.get("rounds", [])
                            for t in (old_payload.get("uschess") or {}).get(
                                "tournaments", []
                            )
                            if t.get("section_id")
                        }
                    except Exception:
                        old_rounds = {}
                for t in up["tournaments"]:
                    if not t.get("rounds") and old_rounds.get(
                        t.get("section_id")
                    ):
                        t["rounds"] = old_rounds[t["section_id"]]
                _enrich_new_sections(uscf_id, up["tournaments"], old_rounds,
                                     usprogress)
                payload["uschess"] = up
                payload["uschess_error"] = None
                payload["uscf_id"] = uscf_id
            else:
                payload["uschess"] = None
                payload["uschess_error"] = (
                    "No linked US Chess record found for this player."
                )
        except Exception as e:
            payload["uschess"] = None
            payload["uschess_error"] = str(e)

        s3key = _put_payload(fide_id, payload)
        _cache_table.put_item(
            Item={
                "fideId": fide_id,
                "updatedAt": _now(),
                "uscfId": payload.get("uscf_id", ""),
                "tournaments": len(payload["tournaments"]),
                "s3key": s3key,
            }
        )
        _jobs_table.update_item(
            Key={"jobId": job_id},
            UpdateExpression="SET #s=:s, s3key=:k, updatedAt=:u",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": "done", ":k": s3key, ":u": _now()},
        )
    except Exception as e:
        _jobs_table.update_item(
            Key={"jobId": job_id},
            UpdateExpression="SET #s=:s, #e=:e, updatedAt=:u",
            ExpressionAttributeNames={"#s": "status", "#e": "error"},
            ExpressionAttributeValues={
                ":s": "error",
                ":e": str(e),
                ":u": _now(),
            },
        )


def _enrich_new_sections(uscf_id, tournaments, old_rounds, progress=None):
    """Crosstable rounds/colors only for sections lacking them."""
    import uschess_api as api

    pending = []
    for t in tournaments:
        if t.get("section_id") in old_rounds and old_rounds[t["section_id"]]:
            continue
        if not t.get("event_id") or t.get("section_number") is None:
            continue
        pending.append(t)
    for i, t in enumerate(pending):
        if progress:
            progress(i + 1, len(pending), f"round details {i + 1}/{len(pending)}")
        try:
            data = api.polite_get(
                api.new_session(),
                f"/rated-events/{t['event_id']}/sections/"
                f"{t['section_number']}/standings",
                params={"Size": 500},
            )
        except Exception:
            continue
        items = data.get("items", []) if isinstance(data, dict) else []
        entry = next(
            (e for e in items if str(e.get("memberId")) == str(uscf_id)), None
        )
        if not entry:
            continue
        standings = []
        for r in entry.get("roundOutcomes") or []:
            standings.append(
                {
                    "round": r.get("roundNumber"),
                    "outcome": r.get("outcome") or "",
                    "color": r.get("color") or "",
                    "opp_id": str(r.get("opponentMemberId") or ""),
                    "opp": f"{r.get('opponentLastName', '')}, "
                           f"{r.get('opponentFirstName', '')}".strip(", "),
                }
            )
        standings.sort(key=lambda r: (r["round"] is None, r["round"] or 0))
        lib.merge_round_info(t.get("rounds", []), standings)
