#!/usr/bin/env python3
"""US Chess (MUIR) API client + payload builder for the Tournament Explorer.

Data source: the official US Chess MUIR JSON API
    https://ratings-api.uschess.org/api/v1
Public GET endpoints, no authentication required (verified 2026-09-21).

Endpoints used:
  GET /api/v1/members?Fuzzy={name}&Size={n}          name search
  GET /api/v1/members/{id}                            member detail
  GET /api/v1/members/{id}/sections?Size=1000&Offset= event-by-event history
  GET /api/v1/members/{id}/games?Size=1000&Offset=    per-game results
  GET /api/v1/members/{id}/rating-supplements?Size=N  monthly rating snapshots

Tournament results are built by joining `sections` (pre/post ratings per
system, incl. dual-rated R+Q sections) with `games` (aggregated W/D/L/score
per section). Do NOT scrape https://ratings.uschess.org (robots.txt disallows
all crawlers); the API above is the sanctioned machine path.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests

BASE = "https://ratings-api.uschess.org/api/v1"
HEADERS = {
    "User-Agent": "ChessDojo-USChess-Explorer/1.0 (demo; contact via ChessDojo)",
    "Accept": "application/json",
}
PAGE_SIZE = 500
POLITE_PAUSE = 0.4  # seconds between requests; be gentle with US Chess
MAX_RETRIES = 6
REQ_TIMEOUT = 60

SYSTEM_LABELS = {
    "R": "Regular", "Q": "Quick", "B": "Blitz",
    "OR": "Online Regular", "OQ": "Online Quick", "OB": "Online Blitz",
}


def new_session():
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def polite_get(s, path, params=None, retries=MAX_RETRIES):
    """GET with backoff on 429/5xx and on transient network timeouts,
    honoring Retry-After."""
    url = path if path.startswith("http") else BASE + path
    last_exc = None
    for attempt in range(retries):
        try:
            r = s.get(url, params=params, timeout=REQ_TIMEOUT)
        except (requests.Timeout, requests.ConnectionError) as e:
            last_exc = e
            time.sleep(min(2 ** attempt, 30))
            continue
        if r.status_code == 429 or r.status_code >= 500:
            wait = r.headers.get("Retry-After")
            delay = float(wait) if wait and str(wait).isdigit() else (2 ** attempt)
            time.sleep(min(delay, 30))
            continue
        r.raise_for_status()
        time.sleep(POLITE_PAUSE)
        return r.json()
    if last_exc is not None:
        raise RuntimeError(f"API unreachable after {retries} tries: {url}") from last_exc
    raise RuntimeError(f"API kept failing ({r.status_code}) for {url}")


def _paged(s, path, params=None, progress=None, label=""):
    """Follow Offset/Size pagination to the end."""
    out, offset = [], 0
    while True:
        p = dict(params or {})
        p.update(Offset=offset, Size=PAGE_SIZE)
        data = polite_get(s, path, params=p)
        items = data.get("items", [])
        out.extend(items)
        if progress:
            progress(len(out), None, label)
        if not data.get("hasNextPage") or not items:
            break
        offset += len(items)
    return out


# ------------------------------------------------------------- lookup

def search_players(query):
    """Resolve a name or US Chess ID query to candidate dicts."""
    s = new_session()
    q = query.strip()
    if q.isdigit():
        info = member_info(s, q)  # raises if unknown
        return [{"uscf_id": info["uscf_id"], "name": info["name"],
                 "state": info["state"], "ratings": info["ratings"]}]
    data = polite_get(s, "/members", params={"Fuzzy": q, "Size": 25})
    out = []
    for m in data.get("items", []):
        out.append({
            "uscf_id": str(m.get("id")),
            "name": f"{m.get('lastName', '')}, {m.get('firstName', '')}".strip(", "),
            "state": m.get("stateRep", ""),
            "status": m.get("status", ""),
            "ratings": {r["ratingSystem"]: r.get("rating")
                        for r in m.get("ratings", []) if r.get("rating")},
        })
    return out


def member_info(s, uscf_id):
    """Member detail -> info dict (name, titles, ratings w/ floors, links)."""
    try:
        m = polite_get(s, f"/members/{uscf_id}")
    except requests.HTTPError as e:
        raise RuntimeError(f"No US Chess member found with ID {uscf_id}.") from e
    if not m or not m.get("id"):
        raise RuntimeError(f"No US Chess member found with ID {uscf_id}.")
    ratings = {}
    for r in m.get("ratings", []):
        ratings[r["ratingSystem"]] = {
            "rating": r.get("rating"),
            "floor": r.get("floor"),
            "provisional": bool(r.get("isProvisional")),
            "games": r.get("gamesPlayed"),
        }
    return {
        "uscf_id": str(m.get("id")),
        "name": f"{m.get('lastName', '')}, {m.get('firstName', '')}".strip(", "),
        "state": m.get("stateRep", ""),
        "status": m.get("status", ""),
        "fide_id": m.get("fideId"),
        "fide_title": m.get("fideTitle"),
        "ratings": ratings,
        "profile_url": f"https://ratings.uschess.org/player/{m.get('id')}",
    }


# ------------------------------------------------------- history data

def outcome_score(outcome):
    """Map a MUIR game outcome to a score. Unknown codes -> 0.5 is avoided;
    anything unrecognized counts as a played game with 0 (flagged upstream)."""
    o = (outcome or "").strip().lower()
    if o == "win" or o.endswith("win"):
        return 1.0
    if o == "draw" or o.endswith("draw"):
        return 0.5
    if o == "loss" or o.endswith("loss"):
        return 0.0
    return None  # e.g. unplayed/forfeit markers: counted as game, 0 score


def section_scores(s, uscf_id, progress=None, details=False):
    """Aggregate per-section W/D/L/score from the games endpoint.

    With details=True also returns per-section game lists (one row per
    game as played, including blitz double-headers): {sid: [{opp, state,
    color, score, system}]}. Every row counts — no dedup.
    """
    agg = {}
    per_section = {}
    games = _paged(s, f"/members/{uscf_id}/games", progress=progress,
                   label="game results")
    for g in games:
        sec = g.get("section") or {}
        sid = sec.get("id") or f"{sec.get('number')}"
        a = agg.setdefault(sid, {"wins": 0, "draws": 0, "losses": 0,
                                 "unknown": 0, "games": 0, "score": 0.0})
        a["games"] += 1
        sc = outcome_score((g.get("player") or {}).get("outcome"))
        if sc == 1.0:
            a["wins"] += 1
        elif sc == 0.5:
            a["draws"] += 1
        elif sc == 0.0:
            a["losses"] += 1
        else:
            a["unknown"] += 1
        a["score"] += sc if sc is not None else 0.0
        if details:
            pl, op = g.get("player") or {}, g.get("opponent") or {}
            color = pl.get("color") or ""
            per_section.setdefault(sid, []).append({
                "opp": f"{op.get('lastName', '')}, {op.get('firstName', '')}".strip(", "),
                "opp_id": str(op.get("id") or ""),
                "state": op.get("stateRep") or "",
                "color": color if color in ("White", "Black") else "",
                "score": sc,
                "system": g.get("ratingSystem") or "",
            })
    for a in agg.values():
        a["score"] = round(a["score"], 1)
    if details:
        return agg, per_section
    return agg


def monthly_history(s, uscf_id, years_back=15):
    """Monthly rating snapshots (R/Q/B + online) for the chart."""
    data = _paged(s, f"/members/{uscf_id}/rating-supplements")
    hist = []
    for snap in reversed(data):  # API returns newest first
        row = {"month": (snap.get("ratingSupplementDate") or "")[:7]}
        for r in snap.get("ratings", []):
            if r.get("rating"):
                row[r.get("source")] = r["rating"]
        if any(k in row for k in ("R", "Q", "B")):
            hist.append(row)
    cutoff = f"{int(time.strftime('%Y')) - years_back:04d}"
    hist = [h for h in hist if h["month"] >= cutoff]
    for h in hist:
        y, m = h["month"].split("-")
        h["label"] = f"{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(m)]} {y}"
    return hist


def fetch_player(uscf_id, progress=None):
    """Full tournament history for one member. progress(done,total,label)."""
    s = new_session()
    if progress:
        progress(0, 4, "member info")
    info = member_info(s, uscf_id)

    if progress:
        progress(1, 4, "event history")
    sections = _paged(s, f"/members/{uscf_id}/sections", label="events")

    if progress:
        progress(2, 4, "game results")
    scores, game_rows = section_scores(s, uscf_id, details=True)

    tournaments = []
    for sec in sections:
        ev = sec.get("event") or {}
        recs = sec.get("ratingRecords") or []
        changes, pre, post, systems = {}, {}, {}, []
        for rc in recs:
            src = rc.get("ratingSource")
            if not src:
                continue
            systems.append(src)
            pre_d = rc.get("preRatingDecimal")
            post_d = rc.get("postRatingDecimal")
            pre[src] = rc.get("preRating")
            post[src] = rc.get("postRating")
            changes[src] = (round(post_d - pre_d, 1)
                            if pre_d is not None and post_d is not None else 0.0)
        sc = scores.get(sec.get("id"), {})
        tournaments.append({
            "name": ev.get("name", "Unknown event"),
            "event_id": str(ev.get("id", "")),
            "section_id": str(sec.get("id") or ""),
            "section_number": sec.get("sectionNumber"),
            "section": (sec.get("sectionName") or "") +
                       (f" #{sec.get('sectionNumber')}" if sec.get("sectionNumber") else ""),
            "format": sec.get("format", ""),
            "start": sec.get("startDate", ""),
            "end": sec.get("endDate", ""),
            "month": (sec.get("startDate", "") or "")[:7],
            "systems": systems,                      # e.g. ["B"] or ["R","Q"] (dual)
            "system_label": "/".join(SYSTEM_LABELS.get(x, x) for x in systems),
            "games": sc.get("games", 0),
            "score": sc.get("score", 0.0),
            "wins": sc.get("wins", 0),
            "draws": sc.get("draws", 0),
            "losses": sc.get("losses", 0),
            "changes": changes,                       # system -> rating delta
            "pre": pre, "post": post,
            "combined_change": round(sum(changes.values()), 1),
            "rounds": game_rows.get(sec.get("id"), []),
        })

    tournaments.sort(key=lambda t: (t["start"], t["name"]))

    if progress:
        progress(3, 4, "monthly ratings")
    history = monthly_history(s, uscf_id)

    if progress:
        progress(4, 4, "done")
    return {
        "uscf_id": str(uscf_id),
        "info": info,
        "history": history,
        "tournaments": tournaments,
    }


if __name__ == "__main__":
    import json
    q = sys.argv[1] if len(sys.argv) > 1 else "12742780"
    cands = search_players(q)
    print(json.dumps(cands[0], indent=1)[:600])
