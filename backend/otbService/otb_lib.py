"""OTB (FIDE + US Chess) scrape/merge/stats library for the Lambda worker.

Ports the battle-tested logic from the FIDE Scraper prototype:
fide_monthly.py (FIDE scraping/parsing), uschess_api.py (MUIR client),
plus the scraper orchestration, event fusion (merge.py) and stats math.
Stdlib + requests + bs4 only. Progress reporting and persistence are
injected by handler.py (DynamoDB + S3), so this module stays offline-testable.
"""
import time

import fide_monthly as fm
import uschess_api as api

# ---------------------------------------------------------------- FIDE
# (mirrors dojo_app/scraper.py)


def new_session():
    import requests

    s = requests.Session()
    s.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0 Safari/537.36"
            ),
        }
    )
    return s


def fetch_combo(s, fide_id, period, rtype):
    """Fetch + parse one (period, type); raises RuntimeError on failure."""
    rtype_name, tnum = fm.RTYPES[rtype]
    r = fm.polite_get(
        s,
        f"{fm.BASE}/a_indv_calculation.php",
        params={"id_number": fide_id, "rating_period": period, "t": tnum},
        headers=fm.XHR,
    )
    out = []
    for t in fm.parse_calc_page(r.text):
        sm = t["summary"]
        out.append(
            {
                "name": t["name"],
                "report_url": t["report_url"],
                "start": t["start"],
                "end": t["end"],
                "month": t["start"][:7] if t["start"] else "",
                "rating_type": rtype_name,
                "rating_period": period[:7],
                "score": sm["score"],
                "games": sm["games"],
                "rating_change": sm["rating_change"],
                "opp_avg": sm["opp_avg"],
                "rounds": t.get("rounds", []),
            }
        )
    if not out:
        # The period list only links periods with rated games, so an empty
        # page means FIDE served a throttled stub (HTTP 200). Raising routes
        # it into the slow retry pass below.
        raise RuntimeError(f"empty result for {period} {rtype_name}")
    return rtype_name, out


def scrape_player(fide_id, progress=None):
    """Scrape everything FIDE has for one player. progress(done,total,label)."""
    s = new_session()
    info = fm.profile_info(s, fide_id)
    history = fm.chart_history(s, fide_id)
    combos = fm.calc_periods(s, fide_id)

    tournaments = []
    failed = []
    total = len(combos)
    for i, (period, rtype) in enumerate(combos):
        rtype_name, _ = fm.RTYPES[rtype]
        if progress:
            progress(i + 1, total, f"{period} {rtype_name}")
        try:
            _, got = fetch_combo(s, fide_id, period, rtype)
        except RuntimeError:
            # FIDE throttles burst traffic; retried gently below.
            failed.append((period, rtype))
            continue
        tournaments.extend(got)

    # Retry pass after a cool-down (shared/VPN exit IPs get throttled
    # mid-scrape; hammering straight into retries keeps failing).
    if failed:
        time.sleep(15)
        retrying, failed = failed, []
        for period, rtype in retrying:
            rtype_name, _ = fm.RTYPES[rtype]
            got = None
            for attempt, gap in enumerate((3, 8), 1):
                if progress:
                    tag = "retry" if attempt == 1 else "retry again"
                    progress(total, total, f"{tag} {period} {rtype_name}")
                time.sleep(gap)
                try:
                    _, got = fetch_combo(s, fide_id, period, rtype)
                    break
                except RuntimeError:
                    continue
            if got is None:
                failed.append((period, rtype))
                continue
            tournaments.extend(got)

    tournaments.sort(key=lambda t: (t["start"], t["name"]))
    return {
        "fide_id": str(fide_id),
        "info": info,
        "history": history,
        "tournaments": tournaments,
        "failed_periods": [
            {"period": p[:7], "rating_type": fm.RTYPES[t][0]} for p, t in failed
        ],
    }


# ---------------------------------------------------------------- USCF
# (mirrors dojo_app/uschess.py; link + fetch + helpers)

SYSTEM_ORDER = ["R", "Q", "B"]
SYSTEM_NAMES = {"R": "Regular", "Q": "Quick", "B": "Blitz"}
_MONTHS = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


def find_uscf_id(fide_id, name, link_get=None, link_put=None):
    """Resolve a FIDE ID to a US Chess ID (link cache optional)."""
    if link_get:
        linked = link_get(fide_id)
        if linked:
            return linked
    cands = api.search_players(name)
    s = api.new_session()
    for c in cands[:10]:
        try:
            info = api.member_info(s, c["uscf_id"])
        except RuntimeError:
            continue
        if str(info.get("fide_id") or "") == str(fide_id):
            if link_put:
                link_put(fide_id, info["uscf_id"])
            return info["uscf_id"]
    return None


def short_month(month):
    """'2026-09' -> \"Sep '26\" for compact peak display."""
    try:
        year, mon = month.split("-")
        return f"{_MONTHS[int(mon)]} '{year[2:]}"
    except (ValueError, IndexError):
        return month or ""


# ---------------------------------------------------------------- merge
# (mirrors dojo_app/merge.py; stdlib only)
import re as _re  # noqa: E402  (kept with merge port for clarity)

MATCH_THRESHOLD = 0.35


def _tokens(name):
    return set(_re.findall(r"[a-z0-9]+", (name or "").lower()))


def _overlap(a_start, a_end, b_start, b_end):
    if not (a_start and a_end and b_start and b_end):
        return False
    return max(a_start, b_start) <= min(a_end, b_end)


def _pair_score(f, u):
    ta, tb = _tokens(f.get("name")), _tokens(u.get("name"))
    jacc = len(ta & tb) / len(ta | tb) if (ta | tb) else 0.0
    exact = f.get("games") == u.get("games") and round(
        f.get("score", 0), 1
    ) == round(u.get("score", 0), 1)
    return jacc + (0.5 if exact else 0.0)


def _norm_opp(name):
    return _re.sub(r"[^a-z]", "", (name or "").lower())


def _opp_key(name):
    parts = (name or "").split(",")
    if len(parts) < 2:
        return ("", "")
    last = _re.sub(r"[^a-z ]", "", parts[0].lower()).split()
    first = _re.sub(r"[^a-z ]", "", parts[1].lower()).split()
    if not last or not first:
        return ("", "")
    return (last[-1], first[0])


def _same_opp(a, b):
    if _norm_opp(a) == _norm_opp(b):
        return True
    ka, kb = _opp_key(a), _opp_key(b)
    return bool(ka[0]) and ka == kb


def split_shared(fide_rounds, uscf_rows):
    """Split USCF game rows into (shared, uscf_only) vs FIDE rounds."""
    remaining = []
    for r in fide_rounds or []:
        if not _norm_opp(r.get("opp")):
            continue
        try:
            sc = float(r.get("score", 0))
        except (TypeError, ValueError):
            continue
        remaining.append([r, sc])
    shared, only = [], []
    for g in uscf_rows or []:
        gs = g.get("score")
        if gs is None:
            only.append(g)
            continue
        hit = None
        for entry in remaining:
            r, left = entry
            if not _same_opp(r.get("opp"), g.get("opp")):
                continue
            if gs - left > 1e-9:
                continue
            rc, gc = (r.get("color") or ""), (g.get("color") or "")
            if rc and gc and rc != gc:
                continue
            hit = entry
            break
        if hit is None:
            only.append(g)
        else:
            hit[1] -= gs
            shared.append(g)
    return shared, only


def _outcome_score(outcome):
    o = (outcome or "").strip().lower()
    if o == "win" or o.endswith("win"):
        return 1.0
    if o == "draw" or o.endswith("draw"):
        return 0.5
    if o == "loss" or o.endswith("loss"):
        return 0.0
    return None


def merge_round_info(game_rows, standings):
    """Attach round numbers + reliable colors to game rows (in place).

    Matches by opponent, preferring exact outcome+color; leftovers keep
    API order with round None. Returns the rows sorted by round.
    """
    pool = list(standings)
    for g in game_rows:
        best, best_rank = None, 99
        for s in pool:
            if s["opp_id"] != (g.get("opp_id") or ""):
                continue
            same_out = _outcome_score(s["outcome"]) == g.get("score")
            same_col = (s["color"] or "") == (g.get("color") or "")
            rank = (
                0
                if (same_out and same_col)
                else 1 if same_out else 2 if same_col else 3
            )
            if rank < best_rank:
                best, best_rank = s, rank
                if rank == 0:
                    break
        if best is not None:
            pool.remove(best)
            g["round"] = best["round"]
            if best["color"] in ("White", "Black"):
                g["color"] = best["color"]
        else:
            g.setdefault("round", None)
    game_rows.sort(key=lambda g: (g.get("round") is None, g.get("round") or 0))
    return game_rows


def match_events(fide, uscf):
    """Returns (pairs, fide_only, uscf_only). pairs: [(f, u, games, score)]."""
    scored = []
    for i, f in enumerate(fide):
        for j, u in enumerate(uscf):
            if not _overlap(
                f.get("start"), f.get("end"), u.get("start"), u.get("end")
            ):
                continue
            s = _pair_score(f, u)
            if s >= MATCH_THRESHOLD:
                scored.append((s, i, j))
    scored.sort(reverse=True)
    used_f, used_u, pairs = set(), set(), []
    for _, i, j in scored:
        if i in used_f or j in used_u:
            continue
        used_f.add(i)
        used_u.add(j)
        f, u = fide[i], uscf[j]
        if (f.get("games") or 0) <= (u.get("games") or 0):
            shared_games, shared_score = f.get("games", 0), f.get("score", 0.0)
        else:
            shared_games, shared_score = u.get("games", 0), u.get("score", 0.0)
        pairs.append((f, u, shared_games, round(shared_score, 1)))
    fide_only = [f for i, f in enumerate(fide) if i not in used_f]
    uscf_only = [u for j, u in enumerate(uscf) if j not in used_u]
    return pairs, fide_only, uscf_only


# ---------------------------------------------------------------- stats
# (performance math mirrors dojo_app/stats.py dp table)

_DP_UPPER = [
    (1.00, 800), (0.99, 677), (0.98, 589), (0.97, 538), (0.96, 501),
    (0.95, 470), (0.94, 444), (0.93, 422), (0.92, 401), (0.91, 383),
    (0.90, 366), (0.89, 351), (0.88, 336), (0.87, 322), (0.86, 309),
    (0.85, 296), (0.84, 284), (0.83, 273), (0.82, 262), (0.81, 251),
    (0.80, 240), (0.79, 230), (0.78, 220), (0.77, 211), (0.76, 202),
    (0.75, 193), (0.74, 184), (0.73, 175), (0.72, 166), (0.71, 158),
    (0.70, 149), (0.69, 141), (0.68, 133), (0.67, 125), (0.66, 117),
    (0.65, 110), (0.64, 102), (0.63, 95), (0.62, 87), (0.61, 80),
    (0.60, 72), (0.59, 65), (0.58, 57), (0.57, 50), (0.56, 43),
    (0.55, 36), (0.54, 29), (0.53, 21), (0.52, 14), (0.51, 7), (0.50, 0),
]
_DP = {p: dp for p, dp in _DP_UPPER}
for _p, _dp in _DP_UPPER:
    _DP[round(1 - _p, 2)] = -_dp


def dp_for(pct):
    """Rating difference for a percentage score (linear interpolation)."""
    if pct >= 1.0:
        return 800
    if pct <= 0.0:
        return -800
    lo = int(pct * 100) / 100
    hi = lo + 0.01
    if hi > 1.0:
        return _DP[round(lo, 2)]
    frac = (pct - lo) / 0.01
    return _DP[round(lo, 2)] * (1 - frac) + _DP[round(hi, 2)] * frac


# ---------------------------------------------------------------- scheduler
# (pure selection logic; AWS I/O lives in scheduler.py for testability)

SCHEDULER_TTL_SECONDS = 30 * 86400


def _cohort_floor(cohort):
    """'2000-2100' -> 2000. Unparseable -> -1 (scheduled last)."""
    try:
        return int(str(cohort).split("-")[0])
    except (ValueError, IndexError, AttributeError):
        return -1


def select_batch(users, cache, limit, now, ttl=SCHEDULER_TTL_SECONDS):
    """Pick up to `limit` FIDE IDs due for refresh, strongest first.

    users: [{fide_id, cohort}]. cache: {fide_id: updated_at}.
    Never-scraped members go first (cohort rating descending — "from the
    top"), then stale members oldest-first. Members without a FIDE ID or
    with fresh cache are skipped.
    """
    never, old = [], []
    for u in users:
        fid = u.get("fide_id")
        if not fid:
            continue
        ts = cache.get(str(fid))
        if ts is None:
            never.append(u)
        elif now - ts > ttl:
            old.append((ts, u))
    never.sort(key=lambda u: _cohort_floor(u.get("cohort")), reverse=True)
    old.sort(key=lambda item: item[0])
    ordered = [str(u["fide_id"]) for u in never]
    ordered += [str(u["fide_id"]) for _, u in old]
    return ordered[:limit]
