#!/usr/bin/env python3
"""
fide_monthly.py — Scrape a player's FIDE profile and collect their
tournament results, grouped by month.

Usage:
    python fide_monthly.py "Carlsen, Magnus"
    python fide_monthly.py 1503014
    python fide_monthly.py "Kavutskiy" --type std --from 2024-01 --to 2025-12
    python fide_monthly.py 1503014 --pick 0        # when a name matches several players

Output: a month-by-month summary printed to the terminal, plus a CSV file
(one row per tournament) saved next to the script unless --no-csv is given.

How it works (all public pages on ratings.fide.com, no login):
  1. Name -> FIDE ID via the site's own player search.
  2. FIDE ID -> the full list of rating periods with rated games via the
     profile's Calculations tab (most recent + "check more periods"),
     covering the player's entire history on FIDE's site.
  3. Each (period, rating type) -> the per-tournament calculation data,
     with score, games and rating change for every tournament.
  4. Tournaments are grouped by the month of the tournament's start date.

Note: FIDE groups results into *rating periods* that don't always match the
calendar month the event was played in (e.g. an event ending June 28 can be
rated in the July period). This script groups by the event's actual dates,
and also records the rating period each result was counted in.

Requires: requests, beautifulsoup4
    pip install requests beautifulsoup4
"""

import argparse
import csv
import json
import re
import sys
import time
from datetime import date

import requests
from bs4 import BeautifulSoup

BASE = "https://ratings.fide.com"
XHR = {"X-Requested-With": "XMLHttpRequest"}
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

RTYPES = {"std": ("Standard", 0), "rpd": ("Rapid", 1), "blz": ("Blitz", 2)}

MONTHS = {"Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05",
          "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09",
          "Oct": "10", "Nov": "11", "Dec": "12"}


def polite_get(session, url, post=False, **kwargs):
    """GET (or POST) with one retry and a short pause to be gentle with FIDE's server."""
    for attempt in (1, 2):
        try:
            if post:
                r = session.post(url, timeout=15, **kwargs)
            else:
                r = session.get(url, timeout=15, **kwargs)
            if r.status_code == 200 and r.content:
                time.sleep(0.4)
                return r
        except requests.RequestException:
            pass
        time.sleep(1.5)
    raise RuntimeError(f"Could not fetch {url}")


def search_player(session, query):
    """Return list of (fide_id, name, fed, std, rpd, blz) matching the query."""
    r = polite_get(session, f"{BASE}/incl_search_l.php",
                   params={"search": query, "simple": 1}, headers=XHR)
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for tr in soup.select("table#table_results tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 8:
            continue
        fid = tds[0].get_text(strip=True)
        name = tds[1].get_text(strip=True)
        fed = tds[4].get_text(strip=True)
        out.append((fid, name, fed,
                    tds[5].get_text(strip=True),
                    tds[6].get_text(strip=True),
                    tds[7].get_text(strip=True)))
    return out


def calc_periods(session, fide_id):
    """Every (rating period, rating type) combo with rated games in the
    player's entire FIDE history, newest first.

    Uses the Calculations tab data: the initial tab shows the most recent
    periods, and the 'Check more periods' action returns the rest.
    Each 'View' link encodes period=YYYY-MM-01&rating=0|1|2.
    """
    combos = set()
    rtype_by_num = {"0": "std", "1": "rpd", "2": "blz"}

    def harvest(html):
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", class_="tur"):
            m = re.search(r"period=(\d{4}-\d{2})-01&rating=([012])", a.get("href", ""))
            if m:
                combos.add((f"{m.group(1)}-01", rtype_by_num[m.group(2)]))

    r = polite_get(session, f"{BASE}/a_calculations.phtml",
                   params={"event": fide_id}, headers=XHR)
    harvest(r.text)
    r = polite_get(session, f"{BASE}/a_calculations.phtml",
                   data={"action": "2", "plr_id": str(fide_id)}, headers=XHR,
                   post=True)
    harvest(r.text)
    return sorted(combos, reverse=True)


def profile_name(session, fide_id):
    """Display name from the profile page title."""
    try:
        r = polite_get(session, f"{BASE}/profile/{fide_id}")
        soup = BeautifulSoup(r.text, "html.parser")
        title = soup.title.get_text(strip=True) if soup.title else ""
        return title.replace(" FIDE Profile", "").replace(" FIDE Chess Profile", "")
    except RuntimeError:
        return ""


def profile_info(session, fide_id):
    """Name, FIDE title, federation etc. from the profile page info blocks."""
    info = {"name": "", "title": "", "federation": "", "fide_id": str(fide_id)}
    try:
        r = polite_get(session, f"{BASE}/profile/{fide_id}")
    except RuntimeError:
        return info
    soup = BeautifulSoup(r.text, "html.parser")
    found = False
    for div in soup.find_all("div", class_="profile-info"):
        parts = [p.strip() for p in div.get_text("|", strip=True).split("|")]
        for i in range(0, len(parts) - 1, 2):
            key, val = parts[i].lower(), parts[i + 1]
            if "fide id" in key:
                info["fide_id"] = val
                found = True
            elif "federation" in key:
                info["federation"] = val
            elif "fide title" in key:
                info["title"] = val
            elif "b-year" in key:
                info["birth_year"] = val
    # FIDE serves its 404 page with HTTP 200; a real profile always has
    # a profile-info block, so without one this ID doesn't exist.
    if found:
        title = soup.title.get_text(strip=True) if soup.title else ""
        info["name"] = title.replace(" FIDE Profile", "").replace(" FIDE Chess Profile", "")
    return info


def chart_history(session, fide_id):
    """Full monthly rating history via the profile chart's data endpoint.

    Returns a list of dicts: month label like '2009-Jul', rating period,
    and standard/rapid/blitz ratings + games per month. This is FIDE's own
    data (absolute ratings), so no reconstruction needed.
    """
    r = polite_get(session, f"{BASE}/a_chart_data.phtml",
                   params={"event": fide_id, "period": "all"},
                   headers=XHR, post=True)
    text = r.text.lstrip("\ufeff")
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    out = []
    for row in data:
        label = (row.get("date_2") or "").strip()
        m = re.match(r"(\d{4})-([A-Za-z]{3})", label)
        if not m:
            continue
        out.append({
            "month": f"{m.group(1)}-{MONTHS.get(m.group(2).title(), '01')}",
            "label": label,
            "std": _num(row.get("rating")),
            "std_games": _num(row.get("period_games")),
            "rpd": _num(row.get("rapid_rtng")),
            "rpd_games": _num(row.get("rapid_games")),
            "blz": _num(row.get("blitz_rtng")),
            "blz_games": _num(row.get("blitz_games")),
        })
    return out


def _num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def parse_game_row(row, has_kchg):
    """Parse one per-opponent row of a calc_table into a game dict.

    Position-based: both layouts put
    [opp, flag, title, opp rating, fed, score, games, chg, ...] at 0-7;
    the rating-change total is K*chg (modern) or chg (older tables).
    Color comes from the white_note/black_note span in the name cell.
    Returns None for separator/blank rows.
    """
    cells = row.find_all(["td", "th"])
    if len(cells) < 8:
        return None
    texts = [c.get_text(strip=True) for c in cells]
    opp = texts[0]
    if not opp:
        return None
    try:
        score = float(texts[5])
        games = int(float(texts[6]))
    except ValueError:
        return None
    try:
        rating = int(float(texts[3])) if texts[3] else None
    except ValueError:
        rating = None
    chg_src = texts[9] if (has_kchg and len(texts) > 9) else texts[7]
    try:
        chg = float(chg_src) if chg_src.strip() else 0.0
    except ValueError:
        chg = 0.0
    span = cells[0].find("span")
    cls = (span.get("class") or [""])[0] if span else ""
    color = {"white_note": "White", "black_note": "Black"}.get(cls, "")
    return {
        "opp": opp,
        "color": color,
        "title": texts[2],
        "rating": rating,
        "fed": texts[4],
        "score": score,
        "games": games,
        "chg": chg,
    }


def parse_calc_page(html):
    """Parse one a_indv_calculation.php response into tournament dicts.

    Header-driven: maps the summary row's cells by the table's own header
    names, so both the modern layout (..., w, n, chg, K, K*chg) and older
    ones (..., w, n, chg, Rp, K — where chg is already the total) parse.
    Each tournament also gets "rounds": one dict per opponent row
    (opp, color, title, rating, fed, score, games, chg).
    """
    soup = BeautifulSoup(html, "html.parser")
    tournaments = []
    current = None
    for el in soup.find_all(["div", "table"]):
        if el.name == "div" and "default_div_full" in (el.get("class") or []):
            a = el.find("a", class_="head1")
            if a:
                dates = re.findall(r"\d{4}-\d{2}-\d{2}", el.get_text(" ", strip=True))
                href = a.get("href", "")
                current = {
                    "name": a.get_text(strip=True),
                    "report_url": BASE + href if href.startswith("/") else href,
                    "start": dates[0] if len(dates) > 0 else "",
                    "end": dates[1] if len(dates) > 1 else (dates[0] if dates else ""),
                    "summary": None,
                    "rounds": [],
                }
        elif el.name == "table" and "calc_table" in (el.get("class") or []):
            rows = el.find_all("tr")
            if len(rows) >= 2 and current is not None:
                header = [c.get_text(strip=True) for c in rows[0].find_all(["td", "th"])]
                cells = [c.get_text(strip=True) for c in rows[1].find_all(["td", "th"])]
                col = {name: i for i, name in enumerate(header) if name}
                has_kchg = "K*chg" in col
                try:
                    score = float(cells[col["w"]])
                    games = int(float(cells[col["n"]]))
                    if has_kchg:
                        rating_change = float(cells[col["K*chg"]])
                    else:
                        rating_change = float(cells[col["chg"]])
                    current["summary"] = {
                        "score": score,
                        "games": games,
                        "rating_change": rating_change,
                        "opp_avg": cells[col["Ro"]] if "Ro" in col else "",
                    }
                except (KeyError, ValueError, IndexError):
                    pass
                for grow in rows[2:]:
                    g = parse_game_row(grow, has_kchg)
                    if g is not None:
                        current["rounds"].append(g)
            if current is not None:
                if current["summary"] is not None:
                    tournaments.append(current)
                current = None
    return tournaments


def fetch_tournaments(session, fide_id, period, rtype_key):
    rtype_name, t = RTYPES[rtype_key]
    r = polite_get(
        session, f"{BASE}/a_indv_calculation.php",
        params={"id_number": fide_id, "rating_period": period, "t": t},
        headers=XHR)
    tmts = parse_calc_page(r.text)
    for tm in tmts:
        tm["period"] = period[:7]
        tm["rtype"] = rtype_key
        tm["rtype_name"] = rtype_name
    return tmts


def month_key(tmt):
    return tmt["start"][:7] if tmt["start"] else tmt["period"]


def main():
    ap = argparse.ArgumentParser(description="Collect a player's FIDE tournament results by month.")
    ap.add_argument("player", help='Player name ("Carlsen, Magnus") or FIDE ID (1503014)')
    ap.add_argument("--type", choices=["std", "rpd", "blz", "all"], default="all",
                    help="Rating type to include (default: all)")
    ap.add_argument("--from", dest="from_m", default=None, help="Earliest month YYYY-MM")
    ap.add_argument("--to", dest="to_m", default=None, help="Latest month YYYY-MM")
    ap.add_argument("--pick", type=int, default=None,
                    help="If a name matches several players, pick result N (0-based)")
    ap.add_argument("--csv", default=None, help="CSV output path (default: auto-named)")
    ap.add_argument("--no-csv", action="store_true", help="Skip writing the CSV file")
    args = ap.parse_args()

    session = requests.Session()
    session.headers.update(UA)

    # 1. Resolve player -> FIDE ID
    if args.player.isdigit():
        fide_id = args.player
        name = None
    else:
        matches = search_player(session, args.player)
        if not matches:
            sys.exit(f'No FIDE player found for "{args.player}".')
        if len(matches) > 1 and args.pick is None:
            print(f'{len(matches)} players match "{args.player}":')
            for i, (fid, nm, fed, s, rp, b) in enumerate(matches):
                print(f"  [{i}] {nm} ({fed})  ID {fid}  std {s} rpd {rp} blz {b}")
            sys.exit("Re-run with --pick N to choose one.")
        idx = args.pick or 0
        fide_id, name, fed, *_ = matches[idx]
        if len(matches) > 1:
            print(f"Using [{idx}] {name} ({fed}), ID {fide_id}")

    # 2. All rating periods with games, across the player's full FIDE history
    combos = calc_periods(session, fide_id)
    if name is None:
        name = profile_name(session, fide_id)
    display = name or f"FIDE ID {fide_id}"
    print(f"\nPlayer: {display}  (FIDE ID {fide_id})")
    print(f"Profile: {BASE}/profile/{fide_id}")

    want_types = [args.type] if args.type != "all" else ["std", "rpd", "blz"]
    combos = [(p, t) for (p, t) in combos if t in want_types]
    if args.from_m:
        combos = [(p, t) for (p, t) in combos if p[:7] >= args.from_m]
    if args.to_m:
        combos = [(p, t) for (p, t) in combos if p[:7] <= args.to_m]
    if not combos:
        sys.exit("No rated games found for the selected filters.")

    # 3. Fetch every active period
    tournaments = []
    total = len(combos)
    for i, (period, rtype) in enumerate(combos, 1):
        rname = RTYPES[rtype][0]
        print(f"  [{i}/{total}] {period[:7]} {rname}...", end=" ", flush=True)
        try:
            tmts = fetch_tournaments(session, fide_id, period, rtype)
        except RuntimeError as e:
            print(f"FAILED ({e})")
            continue
        print(f"{len(tmts)} tournament(s)")
        tournaments.extend(tmts)

    if not tournaments:
        sys.exit("No tournament details retrieved.")

    # 4. Group by month of tournament start date
    by_month = {}
    for tm in tournaments:
        by_month.setdefault(month_key(tm), []).append(tm)

    print(f"\n{'Month':<8}{'Tmnts':>6}{'Games':>7}{'Score':>8}{'Score%':>8}{'Rt chg':>9}")
    print("-" * 48)
    grand = {"n": 0, "w": 0.0, "chg": 0.0, "t": 0}
    for m in sorted(by_month):
        tmts = by_month[m]
        games = sum(t["summary"]["games"] for t in tmts if t["summary"])
        score = sum(t["summary"]["score"] for t in tmts if t["summary"])
        chg = sum(t["summary"]["rating_change"] for t in tmts if t["summary"])
        pct = 100 * score / games if games else 0
        print(f"{m:<8}{len(tmts):>6}{games:>7}{score:>8.1f}{pct:>7.1f}%{chg:>+9.2f}")
        grand["n"] += games
        grand["w"] += score
        grand["chg"] += chg
        grand["t"] += len(tmts)
    print("-" * 48)
    gpct = 100 * grand["w"] / grand["n"] if grand["n"] else 0
    print(f"{'TOTAL':<8}{grand['t']:>6}{grand['n']:>7}{grand['w']:>8.1f}{gpct:>7.1f}%{grand['chg']:>+9.2f}")

    print("\nTournaments (newest first):")
    for tm in sorted(tournaments, key=lambda t: (t["start"], t["name"]), reverse=True):
        s = tm["summary"] or {}
        rng = tm["start"] + (" → " + tm["end"] if tm["end"] != tm["start"] else "")
        print(f"  {rng}  [{tm['rtype_name']}] {tm['name']} — "
              f"{s.get('score', '?')}/{s.get('games', '?')} "
              f"({s.get('rating_change', 0):+.2f}, period {tm['period']})")

    # 5. CSV: one row per tournament
    if not args.no_csv:
        csv_path = args.csv or f"fide_{fide_id}_{date.today():%Y%m%d}.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["month", "tournament", "start", "end", "rating_type",
                        "rating_period", "games", "score", "rating_change",
                        "opp_avg_rating", "report_url"])
            for tm in sorted(tournaments, key=lambda t: (t["start"], t["name"])):
                s = tm["summary"] or {}
                w.writerow([month_key(tm), tm["name"], tm["start"], tm["end"],
                            tm["rtype_name"], tm["period"],
                            s.get("games", ""), s.get("score", ""),
                            s.get("rating_change", ""), s.get("opp_avg", ""),
                            tm["report_url"]])
        print(f"\nCSV saved: {csv_path}")


if __name__ == "__main__":
    main()
