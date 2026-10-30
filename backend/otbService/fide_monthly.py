"""FIDE data for one player: profile via the Lichess FIDE API, tournament
results via ratings.fide.com.

Lichess mirrors FIDE's player database (https://lichess.org/api#tag/fide)
and is used wherever it covers our needs, since ratings.fide.com throttles
aggressively. Lichess has no per-tournament or per-game data, so results
still come from ratings.fide.com's public calculation pages (no login):
  1. FIDE ID -> every (rating period, rating type) with rated games, via
     the profile's Calculations tab.
  2. Each (period, rating type) -> per-tournament score, games, rating
     change and per-opponent rounds.
"""
import re
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://ratings.fide.com"
LICHESS_FIDE_PLAYER_URL = "https://lichess.org/api/fide/player/{fide_id}"
XHR = {"X-Requested-With": "XMLHttpRequest"}

RTYPES = {"std": ("Standard", 0), "rpd": ("Rapid", 1), "blz": ("Blitz", 2)}


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


def profile_info(session, fide_id):
    """Name, FIDE title and federation from the Lichess FIDE API.

    Returns an empty name when the ID is unknown (Lichess 404) or Lichess
    is unreachable; tournament results can still be scraped either way.
    """
    info = {"name": "", "title": "", "federation": "", "fide_id": str(fide_id)}
    try:
        r = session.get(LICHESS_FIDE_PLAYER_URL.format(fide_id=fide_id), timeout=15)
        if r.status_code != 200:
            return info
        data = r.json()
    except (requests.RequestException, ValueError):
        return info
    info["name"] = data.get("name") or ""
    info["title"] = data.get("title") or ""
    info["federation"] = data.get("federation") or ""
    if data.get("year"):
        info["birth_year"] = str(data["year"])
    return info


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
