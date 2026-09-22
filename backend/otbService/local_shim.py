#!/usr/bin/env python3
"""Local-dev stand-in for the deployed OTB service (NOT for production).

Implements the same contract the frontend expects:
  POST /otb/jobs {fideId} -> {jobId, cached}
  GET  /otb/jobs/{jobId}  -> {status, done, total, label, error?, url?}
  GET  /payloads/{jobId}.json -> finished payload

Serves the Flask demo's SQLite cache when fresh (instant, with full round
details), otherwise scrapes live with the vendored modules (needs network
that can reach FIDE — use a VPN if your ISP path is blocked).

Run:  python local_shim.py   (from backend/otbService; needs requests, bs4)
Then: NEXT_PUBLIC_OTB_BASE_URL=http://localhost:5002 pnpm --filter frontend dev
"""
import json
import os
import sqlite3
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import fide_monthly as fm
import otb_lib as lib
import uschess_api as api

PORT = int(os.environ.get("OTB_SHIM_PORT", "5002"))
FLASK_CACHE = os.environ.get(
    "FLASK_CACHE_DB",
    "/Users/kostya/Documents/Projects/FIDE Scraper/dojo_app/cache.db",
)
CACHE_TTL_SECONDS = 30 * 86400

jobs = {}
jobs_lock = threading.Lock()


def flask_cache_get(fide_id):
    """Fresh payload from the Flask demo's cache, or None."""
    if not os.path.exists(FLASK_CACHE):
        return None
    try:
        c = sqlite3.connect(FLASK_CACHE)
        row = c.execute(
            "SELECT payload, updated_at FROM players WHERE fide_id = ?",
            (str(fide_id),),
        ).fetchone()
        c.close()
    except Exception:
        return None
    if not row:
        return None
    payload, updated_at = row
    if time.time() - updated_at > CACHE_TTL_SECONDS:
        return None
    return json.loads(payload)


def worker(job_id, fide_id):
    def progress(done, total, label):
        with jobs_lock:
            jobs[job_id].update(
                status="scraping", done=done, total=total, label=label or ""
            )

    try:
        cached = flask_cache_get(fide_id)
        if cached and cached.get("tournaments"):
            with jobs_lock:
                jobs[job_id].update(status="done", done=1, total=1,
                                    label="cached", payload=cached)
            return
        payload = lib.scrape_player(fide_id, progress=progress)
        if not payload["tournaments"] and not payload["info"]["name"]:
            raise RuntimeError("No FIDE player found with that ID.")

        def usprogress(done, total, label):
            progress(done, total, "US Chess: " + (label or ""))

        try:
            uscf_id = lib.find_uscf_id(
                fide_id, (payload["info"] or {}).get("name", ""))
            if uscf_id:
                up = api.fetch_player(uscf_id, progress=usprogress)
                payload["uschess"] = up
                payload["uschess_error"] = None
                payload["uscf_id"] = uscf_id
            else:
                payload["uschess"] = None
                payload["uschess_error"] = (
                    "No linked US Chess record found for this player.")
        except Exception as e:  # noqa: BLE001 - USCF is best-effort
            payload["uschess"] = None
            payload["uschess_error"] = str(e)
        with jobs_lock:
            jobs[job_id].update(status="done", done=1, total=1,
                                label="done", payload=payload)
    except Exception as e:  # noqa: BLE001 - surfaced to the UI
        with jobs_lock:
            jobs[job_id].update(status="error", error=str(e))


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if urlparse(self.path).path != "/otb/jobs":
            return self._json(404, {"publicMessage": "Not found"})
        try:
            body = json.loads(self.rfile.read(
                int(self.headers.get("Content-Length", 0)) or 0) or b"{}")
        except ValueError:
            return self._json(400, {"publicMessage": "JSON body required"})
        fide_id = str(body.get("fideId") or "").strip()
        if not fide_id.isdigit():
            return self._json(
                400, {"publicMessage": "numeric fideId required"})
        job_id = uuid.uuid4().hex[:12]
        with jobs_lock:
            jobs[job_id] = {"jobId": job_id, "fideId": fide_id,
                            "status": "starting", "done": 0, "total": 0,
                            "label": ""}
        threading.Thread(target=worker, args=(job_id, fide_id),
                         daemon=True).start()
        host = f"http://localhost:{PORT}"
        return self._json(200, {"jobId": job_id, "cached": False,
                                "_local": host})

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/otb/jobs/"):
            job_id = path.rsplit("/", 1)[-1]
            with jobs_lock:
                job = jobs.get(job_id)
            if not job:
                return self._json(404, {"publicMessage": "Unknown job."})
            out = {"status": job["status"], "done": job["done"],
                   "total": job["total"], "label": job.get("label", ""),
                   "error": job.get("error")}
            if job["status"] == "done":
                out["url"] = (f"http://localhost:{PORT}/payloads/"
                              f"{job_id}.json")
            return self._json(200, out)
        if path.startswith("/payloads/") and path.endswith(".json"):
            job_id = path.rsplit("/", 1)[-1][:-5]
            with jobs_lock:
                job = jobs.get(job_id)
            if not job or job["status"] != "done" or "payload" not in job:
                return self._json(404, {"publicMessage": "Not ready."})
            return self._json(200, job["payload"])
        return self._json(404, {"publicMessage": "Not found"})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"OTB local shim on http://localhost:{PORT} "
          f"(Flask cache: {FLASK_CACHE})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
