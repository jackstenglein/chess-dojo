import { Chessground } from './vendor/chessground/chessground.js';
import { Chess } from './vendor/chess.js/chess.js';
import { rankIcon, LOGO_SVG, LOGO_DATA_URI } from './icons.js';

// ---- Rules -------------------------------------------------------------
const SET_SIZE = 10;
const PASS_SCORE = 8; // first-try solves needed to clear a set
const starsFor = (score) => (score >= 10 ? 3 : score >= 9 ? 2 : score >= PASS_SCORE ? 1 : 0);
const xpForPuzzle = (rating) => 10 + Math.floor(rating / 100);
const SET_CLEAR_XP = 50;
const PERFECT_XP = 100;
const levelFromXp = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;
const xpForLevel = (lvl) => (lvl - 1) ** 2 * 100;

// ---- Storage (per-viewer, best effort) ---------------------------------
const STORE_KEY = 'tacticsLadder.v1';
// Inside chessdojo.club (/tactics-forger) the app runs in a frame and saves to the player's Dojo
// account through the page around it; on its own it only uses this browser's storage.
if (new URLSearchParams(location.search).has('embed')) document.documentElement.classList.add('embed'); // for scripts/host-test.html
const HOSTED = window.parent !== window && document.documentElement.classList.contains('embed');
const cloud = { ready: false, version: 0, username: null, cohort: null, timer: 0, saving: false, again: false };
// Offline play (see the Offline section).
const UNSYNCED_KEY = 'tacticsLadder.unsynced';
const offline = {
  sw: false,
  online: navigator.onLine,
  ready: false, // every file in offlineUrls() is cached
  dl: null, // { done, total } while downloading
  failed: false,
  unsynced: (() => { try { return !!localStorage.getItem(UNSYNCED_KEY); } catch { return false; } })(),
  open: false,
};
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { xp: 0, themes: {}, streak: 0, lastDay: null, solved: 0 };
}
function saveProgress() {
  progress.savedAt = Date.now();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(progress));
  } catch {}
  if (HOSTED) markUnsynced(true);
  if (cloud.ready) cloudSaveSoon();
}
let progress = loadProgress();
// Your place on a ladder is always the lowest set you haven't cleared yet.
const lowestUncleared = (tp, total) => {
  let f = 0;
  while (f < total && tp.stars[f] > 0) f++;
  return f;
};
// Every stage is open to everyone. Your place (tp.at) is the last set you played; the next set is the
// first uncleared one from there, wrapping back to the lowest uncleared set once the top is done.
// Failing a set you haven't cleared (under PASS_SCORE) starts a 24-hour wait: you can still play
// it as practice, but it can't be cleared until the wait is over. tp.failed[set] = when it failed.
const CLEAR_WAIT_MS = 24 * 3600e3;
const waitLeft = (tp, flat) => (!tp || tp.stars?.[flat] > 0 ? 0 : Math.max(0, (tp.failed?.[flat] ?? 0) + CLEAR_WAIT_MS - Date.now()));
const fmtWait = (ms) => {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};
const nextSet = (tp, total) => {
  if (!tp) return 0;
  let f = Math.max(0, Math.min(tp.at ?? tp.frontier ?? 0, total));
  while (f < total && (tp.stars[f] > 0 || waitLeft(tp, f) > 0)) f++; // skip sets you're waiting on
  return f < total ? f : lowestUncleared(tp, total);
};
const nextFlat = (tp, total) => Math.min(nextSet(tp, total), total - 1);
const themeProgress = (key) =>
  (store()[key] ??= { frontier: 0, stars: {}, start: 0 });

// ---- Per-puzzle records -------------------------------------------------------
// Every puzzle you've played: id -> { k: theme key ('op:'/'eg:' prefix for openings/endgames), r: rating,
//   n: times played, ok: first-try solves, best: fastest first-try solve (ms), last: epoch ms,
//   rev: 1 while it's in your review queue (missed first try, not yet solved first try since) }.
// "Puzzles solved" counts unique puzzles, so a puzzle solved in Practice and again in its
// ladder set only counts once.
progress.puzzles ??= {};
let solvedMemo = { v: -1, n: {} };
let puzzlesVersion = 0;
// Unique puzzles solved: all tabs, or one track ('tactics' | 'openings' | 'endgames').
function solvedCount(tr = 'all') {
  if (solvedMemo.v !== puzzlesVersion) {
    const n = { all: 0, tactics: 0, openings: 0, endgames: 0 };
    for (const r of Object.values(progress.puzzles)) {
      if (!(r.ok > 0)) continue;
      n.all++;
      n[splitKey(r.k)[0]]++;
    }
    solvedMemo = { v: puzzlesVersion, n };
  }
  return solvedMemo.n[tr] ?? 0;
}
const puzzleRec = (id) => progress.puzzles[id];
const isSolved = (id) => (progress.puzzles[id]?.ok ?? 0) > 0;
const reviewIds = () => Object.entries(progress.puzzles).filter(([, r]) => r.rev).sort((a, b) => (a[1].last ?? 0) - (b[1].last ?? 0)).map(([id]) => id);
// Returns what changed so the play screen can celebrate it.
function recordPuzzle(p, sk, firstTryOk, ms) {
  const rec = (progress.puzzles[p.id] ??= { k: sk, r: p.rating, n: 0, ok: 0, best: null, rev: 0 });
  const wasSolved = rec.ok > 0;
  rec.n++;
  rec.last = Date.now();
  let newBest = false;
  if (firstTryOk) {
    rec.ok++;
    if (rec.best == null || ms < rec.best) {
      newBest = rec.best != null;
      rec.best = ms;
    }
    rec.rev = 0;
  } else rec.rev = 1;
  puzzlesVersion++;
  return { firstSolve: firstTryOk && !wasSolved, newBest, rec };
}
// One-time: build records from the sessions you've already played.
function backfillPuzzles() {
  if (progress.puzzlesBuilt) return;
  for (const s of progress.sessions) {
    for (const [k, r, ok, ms, id, d] of s.attempts) {
      if (!id) continue;
      const rec = (progress.puzzles[id] ??= { k, r, n: 0, ok: 0, best: null, rev: 0 });
      rec.n++;
      rec.last = d?.at ?? s.end;
      const t = d?.total ?? ms;
      if (ok) {
        rec.ok++;
        if (rec.best == null || t < rec.best) rec.best = t;
        rec.rev = 0;
      } else rec.rev = 1;
    }
  }
  progress.puzzlesBuilt = true;
  puzzlesVersion++;
}

// ---- Sessions -------------------------------------------------------------
// A session is a run of activity; 30+ minutes idle starts a new one.
const SESSION_GAP = 30 * 60 * 1000;
progress.sessions ??= [];
function currentSession(create = true) {
  const last = progress.sessions.at(-1);
  if (last && Date.now() - last.end < SESSION_GAP) return last;
  if (!create) return null;
  const s = { id: Date.now(), start: Date.now(), end: Date.now(), xp: 0, attempts: [], sets: [] };
  progress.sessions.push(s);
  return s;
}
// attempt: [themeKey, rating, firstTryOk 0/1, ms, puzzleId]
// attempt detail (index 5): { run, moves: [[uci, thinkMs, correct 0/1], ...], first: ms to first move,
//   total: ms from your first turn to the end, solved: finished the line, sol: viewed solution, at: epoch ms }
function recordAttempt(theme, rating, ok, ms, id, detail = null) {
  const s = currentSession();
  s.attempts.push([theme, rating, ok ? 1 : 0, Math.round(ms), id, detail]);
  s.end = Date.now();
  saveProgress();
}
// set timing (index 5): { run, start, end, ms: wall-clock duration, puzzleMs: [per puzzle total ms] }
function recordSet(theme, flat, min, score, stars, xp, timing = null) {
  const s = currentSession();
  s.sets.push([theme, flat, min, score, stars, timing]);
  s.xp += xp;
  s.end = Date.now();
  saveProgress();
}
function addSessionXp(xp) {
  const s = currentSession();
  s.xp += xp;
}
function sessionSummary(s) {
  const a = s.attempts;
  const ok = a.filter((x) => x[2]).length;
  const themes = {};
  for (const [k, r, good, ms] of a) {
    const t = (themes[k] ??= { n: 0, ok: 0, ms: 0, rating: 0 });
    t.n++; t.ok += good; t.ms += ms; t.rating += r;
  }
  const moveTimes = a.flatMap((x) => (x[5]?.moves || []).map((m) => m[1]));
  const firstMoves = a.map((x) => x[5]?.first).filter((v) => v != null);
  return {
    moveN: moveTimes.length,
    avgMoveMs: moveTimes.length ? sum(moveTimes) / moveTimes.length : 0,
    avgFirstMs: firstMoves.length ? sum(firstMoves) / firstMoves.length : 0,
    n: a.length, ok, acc: a.length ? ok / a.length : 0,
    avgMs: a.length ? sum(a.map((x) => x[3])) / a.length : 0,
    avgRating: a.length ? Math.round(sum(a.map((x) => x[1])) / a.length) : 0,
    duration: s.end - s.start,
    themes,
    setsPlayed: s.sets.length,
    setsCleared: s.sets.filter((x) => x[4] > 0).length,
    perfect: s.sets.filter((x) => x[4] === 3).length,
  };
}

// ---- Board look (ChessDojo board assets) --------------------------------------------
// Where board backgrounds, pieces and sounds live: ./assets locally, or the site's own
// /static/board when served from chessdojo.club (set by <meta name="asset-base"> in index.html).
const ASSETS = document.querySelector('meta[name="asset-base"]')?.content || 'assets';
const BOARDS = {
  standard: ['Standard', 'standard.png', '#7296ac', '#fff'],
  ocean: ['Ocean', 'ocean.png', '#5477ca', '#bbcfff'],
  cherry: ['Cherry Blossom', 'cherry-blossom.png', '#f37a7a', '#f1f1c9'],
  moon: ['Moon', 'moon.jpg', '#424242', '#e0e0e0'],
  summer: ['Summer', 'summer.png', '#59935d', '#f1f6b2'],
  walnut: ['Walnut', 'walnut.jpg', '#9f6853', '#e0c498'],
  wood: ['Wood', 'wood.jpg', '#88471d', '#d9a55a'],
};
const PIECES = {
  standard: ['Standard', 'standard', '.webp'],
  cburnett: ['Cburnett', 'cburnett', '.svg'],
  chessnut: ['Chessnut', 'chessnut', '.svg'],
  threed: ['3D', 'three-d-basic', '.png'],
};
progress.settings ??= { board: 'standard', pieces: 'standard', sound: true };
function applyBoardLook(node) {
  const [, bg, light, dark] = BOARDS[progress.settings.board] ?? BOARDS.standard;
  const [, dir, ext] = PIECES[progress.settings.pieces] ?? PIECES.standard;
  node.style.setProperty('--board-background', `url('${ASSETS}/backgrounds/${bg}')`);
  node.style.setProperty('--light-square-coord-color', light);
  node.style.setProperty('--dark-square-coord-color', dark);
  const names = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };
  for (const [c, color] of [['w', 'white'], ['b', 'black']]) {
    for (const [p, name] of Object.entries(names)) {
      node.style.setProperty(`--${color}-${name}`, `url('${ASSETS}/pieces/${dir}/${c}${p}${ext}')`);
    }
  }
}
// Sounds are short effects played through Web Audio, which mixes with music from other apps
// instead of pausing it (an <audio> element counts as media playback, so phones pause Spotify for
// it). Safari/iOS also gets audioSession 'ambient' for the same reason. Files are fetched whole,
// so the offline cache can serve them.
try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch {}
let audioCtx = null;
const sounds = {};
const loadSound = (name) =>
  (sounds[name] ??= fetch(`${ASSETS}/sounds/${name}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
    .catch(() => { delete sounds[name]; return null; }));
function playSound(name) {
  if (!progress.settings.sound) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { return; }
  loadSound(name).then(async (data) => {
    if (!data) return;
    const cache = (playSound.decoded ??= {});
    try {
      cache[name] ??= await audioCtx.decodeAudioData(data.slice(0));
      const src = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.6;
      src.buffer = cache[name];
      src.connect(gain).connect(audioCtx.destination);
      src.start();
    } catch {}
  });
}
const fmtDur = (ms) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtSec = (ms) => `${(ms / 1000).toFixed(1)}s`;
const fmtClock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`;

// ---- Data ---------------------------------------------------------------
// Three tracks share the same ladder mechanics: Tactics (by theme), Openings (by opening) and Endgames.
const TRACKS = {
  tactics: { dir: 'data', store: 'themes', prefix: '', label: 'Tactics', nounPl: 'themes' },
  openings: { dir: 'data/openings', store: 'openings', prefix: '/o', label: 'Openings', nounPl: 'openings', kp: 'op:' },
  endgames: { dir: 'data/endgames', store: 'endgames', prefix: '/e', label: 'Endgames', nounPl: 'endgames', kp: 'eg:' },
};
// Session/puzzle keys carry the track as a prefix ('op:', 'eg:'); tactics keys have none.
function splitKey(k) {
  for (const [tr, t] of Object.entries(TRACKS)) if (t.kp && k.startsWith(t.kp)) return [tr, k.slice(t.kp.length)];
  return ['tactics', k];
}
let track = 'tactics';
const indexes = {};
let index = null;
const T = () => TRACKS[track];
const hrefHome = (tr = track) => (TRACKS[tr].prefix ? `#${TRACKS[tr].prefix}` : '#');
const hrefTheme = (k, tr = track) => `#${TRACKS[tr].prefix}/theme/${k}`;
const hrefPlay = (k, f, tr = track) => `#${TRACKS[tr].prefix}/play/${k}/${f}`;
const store = (tr = track) => (progress[TRACKS[tr].store] ??= {});
const sessionKey = (k, tr = track) => (TRACKS[tr].kp || '') + k;
// Full theme lists per track. For Openings, indexes.openings is narrowed to your specialty
// (one White opening, one defence vs 1.e4, one vs 1.d4); catalogs.openings has every option.
const catalogs = {};
const catalog = (tr) => catalogs[tr] ?? indexes[tr];
function specialtyKeys() {
  const cat = catalogs.openings;
  const sp = progress.specialty || {};
  if (!cat) return [];
  return cat.slots.map((s) => sp[s.key]).filter((k) => cat.themes.some((t) => t.key === k));
}
const specialtyDone = () => catalogs.openings && specialtyKeys().length === catalogs.openings.slots.length;
function refreshSpecialty() {
  const cat = catalogs.openings;
  if (!cat) return;
  indexes.openings = { ...cat, themes: specialtyKeys().map((k) => cat.themes.find((t) => t.key === k)) };
}
function setTrack(tr) {
  track = tr;
  if (tr === 'openings') refreshSpecialty();
  index = indexes[tr];
  STAGES = tr === 'tactics' ? TACTIC_STAGES : groupStages(tr);
}
const themeCache = new Map();
async function loadTheme(key, tr = track) {
  const ck = `${tr}:${key}`;
  if (!themeCache.has(ck)) {
    const data = await fetch(`${TRACKS[tr].dir}/${key}.json`).then((r) => r.json());
    const sets = [];
    data.bands.forEach((band, bi) => {
      for (let i = 0; i < band.puzzles.length; i += SET_SIZE) {
        sets.push({
          band: bi,
          min: band.min,
          max: band.max,
          n: i / SET_SIZE,
          puzzles: band.puzzles.slice(i, i + SET_SIZE).map(([id, fen, moves, rating]) => ({
            id, fen, moves: moves.split(' '), rating,
          })),
        });
      }
    });
    themeCache.set(ck, { ...data, sets });
  }
  return themeCache.get(ck);
}

// ---- Helpers --------------------------------------------------------------
const $app = document.getElementById('app');
const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const today = () => new Date().toISOString().slice(0, 10);
// Ranks: [rating needed, icon key (icons.js), name, description, Tactics puzzles solved].
// Tactics, Openings and Endgames each have their own rank on this same ladder: a rank needs BOTH
// that tab's rating and a number of that tab's puzzles solved (first try). The counts are fixed,
// so you can reach any rank from wherever you start; Openings and Endgames are smaller tabs and
// need RANK_SCALE of the Tactics count (Wizard: Tactics 10,000, Endgames 6,000).
const RANKS = [
  [0, 'grasshopper', 'Grasshopper', 'Starting out', 0],
  [800, 'jester', 'Jester', 'Knows some tricks', 500],
  [1000, 'apprentice', 'Apprentice', 'Learning the craft', 1000],
  [1200, 'squire', 'Squire', 'Getting better', 2000],
  [1400, 'ninja', 'Ninja', 'Strikes from the shadows', 3000],
  [1600, 'warrior', 'Warrior', 'Battle-tested', 5000],
  [1800, 'beast', 'Beast', 'Ready to pounce', 7500],
  [2000, 'wizard', 'Wizard', 'Tactical master', 10000],
];
const tabPuzzles = (tr) => sum((indexes[tr]?.themes || []).map((t) => t.puzzles));
const RANK_SCALE = { tactics: 1, openings: 0.6, endgames: 0.6 };

// ---- Starting point ---------------------------------------------------------------
// Each tab asks where you want to start: 400, 1000 or 1500 (the Basic, Intermediate and Advanced
// Tactics tiers). On chessdojo.club it suggests one from your cohort, on the low side: under
// 1000 -> 400, 1000-1500 -> 1000, 1500+ -> 1500. Picking one moves your place there (every stage
// stays open) and, while your rating is still provisional, starts the rating there too.
// progress.start[tab] = { rating: the point you picked, seed: the rating it started from }.
const START_POINTS = [400, 1000, 1500];
const startOpen = {}; // tabs where "change starting point" is open
function cohortStart(cohort) {
  const n = parseInt(String(cohort ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(n)) return null;
  return n < 1000 ? 400 : n < 1500 ? 1000 : 1500;
}
const needsStart = (tr) => !progress.start?.[tr] && trackRating(tr).games === 0;
const startName = (tr, r) => (tr === 'tactics' ? TACTIC_STAGES[START_POINTS.indexOf(r)].name : `From ${r}`);
function startCard(tr) {
  const asked = needsStart(tr);
  if (!asked && !startOpen[tr]) return '';
  const sug = cohortStart(cloud.cohort);
  const cur = progress.start?.[tr]?.rating;
  const sub = (r) => tr === 'tactics' ? `Puzzles from ${r}` : r === 400 ? 'The whole ladder' : `Skip the stages below ${r}`;
  return `<section class="start-card">
    <h2>${asked ? 'Where do you want to start?' : 'Change your starting point'}</h2>
    <p>${sug ? `Suggested for your cohort (${esc(cloud.cohort)}): <b>${startName(tr, sug)}</b>. ` : ''}Every stage stays open, so you can always go back to the easier ones.</p>
    <div class="start-opts">${START_POINTS.map((r) => `<button type="button" class="start-opt ${r === sug ? 'sug' : ''} ${r === cur ? 'cur' : ''}" data-start-pick="${tr}:${r}">
      <b>${startName(tr, r)}</b><small>${sub(r)}</small>${r === sug ? '<em>Suggested</em>' : r === cur ? '<em>Current</em>' : ''}</button>`).join('')}</div>
    ${asked ? '' : `<button type="button" class="btn small ghost" data-start-cancel="${tr}">Cancel</button>`}
  </section>`;
}
const startLink = (tr) => (needsStart(tr) || startOpen[tr] ? '' :
  `<button type="button" class="start-link" data-start-open="${tr}">Starting point: <b>${startName(tr, progress.start?.[tr]?.rating ?? 400)}</b> · change</button>`);
function applyStart(tr, rating) {
  progress.start ??= {};
  const prev = progress.start[tr];
  const r = trackRating(tr);
  // The rating only restarts while it's still provisional; after that, only your place moves.
  progress.start[tr] = { rating, seed: r.provisional ? rating : (prev?.seed ?? RATING.r0) };
  if (tr !== 'tactics') {
    for (const meta of catalog(tr)?.themes ?? []) {
      let flat = 0;
      for (const [min, n] of meta.bandSets) if (min < rating) flat += n;
      if (flat >= meta.sets) continue;
      const tp = (store(tr)[meta.key] ??= { frontier: 0, stars: {}, start: 0 });
      tp.at = flat;
    }
  }
  ringView[tr] = undefined;
  startOpen[tr] = false;
  engineCache = { n: -1 };
  saveProgress();
  renderStats();
  route();
}
document.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-start-pick]');
  const open = e.target.closest('[data-start-open]');
  const cancel = e.target.closest('[data-start-cancel]');
  if (pick) {
    const [tr, r] = pick.dataset.startPick.split(':');
    applyStart(tr, Number(r));
  } else if (open || cancel) {
    startOpen[(open || cancel).dataset[open ? 'startOpen' : 'startCancel']] = !!open;
    route();
  }
});
// Puzzles a rank needs in a tab, rounded to 2 significant figures.
function rankNeed(rank, tr = track) {
  const x = rank[4] * (RANK_SCALE[tr] ?? 1);
  if (!x) return 0;
  const m = 10 ** Math.max(0, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / m) * m;
}
// Rating-only lookup (used for labelling rating levels, e.g. ladder milestones).
const rankFor = (rating) => [...RANKS].reverse().find(([r]) => rating >= r);
// Rank credit: every puzzle you've solved (first try) in a tab counts toward each rank, and harder
// puzzles count extra: 4x when the puzzle is rated 400+ above the rank's rating, 2x when 200+
// above. So a strong player solving puzzles at their level moves through the lower ranks quickly,
// while easy puzzles (Basic Tactics for them) count the normal 1x.
const creditWeight = (puzzleRating, rank) => (puzzleRating - rank[0] >= 400 ? 4 : puzzleRating - rank[0] >= 200 ? 2 : 1);
let creditMemo = { v: -1 };
function rankCredit(rank, tr = track) {
  if (creditMemo.v !== puzzlesVersion) {
    const ratings = { tactics: [], openings: [], endgames: [] };
    for (const p of Object.values(progress.puzzles)) if (p.ok > 0) ratings[splitKey(p.k)[0]]?.push(p.r ?? 0);
    creditMemo = { v: puzzlesVersion, by: {} };
    for (const [t, rs] of Object.entries(ratings)) {
      creditMemo.by[t] = RANKS.map((rk) => sum(rs.map((x) => creditWeight(x, rk))));
    }
  }
  return creditMemo.by[tr]?.[RANKS.indexOf(rank)] ?? 0;
}
// Your actual rank in a tab: the highest one whose rating AND puzzle requirements you meet.
const userRankFor = (rating, tr = track) => [...RANKS].reverse().find((rk) => rating >= rk[0] && rankCredit(rk, tr) >= rankNeed(rk, tr));
const userRank = (tr = track) => userRankFor(trackRating(tr).rating, tr);
// Rating, rank and games per track, taken before a run so the result screen can show what changed.
const ratingSnap = () => Object.fromEntries(Object.keys(TRACKS).map((tr) => {
  const r = trackRating(tr);
  return [tr, { rating: r.rating, games: r.games, rank: userRank(tr) }];
}));
// Rating change lines (and rank-ups) for every track the run touched.
function ratingChanges(before) {
  let html = '';
  for (const tr of Object.keys(TRACKS)) {
    const b = before[tr];
    const r = trackRating(tr);
    if (!b || r.games === b.games) continue;
    const d = r.rating - b.rating;
    html += `<div class="rating-change">${TRACKS[tr].label} rating <b>${r.rating}</b> <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</span></div>`;
    const rk = userRank(tr);
    if (RANKS.indexOf(rk) > RANKS.indexOf(b.rank)) {
      toast(`New ${TRACKS[tr].label} rank: ${rk[2]}!`);
      html += `<div class="rankup inline-rank">${rankIcon(rk[1], 28)} New ${TRACKS[tr].label} rank: <b>${rk[2]}</b> — ${rk[3].toLowerCase()}</div>`;
    }
  }
  return html;
}
// ---- Ratings ----------------------------------------------------------------------
// Tactics, Openings and Endgames each have their own rating, from the puzzles played in that tab
// (Custom and Review count toward the puzzle's own tab). It's a slow Elo: every puzzle is a
// game against the puzzle's rating (first-try solve = win, anything else = loss) with a tiny
// K-factor, so it climbs about 1 point per 10 puzzles — rating and rank are earned by volume,
// in step with the rank's puzzle minimums. Recomputed from your saved sessions (no extra storage).
//
// Balance: gains shrink in a bucket you've played much more than the others, so grinding one theme
// gets harder and harder. The buckets are the themes of your current Tactics tier (Basic below
// 1000, Intermediate to 1500, Advanced above), the Endgames ladders, and your Openings repertoire.
// Up to BALANCE.buffer puzzles over your fair share (total / buckets) count fully; past that a win
// is worth (fair share + buffer) / puzzles played in that bucket. Losses are never scaled.
//
// Provisional: your first PROVISIONAL.games puzzles in a tab move the rating fast (K from
// PROVISIONAL.k0 down to the normal K) so it finds your level quickly, then it settles into the
// slow climb. The rating starts at the starting point you picked for that tab (400 if none),
// and shows with a "?" until it's settled.
const RATING = { r0: 400, k: 0.2 };
const PROVISIONAL = { games: 30, k0: 40 };
const kFor = (games) => (games >= PROVISIONAL.games ? RATING.k
  : RATING.k + (PROVISIONAL.k0 - RATING.k) * (1 - games / PROVISIONAL.games));
const ratingStart = (tr) => progress.start?.[tr]?.seed ?? RATING.r0;
const BALANCE = { buffer: 10 };
const eloExpected = (r, puzzleRating) => 1 / (1 + 10 ** ((puzzleRating - r) / 400));
function tacticTiers() {
  const keys = new Set(indexes.tactics?.themes.map((t) => t.key) ?? []);
  const tiers = TACTIC_STAGES.map((st) => stageGroups(st).flatMap(([, ks]) => ks).filter((k) => keys.has(k)));
  const placed = new Set(tiers.flat());
  tiers.at(-1).push(...[...keys].filter((k) => !placed.has(k)));
  return tiers;
}
function balanceBuckets(tr, r) {
  if (tr === 'tactics') return tacticTiers()[r < 1000 ? 0 : r < 1500 ? 1 : 2];
  if (tr === 'endgames') return catalog('endgames')?.themes.map((t) => t.key) ?? [];
  if (tr === 'openings') return specialtyKeys();
  return [];
}
// How much of a win counts in this bucket right now (1 = full speed).
function balanceFactor(tr, key, counts, r) {
  const act = balanceBuckets(tr, r);
  if (act.length < 2) return 1;
  const set = act.includes(key) ? act : [...act, key];
  const fair = sum(set.map((k) => counts[k] || 0)) / set.length;
  const n = counts[key] || 0;
  return n <= fair + BALANCE.buffer ? 1 : (fair + BALANCE.buffer) / n;
}
// Replays every puzzle in order. Returns per-track { r, games, counts } and, per attempt
// (in session order), [track, rating before, rating after, balance factor].
let engineCache = { n: -1 };
function ratingEngine() {
  const all = progress.sessions.flatMap((s) => s.attempts);
  const spec = JSON.stringify([progress.specialty || {}, progress.start || {}]);
  if (engineCache.n === all.length && engineCache.spec === spec) return engineCache.value;
  const state = Object.fromEntries(Object.keys(TRACKS).map((tr) => [tr, { r: ratingStart(tr), games: 0, counts: {} }]));
  const per = [];
  for (const a of all) {
    const [tr, key] = splitKey(a[0]);
    const st = state[tr];
    const before = st.r;
    const score = a[2] ? 1 : 0;
    let delta = kFor(st.games) * (score - eloExpected(st.r, a[1]));
    const f = delta > 0 && st.games >= PROVISIONAL.games ? balanceFactor(tr, key, st.counts, st.r) : 1;
    delta *= f;
    st.r += delta;
    st.games++;
    st.counts[key] = (st.counts[key] || 0) + 1;
    per.push([tr, before, st.r, f]);
  }
  engineCache = { n: all.length, spec, value: { state, per } };
  return engineCache.value;
}
function trackRating(tr = track) {
  const st = ratingEngine().state[tr];
  return { rating: Math.round(st.r), exact: st.r, games: st.games, provisional: st.games < PROVISIONAL.games };
}
// "1430?" while the rating is still provisional.
const ratingText = (tr = track) => {
  const r = trackRating(tr);
  return `${r.rating}${r.provisional ? '?' : ''}`;
};
// Where your rating grows at full speed right now, and where it's slowed by over-playing.
function balanceStatus(tr) {
  const st = ratingEngine().state[tr];
  const act = balanceBuckets(tr, st.r);
  return act.map((k) => ({ key: k, n: st.counts[k] || 0, f: balanceFactor(tr, k, st.counts, st.r) }));
}
// How close you are to the next rank on each requirement.
function rankProgress(rating, tr = track) {
  const rank = userRankFor(rating, tr);
  const next = RANKS[RANKS.indexOf(rank) + 1] ?? null;
  if (!next) return { rank, next, frac: 1, ratingFrac: 1, solvedFrac: 1, toGo: 0, solvedToGo: 0 };
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const rFloor = Math.max(rank[0], RATING.r0);
  const ratingFrac = clamp((rating - rFloor) / (next[0] - rFloor));
  const want = rankNeed(next, tr);
  const solved = rankCredit(next, tr); // credit toward the next rank
  const solvedFrac = clamp(solved / want);
  return {
    rank, next, ratingFrac, solvedFrac, frac: Math.min(ratingFrac, solvedFrac),
    toGo: Math.max(0, next[0] - rating), solvedToGo: Math.max(0, want - solved), solvedNeed: want, credit: solved,
  };
}
const reqBar = (label, have, need, frac, done) => `<div class="req ${done ? 'met' : ''}">
  <div class="req-top"><span>${label}</span><span>${done ? '✓ ' : ''}<b>${have.toLocaleString()}</b> / ${need.toLocaleString()}</span></div>
  <div class="rr-bar"><div style="width:${frac > 0 ? Math.max(1.5, frac * 100) : 0}%"></div></div></div>`;
function rankRoad(trk = track) {
  const tr = trackRating(trk);
  const solved = solvedCount(trk);
  const L = TRACKS[trk].label;
  const rp = rankProgress(tr.rating, trk);
  const ri = RANKS.indexOf(rp.rank);
  return `<div class="rank-road">
    <div class="rr-head">
      <span class="rank-icon">${rankIcon(rp.rank[1], 64)}</span>
      <div class="rr-title"><small>Your ${L} rank</small><b>${rp.rank[2]}</b><em>${rp.rank[3]}</em></div>
      <div class="rr-rating" title="${L} rating from every ${L.toLowerCase()} puzzle you've played, in any mode. ${tr.provisional ? `It's provisional (?) for your first ${PROVISIONAL.games} puzzles and moves fast to find your level; after that it` : 'It'} climbs slowly, about 1 point per 10 puzzles solved.">
        <small>${L} rating</small><b>${tr.rating}${tr.provisional ? '<i class="prov">?</i>' : ''}</b><span>${tr.provisional ? `provisional · ${tr.games}/${PROVISIONAL.games} puzzles` : `${tr.games.toLocaleString()} puzzles played`}</span></div>
      <div class="rr-next">${rp.next
        ? `Next: <b class="inline-rank">${rankIcon(rp.next[1], 22)} ${rp.next[2]}</b><small>${[rp.toGo ? `${rp.toGo} rating points` : '', rp.solvedToGo ? `${rp.solvedToGo.toLocaleString()} more puzzle points` : ''].filter(Boolean).join(' and ')} to go</small>`
        : '<b>Top rank reached</b>'}</div>
    </div>
    ${rp.next ? `<div class="reqs">
      ${reqBar(`${L} rating → ${rp.next[0]}`, tr.rating, rp.next[0], rp.ratingFrac, tr.rating >= rp.next[0])}
      <div title="Each ${L.toLowerCase()} puzzle you solve on the first try is 1 point, 2 points if it's rated ${rp.next[0] + 200}+ and 4 points if it's rated ${rp.next[0] + 400}+.">${reqBar(`Puzzle points → ${rp.solvedNeed.toLocaleString()} <small class="req-hint">(${rp.next[0] + 200}+ puzzles ×2, ${rp.next[0] + 400}+ ×4)</small>`, rp.credit, rp.solvedNeed, rp.solvedFrac, rp.credit >= rp.solvedNeed)}</div>
    </div>` : ''}
    <div class="rr-steps">${RANKS.map((rk, i) => [...rk.slice(0, 4), rankNeed(rk, trk)]).map(([r, ic, nm, desc, need], i) => `<div class="rr-step ${i < ri ? 'done' : i === ri ? 'cur' : i === ri + 1 ? 'next' : ''}" title="${nm}: ${desc}">
      <span>${rankIcon(ic, 40)}</span><small>${nm}</small><i>${desc}</i><em>${Math.max(r, RATING.r0)}+${need ? ` · ${need.toLocaleString()} pts` : ''}</em></div>`).join('')}</div>
    ${balanceLine(trk)}
  </div>`;
}
// "⚖️ Balance: 7 of 9 themes at full speed · slowed: Fork 40%, Pin 75%" under the rank.
function balanceLine(trk) {
  const bs = balanceStatus(trk);
  if (bs.length < 2) return '';
  const name = (k) => catalog(trk)?.themes.find((t) => t.key === k)?.name ?? k;
  const slow = bs.filter((b) => b.f < 1).sort((a, b) => a.f - b.f);
  const full = bs.filter((b) => b.f >= 1);
  const noun = trk === 'tactics' ? 'themes' : trk === 'openings' ? 'openings' : 'ladders';
  const tier = trk === 'tactics' ? ` in ${TACTIC_STAGES[trackRating('tactics').rating < 1000 ? 0 : trackRating('tactics').rating < 1500 ? 1 : 2].name}` : '';
  const least = full.sort((a, b) => a.n - b.n).slice(0, 3).map((b) => esc(name(b.key)));
  return `<div class="balance-line" title="Your rating grows fastest when you spread your puzzles across all the ${noun}. Up to ${BALANCE.buffer} puzzles over your fair share count fully; past that, wins in that one count for less and less.">
    <span class="bl-icon">⚖️</span>
    <span><b>Balance:</b> ${full.length} of ${bs.length} ${noun}${tier} at full rating speed${slow.length
      ? ` · slowed: ${slow.slice(0, 4).map((b) => `<span class="bl-slow">${esc(name(b.key))} ${Math.round(b.f * 100)}%</span>`).join(', ')}${slow.length > 4 ? ` +${slow.length - 4} more` : ''}. Try ${least.join(', ')} to climb faster.`
      : '. Keep spreading your puzzles across them to climb at full speed.'}</span>
  </div>`;
}
// One decimal under 10% so a single cleared set never shows as 0%.
const pct = (a, b) => {
  if (!a || !b) return 0;
  const v = (a / b) * 100;
  return v < 10 ? Math.max(0.1, Math.round(v * 10) / 10) : Math.round(v);
};
const sum = (a) => a.reduce((x, y) => x + y, 0);
// Learning path: themes in the order they should be learned.
const TACTIC_STAGES = [
  {
    name: 'Basic Tactics', icon: '🌱',
    blurb: 'The core tactics every player needs.',
    tactics: ['hangingPiece', 'fork', 'pin', 'skewer', 'discoveredAttack', 'attackingF2F7'],
    mates: ['mateIn1', 'backRankMate', 'smotheredMate'],
  },
  {
    name: 'Intermediate Tactics', icon: '⚔️',
    blurb: 'Combining ideas — remove defenders, lure pieces, attack the king.',
    tactics: ['trappedPiece', 'promotion', 'doubleCheck', 'capturingDefender', 'deflection', 'attraction', 'sacrifice', 'exposedKing', 'kingsideAttack', 'advancedPawn', 'enPassant'],
    mates: ['mateIn2', 'anastasiaMate', 'arabianMate', 'hookMate', 'operaMate', 'cornerMate', 'killBoxMate', 'triangleMate'],
  },
  {
    name: 'Advanced Tactics', icon: '🧠',
    blurb: 'Subtle and deep — quiet moves, in-between moves, line clearance and long mates.',
    tactics: ['clearance', 'interference', 'intermezzo', 'xRayAttack', 'quietMove', 'defensiveMove', 'zugzwang', 'queensideAttack', 'underPromotion', 'castling'],
    mates: ['mateIn3', 'mateIn4', 'bodenMate', 'doubleBishopMate', 'dovetailMate', 'vukovicMate', 'pillsburysMate', 'balestraMate', 'blindSwineMate', 'epauletteMate', 'morphysMate', 'swallowstailMate'],
  },
];
let STAGES = TACTIC_STAGES;
const GROUP_ICONS = { material: '♜', skills: '♚' };
function groupStages(tr) {
  if (tr === 'openings') {
    return [{
      name: 'Your Specialty', icon: '🎯',
      blurb: 'Tactics from real games in the openings you play.',
      groups: [['Your openings', index.themes.map((t) => t.key)]],
    }];
  }
  return (index.groups || []).map((g) => ({
    name: g.name, icon: GROUP_ICONS[g.key] || '♟', blurb: `${g.sub.replace(/\.$/, '')}.`,
    groups: [[TRACKS[tr].label, index.themes.filter((t) => t.group === g.key).map((t) => t.key)]],
  }));
}
const shortName = (t) => t.name;
const stageGroups = (st) => st.groups ?? [['Tactics', st.tactics], ['Checkmate patterns', st.mates]];

// ---- Rings ------------------------------------------------------------------------
// Each stage is a ring; each theme is a segment that fills as you clear its sets.
const STAGE_COLORS = ['#3fbf6b', '#5aa9e6', '#c58af9', '#e8875b'];
function stageKeys(si) {
  const st = STAGES[si];
  const keys = stageGroups(st).flatMap(([, ks]) => ks);
  if (si === STAGES.length - 1) {
    const placed = new Set(STAGES.flatMap((x) => stageGroups(x).flatMap(([, ks]) => ks)));
    keys.push(...index.themes.filter((t) => !placed.has(t.key)).map((t) => t.key));
  }
  return keys.filter((k) => index.themes.some((t) => t.key === k));
}
const themeMeta = (k) => index.themes.find((t) => t.key === k);
function clearedCount(key) {
  const tp = store()[key];
  return tp ? Object.values(tp.stars).filter((x) => x > 0).length : 0;
}
function stageProgress(si) {
  const keys = stageKeys(si);
  const sets = sum(keys.map((k) => themeMeta(k).sets));
  const cleared = sum(keys.map(clearedCount));
  const done = keys.filter((k) => clearedCount(k) >= themeMeta(k).sets).length;
  return { keys, sets, cleared, frac: sets ? cleared / sets : 0, themesDone: done };
}
const stageOf = (key) => STAGES.findIndex((_, si) => stageKeys(si).includes(key));
const activeStage = () => {
  // Tactics: the ring for the tier you chose to start in, unless it's done.
  const from = track === 'tactics' ? Math.max(0, START_POINTS.indexOf(progress.start?.tactics?.rating ?? 400)) : 0;
  let i = STAGES.findIndex((_, si) => si >= from && stageProgress(si).frac < 1);
  if (i < 0) i = STAGES.findIndex((_, si) => stageProgress(si).frac < 1);
  return i < 0 ? STAGES.length - 1 : i;
};
// Ring percentages are tiny early on, so show more precision when small.
const ringPct = (f) => {
  const v = f * 100;
  return v === 0 ? '0' : v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString();
};
const polar = (c, r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
};
function arcD(c, r, a0, a1) {
  const [x0, y0] = polar(c, r, a0);
  const [x1, y1] = polar(c, r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const visFrac = (f) => (f > 0 ? Math.max(f, 0.035) : 0); // keep a sliver visible once started
/**
 * stages: stage indexes, innermost first. before: {themeKey: fraction} to start from
 * (for the fill-up animation); highlight: theme key to mark.
 */
function ringsSvg({ stages, size = 300, stroke = 20, gap = 8, highlight = null, before = null, links = true, dim = [], labels = false, pad = 3, mode = 'progress' }) {
  const sg = mode === 'strengths' ? strengths() : null;
  const c = size / 2;
  const rOuter = c - stroke / 2 - pad;
  let out = `<svg class="rings" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Progress rings">`;
  stages.forEach((si, k) => {
    const r = rOuter - (stages.length - 1 - k) * (stroke + gap);
    const keys = stageKeys(si);
    const color = STAGE_COLORS[si];
    const span = 360 / keys.length;
    const gapDeg = Math.min(span * 0.3, (stroke * 0.35 * 180) / (Math.PI * r));
    out += `<g class="ring ring-${si + 1} ${dim.includes(si) ? 'dim' : ''}">`;
    keys.forEach((key, j) => {
      const t = themeMeta(key);
      const a0 = j * span + gapDeg / 2;
      const a1 = (j + 1) * span - gapDeg / 2;
      const len = (r * (a1 - a0) * Math.PI) / 180;
      const cl = clearedCount(key);
      const st = sg?.[key];
      // Strengths: a scored slice is filled in its score's colour; no score yet = empty track.
      const frac = sg ? (st?.score != null ? 1 : 0) : cl / t.sets;
      const col = sg ? (st?.score != null ? strengthColor(st.score) : '#5a6272') : color;
      const start = before && key in before ? before[key] : frac;
      const d = arcD(c, r, a0, a1);
      const seg = `<path class="track" d="${d}" stroke="${col}" stroke-width="${stroke}"/>
        <path class="fill ${frac >= 1 ? 'full' : ''}" d="${d}" stroke="${col}" stroke-width="${stroke}"
          data-len="${len.toFixed(2)}" data-frac="${visFrac(frac)}" stroke-dasharray="${(len * visFrac(start)).toFixed(2)} ${(len + 2).toFixed(2)}"/>
        ${key === highlight ? `<path class="hl" d="${d}" stroke-width="${stroke + 6}"/>` : ''}
        <title>${esc(t.name)} — ${sg ? (st?.score != null ? `${st.label} (${st.score}) · ${Math.round(st.acc * 100)}% first try · ${fmtSec(st.med)} median` : `not enough puzzles yet (${st?.n ?? 0}/${STRENGTH.min})`) : `${cl}/${t.sets} sets (${ringPct(frac)}%)`}</title>`;
      let label = '';
      if (labels) {
        const mid = (a0 + a1) / 2;
        const [lx, ly] = polar(c, r + stroke / 2 + 10, mid);
        const anchor = mid < 4 || mid > 356 || (mid > 176 && mid < 184) ? 'middle' : mid < 180 ? 'start' : 'end';
        const base = mid > 100 && mid < 260 ? 'hanging' : mid < 80 || mid > 280 ? 'auto' : 'middle';
        const sn = shortName(t);
        const nm = sn.length > 17 ? `${sn.slice(0, 16)}…` : sn;
        label = `<text class="seg-label ${sg ? '' : frac >= 1 ? 'done' : cl ? 'started' : ''}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="${base}">${esc(nm)}</text>`;
      }
      const attrs = `data-key="${key}" data-name="${esc(shortName(t))}" data-cl="${cl}" data-sets="${t.sets}"`;
      // Clicking a slice starts that theme's next set (its ladder once complete).
      const go = hrefTheme(key); // a slice opens that theme's ladder
      out += links ? `<a href="${go}" class="seg-link" ${attrs}>${seg}${label}</a>` : `<g ${attrs}>${seg}${label}</g>`;
    });
    out += '</g>';
  });
  return out + '</svg>';
}
// Animate fills from their starting value to their real value.
function animateRings(root) {
  requestAnimationFrame(() => setTimeout(() => {
    root.querySelectorAll('path.fill').forEach((p) => {
      const len = Number(p.dataset.len);
      p.setAttribute('stroke-dasharray', `${(len * Number(p.dataset.frac)).toFixed(2)} ${(len + 2).toFixed(2)}`);
    });
  }, 250));
}

function bandOfFlat(theme, flat) {
  let acc = 0;
  for (const [min, n] of theme.bandSets) {
    if (flat < acc + n) return { min, max: min + index.bandSize, n: flat - acc, count: n };
    acc += n;
  }
  const [min, n] = theme.bandSets.at(-1);
  return { min, max: min + index.bandSize, n: n - 1, count: n, done: true };
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2600);
}

function confetti() {
  const colors = ['#f5a524', '#3fbf6b', '#5aa9e6', '#e5534b', '#c58af9'];
  const box = el('<div class="confetti"></div>');
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(p);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3600);
}

// Today's puzzles (every attempt, any tab or mode) and time spent, for the header.
function todayTotals() {
  const key = ymd(new Date());
  let n = 0, ok = 0, ms = 0;
  for (const s of progress.sessions) {
    if (s.end && ymd(new Date(s.end)) < key) continue; // whole session before today
    for (const a of s.attempts) {
      if (ymd(new Date(a[5]?.at ?? s.start)) !== key) continue;
      n++; ok += a[2] ? 1 : 0; ms += a[5]?.total ?? a[3];
    }
  }
  return { n, ok, ms };
}
const fmtShortDur = (ms) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
function todayChip() {
  const t = todayTotals();
  return `<a class="stat today-stat" href="#/stats" title="Today: ${t.n} puzzles${t.n ? ` (${Math.round((t.ok / t.n) * 100)}% first try)` : ''}, ${fmtDur(t.ms)} spent solving. Click for daily, weekly, monthly and yearly totals.">
    <span class="rs-txt"><small>Today</small><b>${t.n} <i>puzzles</i> · ${fmtShortDur(t.ms)}</b></span></a>`;
}
// The Today box beside every page: puzzles, time, accuracy, new solves, sets and rating moves.
function renderToday() {
  const box = document.getElementById('todayBox');
  if (!box) return;
  const key = ymd(new Date());
  const { attempts, sets } = statsModel();
  const today = attempts.filter((a) => ymd(new Date(a.t)) === key);
  const setsToday = sets.filter((x) => ymd(new Date(x.t)) === key);
  const n = today.length;
  const ok = today.filter((a) => a.ok).length;
  const ms = sum(today.map((a) => a.ms));
  const fresh = today.filter((a) => a.firstSolve).length;
  const cleared = setsToday.filter((x) => x.stars > 0).length;
  const acc = n ? ok / n : 0;
  const byTab = Object.keys(TRACKS).map((tr) => {
    const a = today.filter((x) => x.tr === tr);
    if (!a.length) return '';
    const d = Math.round(a.at(-1).after) - Math.round(a[0].solver);
    return `<li><span>${TRACKS[tr].label}</span><b>${a.length}</b><em class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}</em></li>`;
  }).join('');
  box.innerHTML = `<div class="tp-card">
    <div class="tp-head"><b>Today</b><span>${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
    <div class="tp-big"><b>${n}</b><span>puzzle${n === 1 ? '' : 's'}<br><em>⏱ ${fmtDur(ms)}</em></span></div>
    <div class="tp-acc"><div class="tp-acc-top"><span>First try</span><b>${n ? `${Math.round(acc * 100)}%` : '–'}</b></div>
      <div class="rr-bar small"><div style="width:${acc * 100}%"></div></div></div>
    <div class="tp-grid">
      <div><b>${fresh}</b><small>new solves</small></div>
      <div><b>${cleared}<i>/${setsToday.length}</i></b><small>sets cleared</small></div>
    </div>
    ${byTab ? `<ul class="tp-tabs">${byTab}</ul>` : '<p class="tp-empty">Nothing yet today. Solve a set to get going!</p>'}
    <a class="tp-link" href="#/stats">All stats →</a>
  </div>`;
}
function renderStats() {
  renderToday();
  const rb = document.getElementById('reviewBadge');
  if (rb) {
    const n = reviewIds().length;
    rb.hidden = !n;
    rb.textContent = n > 999 ? '999+' : n;
  }
  const lvl = levelFromXp(progress.xp);
  const cur = progress.xp - xpForLevel(lvl);
  const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
  const statsHtml = `
    ${Object.entries(TRACKS).filter(([tr]) => indexes[tr]).map(([tr, t]) => `<a class="stat rank-stat ${tr === track ? 'cur' : ''}" href="${hrefHome(tr)}" title="${t.label}: ${userRank(tr)[2]} · rating ${ratingText(tr)}${trackRating(tr).provisional ? ' (provisional)' : ''} · ${solvedCount(tr).toLocaleString()} solved">${rankIcon(userRank(tr)[1], 22)}<span class="rs-txt"><small>${t.label}</small><b>${ratingText(tr)}</b></span></a>`).join('')}
    ${todayChip()}
    ${offlineChip()}
    <div class="stat" title="Day streak">🔥 <b>${progress.streak || 0}</b></div>
    <div class="stat" title="Puzzles solved">✓ <b>${solvedCount().toLocaleString()}</b></div>
    <div class="level" title="${progress.xp.toLocaleString()} XP">
      <span>Lv ${lvl}</span>
      <div class="xpbar"><div style="width:${Math.round((cur / need) * 100)}%"></div></div>
    </div>`;
  // Same stats in the top bar (narrow screens) and at the top of the right column (wide screens).
  document.getElementById('stats').innerHTML = statsHtml;
  const side = document.getElementById('sideStats');
  // Own SVG ids for the side copy: the top-bar copy is display:none on wide screens, and icons that
  // point at gradients inside a hidden element render blank.
  if (side) side.innerHTML = statsHtml.replace(/(["#(])(bg|clip)-/g, '$1s$2-');
}

// ---- Router ----------------------------------------------------------------
function route() {
  let h = location.hash.replace(/^#\/?/, '');
  let tr = 'tactics';
  for (const [t, def] of Object.entries(TRACKS)) {
    const p = def.prefix.slice(1);
    if (p && (h === p || h.startsWith(`${p}/`))) {
      tr = t;
      h = h.slice(p.length + 1);
    }
  }
  const [view, key, flat] = h.split('/');
  cleanupBoard();
  if (view === 'standing') return (location.hash = '#/leaderboard'); // old name
  if (view === 'practice') return (location.hash = '#/custom'); // old name
  const nav = ['sessions', 'leaderboard', 'custom', 'review', 'stats'].includes(view) ? view : tr;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  if (view === 'sessions') return showSessions();
  if (view === 'leaderboard') return showStanding();
  if (view === 'stats') return showStats();
  if (view === 'custom') return showPractice();
  if (view === 'review') return showReview();
  if (!indexes[tr]) tr = 'tactics';
  setTrack(tr);
  renderStats(); // header highlights this tab's rank
  if (tr === 'openings') {
    // You start with just a White opening; Black ladders ask for your Black pick first.
    if (view === 'choose') return showSpecialtyPicker(key ? { slot: key } : {});
    if (!progress.specialty?.white && view !== 'theme' && view !== 'play') return showSpecialtyPicker();
    const m = (view === 'theme' || view === 'play') && key && catalog('openings').themes.find((t) => t.key === key);
    if (m && m.slot !== 'white' && !progress.specialty?.[m.slot]) return showSpecialtyPicker({ slot: m.slot, want: key, then: location.hash });
  }
  if (view === 'theme' && key) return showLadder(key);
  if (view === 'play' && key) return showPlay(key, Number(flat));
  return showHome();
}
// A new page starts at the top (e.g. the board, after picking a set far down a ladder).
window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  route();
});
document.getElementById('homeBtn').onclick = () => (location.hash = '');

// ---- Home -----------------------------------------------------------------------
const ringView = {}; // which ring each tab is showing
const ringMode = {}; // 'progress' (default) or 'strengths', per tab

// ---- Strengths ----------------------------------------------------------------------
// How strong you are in each theme, from your last STRENGTH.recent puzzles in it (any mode):
//  - accuracy: first-try solves compared with what's expected at those puzzles' ratings for your
//    rating at the time (so harder themes aren't marked weak just for being harder);
//  - speed: your median solve time in the theme compared with your median across the whole tab
//    (twice as fast scores full marks, twice as slow scores zero).
// Score = 70% accuracy + 30% speed, 0-100. Strong is 60+, weak is under 40. Themes with fewer than
// STRENGTH.min puzzles have no score yet.
const STRENGTH = { recent: 60, min: 30, acc: 0.7 };
let strengthMemo = { n: -1 };
function strengths(tr = track) {
  const { attempts } = statsModel();
  if (strengthMemo.n !== attempts.length) strengthMemo = { n: attempts.length, by: {} };
  if (strengthMemo.by[tr]) return strengthMemo.by[tr];
  const mine = attempts.filter((a) => a.tr === tr);
  const median = (xs) => {
    if (!xs.length) return 0;
    const v = [...xs].sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const allMed = median(mine.filter((a) => a.ok && a.ms > 0).map((a) => a.ms));
  const byKey = {};
  for (const a of mine) (byKey[a.key] ??= []).push(a);
  const out = {};
  for (const [key, list] of Object.entries(byKey)) {
    const recent = list.slice(-STRENGTH.recent);
    if (recent.length < STRENGTH.min) { out[key] = { n: recent.length }; continue; }
    const acc = recent.filter((a) => a.ok).length / recent.length;
    const expected = sum(recent.map((a) => eloExpected(a.solver, a.rating))) / recent.length;
    const accScore = Math.min(1, Math.max(0, 0.5 + (acc - expected)));
    const med = median(recent.filter((a) => a.ok && a.ms > 0).map((a) => a.ms));
    const speedScore = med && allMed ? Math.min(1, Math.max(0, 0.5 + 0.5 * Math.log2(allMed / med))) : 0.5;
    const score = Math.round(100 * (STRENGTH.acc * accScore + (1 - STRENGTH.acc) * speedScore));
    out[key] = { n: recent.length, acc, med, score, label: score >= 60 ? 'Strong' : score < 40 ? 'Weak' : 'OK' };
  }
  strengthMemo.by[tr] = out;
  return out;
}
// Red (weak) -> amber -> green (strong).
const strengthColor = (score) => `hsl(${Math.round(Math.min(100, Math.max(0, score)) * 1.2)} 62% 52%)`;
function showHome() {
  if (track === 'openings') return showOpeningsHome();
  const totals = index.themes.map((t) => {
    const tp = store()[t.key];
    return {
      sets: t.sets,
      cleared: tp ? Object.values(tp.stars).filter((s) => s > 0).length : 0,
      stars: tp ? sum(Object.values(tp.stars)) : 0,
      started: !!tp,
      rating: tp ? bandOfFlat(t, nextFlat(tp, t.sets)).min : 0,
    };
  });
  const allSets = sum(totals.map((t) => t.sets));
  const allCleared = sum(totals.map((t) => t.cleared));
  const allStars = sum(totals.map((t) => t.stars));
  const started = totals.filter((t) => t.started);
  const lvl = levelFromXp(progress.xp);

  const HERO = {
    tactics: ['', ''], // the app name lives in the left column
    endgames: ['', ''],
  };
  const page = el(`<div class="home">
    <section class="hero">
      ${HERO[track][0] ? `<div class="hero-text">
        <h1>${HERO[track][0]}</h1>
        ${track === 'tactics' ? '' : `<p>${HERO[track][1]}
        Get <b>${PASS_SCORE}/${SET_SIZE}</b> on the first try to clear a set and unlock the next one.</p>`}
      </div>` : ''}
      ${startCard(track)}
      ${rankRoad()}
      ${startLink(track)}
      <div class="ring-hero"></div>
      <div class="dash">
        <div class="dash-tile"><small>Level</small><b>${lvl}</b><span>${progress.xp.toLocaleString()} XP</span></div>
        <div class="dash-tile"><small>Sets cleared</small><b>${allCleared.toLocaleString()}</b><span>of ${allSets.toLocaleString()}</span></div>
        <div class="dash-tile"><small>Stars</small><b>★ ${allStars.toLocaleString()}</b><span>of ${(allSets * 3).toLocaleString()}</span></div>
        <div class="dash-tile"><small>${track === 'tactics' ? 'Themes' : T().label} started</small><b>${started.length}</b><span>of ${index.themes.length}</span></div>
        <div class="dash-tile"><small>${T().label} solved</small><b>${solvedCount(track).toLocaleString()}</b><span>${solvedCount().toLocaleString()} across all tabs</span></div>
        <a class="dash-tile standing-tile" href="#/leaderboard"><small>Leaderboard</small><b>–</b><span>see leaderboard →</span></a>
      </div>
    </section>
  </div>`);

  COHORT_SOURCES[COHORT_SOURCE].load().then((cohort) => {
    const st = standingFor(cohort, cohort.find((p) => p.me), METRICS[0]);
    const tile = page.querySelector('.standing-tile');
    if (!tile) return;
    tile.querySelector('b').textContent = `#${st.rank}`;
    tile.querySelector('span').textContent = st.others
      ? `top ${Math.max(0.1, (1 - st.pctAhead) * 100).toFixed(1)}% of ${st.n.toLocaleString()} · see leaderboard →`
      : 'of 1 Dojoer · see leaderboard →';
  });
  // One ring at a time, with a switcher. Defaults to the ring you're working on.
  const hero = page.querySelector('.ring-hero');
  ringView[track] ??= activeStage();
  const renderRing = () => {
    const si = ringView[track];
    const sp = stageProgress(si);
    const color = STAGE_COLORS[si];
    const nextKey = sp.keys.find((k) => clearedCount(k) < themeMeta(k).sets);
    const nextT = nextKey && themeMeta(nextKey);
    const nextF = nextKey ? nextFlat(store()[nextKey], nextT.sets) : 0;
    const nextB = nextT && bandOfFlat(nextT, nextF);
    const left = sp.sets - sp.cleared;
    const strong = ringMode[track] === 'strengths';
    const sg = strengths();
    const scored = sp.keys.filter((k) => sg[k]?.score != null).sort((a, b) => sg[a].score - sg[b].score);
    const weakest = scored[0];
    const strongest = scored.at(-1);
    const centerDefault = strong
      ? scored.length
        ? `<small>Weakest</small>
          <b style="color:${strengthColor(sg[weakest].score)};font-size:26px">${esc(shortName(themeMeta(weakest)))}</b>
          <em>Strongest: ${esc(shortName(themeMeta(strongest)))}</em>`
        : `<small>Strengths</small><b style="font-size:30px">${STRENGTH.min}</b><span>puzzles per theme</span><em>to see your strengths</em>`
      : `<small>${esc(STAGES[si].name)}</small>
      <b style="color:${color}">${ringPct(sp.frac)}%</b>
      <span>${sp.cleared.toLocaleString()} / ${sp.sets.toLocaleString()} sets</span>
      <em>${(left * SET_SIZE).toLocaleString()} puzzles to go</em>`;
    const rows = sp.keys.map((k) => {
      const t = themeMeta(k);
      const cl = clearedCount(k);
      const f = cl / t.sets;
      // Tapping a category starts its next set; the ☰ button opens its full ladder.
      const flat = nextFlat(store()[k], t.sets);
      const b = bandOfFlat(t, flat);
      return `<div class="slice-row ${f >= 1 ? 'done' : cl ? 'started' : ''}" data-key="${k}">
        <a class="slice-go" href="${f >= 1 ? hrefTheme(k) : hrefPlay(k, flat)}" title="${f >= 1 ? 'Ladder complete' : `Play ${esc(shortName(t))} ${b.min}–${b.max}`}">
          <span class="slice-name">${esc(shortName(t))}</span>
          ${strong
            ? `<span class="slice-bar" style="--c:${sg[k]?.score != null ? strengthColor(sg[k].score) : '#5a6272'}"><i style="width:${sg[k]?.score ?? 0}%"></i></span>
          <span class="slice-left"><i class="sl-pill ${sg[k]?.label ? `sl-${sg[k].label.toLowerCase()}` : 'sl-none'}" title="${sg[k]?.score != null ? `${Math.round(sg[k].acc * 100)}% first try · ${fmtSec(sg[k].med)} median` : `${sg[k]?.n ?? 0} of ${STRENGTH.min} puzzles played`}">${sg[k]?.score != null ? sg[k].label : `${sg[k]?.n ?? 0}/${STRENGTH.min}`}</i></span>`
            : `<span class="slice-bar" style="--c:${color}"><i style="width:${f > 0 ? Math.max(f * 100, 1.5) : 0}%"></i></span>
          <span class="slice-left">${f >= 1 ? 'Done ✓' : `${b.min}–${b.max}`}</span>`}
          <span class="slice-play" aria-hidden="true">${f >= 1 ? '' : '▶'}</span>
        </a>
        <a class="slice-ladder" href="${hrefTheme(k)}" title="${esc(shortName(t))} ladder: ${t.bands} stages, ${t.sets} sets" aria-label="${esc(shortName(t))} ladder">☰</a>
      </div>`;
    }).join('');
    hero.innerHTML = `
      <div class="ring-mode seg-tabs small" role="tablist" aria-label="Ring shows">
        <button type="button" data-mode="progress" class="${strong ? '' : 'on'}">Progress</button>
        <button type="button" data-mode="strengths" class="${strong ? 'on' : ''}">Strengths</button>
      </div>
      <div class="ring-tabs" role="tablist">
        ${STAGES.map((st, i) => {
          const p2 = stageProgress(i);
          return `<button class="ring-tab ${i === si ? 'active' : ''}" data-si="${i}" role="tab" style="--c:${STAGE_COLORS[i]}">
            <span class="ring-tab-dot"></span>${esc(st.name)}<small>${p2.frac >= 1 ? '✓' : `${ringPct(p2.frac)}%`}</small></button>`;
        }).join('')}
      </div>
      <div class="ring-body">
        <div class="ring-wrap big">
          ${ringsSvg({ stages: [si], size: 470, stroke: 52, gap: 0, labels: true, pad: 84, mode: strong ? 'strengths' : 'progress' })}
          <div class="ring-center">${centerDefault}</div>
        </div>
        <div class="ring-legend">
          <h2>${esc(STAGES[si].name)}</h2>
          <div class="slice-list">${rows}</div>
          ${strong && weakest && sg[weakest].score < 60
            ? `<a class="btn primary next-up" href="${hrefPlay(weakest, nextFlat(store()[weakest], themeMeta(weakest).sets))}">Train your weakest: ${esc(themeMeta(weakest).name)} →</a>`
            : nextT ? `<a class="btn primary next-up" href="${hrefPlay(nextKey, nextF)}">Next up: ${esc(nextT.name)} ${nextB.min}–${nextB.max} →</a>` : ''}
        </div>
      </div>`;
    hero.querySelectorAll('.ring-tab').forEach((b) => {
      b.onclick = () => {
        ringView[track] = Number(b.dataset.si);
        renderRing();
      };
    });
    hero.querySelectorAll('[data-mode]').forEach((b) => {
      b.onclick = () => {
        ringMode[track] = b.dataset.mode;
        renderRing();
      };
    });
    // Hovering a slice (in the ring or the list) shows its details in the center.
    const center = hero.querySelector('.ring-center');
    const show = (k) => {
      const t = themeMeta(k);
      const cl = clearedCount(k);
      hero.querySelectorAll('[data-key]').forEach((n) => n.classList.toggle('hover', n.dataset.key === k));
      const st = sg[k];
      center.innerHTML = strong
        ? st?.score != null
          ? `<small>${esc(t.name)}</small>
            <b style="color:${strengthColor(st.score)}">${st.label}</b>
            <span>${Math.round(st.acc * 100)}% first try · ${fmtSec(st.med)} median</span>
            <em>score ${st.score}/100 · last ${st.n} puzzles</em>`
          : `<small>${esc(t.name)}</small><span>${st?.n ?? 0}/${STRENGTH.min} puzzles played</span><em>Play more to see your strength here</em>`
        : `<small>${esc(t.name)}</small>
        <b style="color:${color}">${ringPct(cl / t.sets)}%</b>
        <span>${cl} / ${t.sets} sets cleared</span>
        <em>${((t.sets - cl) * SET_SIZE).toLocaleString()} puzzles to go</em>`;
    };
    const reset = () => {
      hero.querySelectorAll('.hover').forEach((n) => n.classList.remove('hover'));
      center.innerHTML = centerDefault;
    };
    hero.querySelectorAll('[data-key]').forEach((n) => {
      n.addEventListener('mouseenter', () => show(n.dataset.key));
      n.addEventListener('mouseleave', reset);
      n.addEventListener('focus', () => show(n.dataset.key));
      n.addEventListener('blur', reset);
    });
    animateRings(hero);
  };
  renderRing();

  const byKey = Object.fromEntries(index.themes.map((t) => [t.key, t]));
  const placed = new Set(STAGES.flatMap((st) => stageGroups(st).flatMap(([, ks]) => ks)));
  const extra = index.themes.filter((t) => !placed.has(t.key)).map((t) => t.key);
  const solvedBy = {};
  for (const r of Object.values(progress.puzzles)) if (r.ok) solvedBy[r.k] = (solvedBy[r.k] || 0) + 1;
  const card = (t) => {
    const tp = store()[t.key];
    const frontier = tp?.frontier ?? 0;
    const done = frontier >= t.sets;
    const tot = totals[index.themes.indexOf(t)];
    const b = bandOfFlat(t, nextFlat(tp, t.sets));
    const rungNo = t.bandSets.findIndex(([m]) => m === b.min) + 1;
    const segs = Array.from({ length: b.count }, (_, i) =>
      `<span class="seg ${done || i < b.n ? 'on' : i === b.n ? 'cur' : ''}"></span>`).join('');
    return el(`<a class="card ${tp ? 'started' : ''} ${done ? 'complete' : ''}" href="${hrefTheme(t.key)}">
      <div class="card-top">
        <span class="card-name">${esc(shortName(t))}</span>
        <span class="card-stars">★ ${tot.stars}<small>/${t.sets * 3}</small></span>
      </div>
      <div class="card-rung">${done ? 'Complete! 🏆' : `${b.min}–${b.max}`}</div>
      <div class="card-sub">${done ? 'Every stage cleared' : `Stage ${rungNo} of ${t.bands} · set ${b.n + 1} of ${b.count}`}</div>
      <div class="segs" title="Sets in this stage">${segs}</div>
      <div class="card-foot">
        <div class="bar"><div style="width:${pct(tot.cleared, t.sets)}%"></div></div>
        <span>${pct(tot.cleared, t.sets)}%</span>
      </div>
      <div class="card-meta">${tot.cleared}/${t.sets} sets · ${(solvedBy[sessionKey(t.key)] || 0).toLocaleString()}/${t.puzzles.toLocaleString()} puzzles solved</div>
    </a>`);
  };
  STAGES.forEach((st, si) => {
    const groups = stageGroups(st).map(([label, ks], gi, arr) => [
      label,
      [...ks, ...(si === STAGES.length - 1 && gi === arr.length - 1 ? extra : [])].map((k) => byKey[k]).filter(Boolean),
    ]);
    const all = groups.flatMap(([, list]) => list);
    if (!all.length) return;
    const sets = sum(all.map((t) => t.sets));
    const cl = sum(all.map((t) => totals[index.themes.indexOf(t)].cleared));
    const stars = sum(all.map((t) => totals[index.themes.indexOf(t)].stars));
    const startedN = all.filter((t) => store()[t.key]).length;
    const sec = el(`<section class="stage stage-${si + 1}">
      <div class="stage-head">
        <div class="stage-badge">${st.icon}</div>
        <div class="stage-title">
          <div class="stage-kicker">${track === 'openings' ? 'Specialty' : `Tier ${si + 1}`}</div>
          <h2>${esc(st.name)}</h2>
          <p>${esc(st.blurb)}</p>
        </div>
        <div class="stage-stats">
          <div><b>${all.length}</b><small>${T().nounPl}</small></div>
          <div><b>${startedN}</b><small>started</small></div>
          <div><b>${cl}/${sets.toLocaleString()}</b><small>sets</small></div>
          <div><b>★ ${stars}</b><small>stars</small></div>
        </div>
        <div class="stage-bar"><div class="bar big"><div style="width:${pct(cl, sets)}%"></div></div><span>${ringPct(sets ? cl / sets : 0)}% complete</span></div>
      </div>
    </section>`);
    for (const [label, list] of groups) {
      if (!list.length) continue;
      const sub = el(`<div class="stage-group"><h3>${label} <span class="h2-meta">${list.length}</span></h3><div class="grid"></div></div>`);
      list.forEach((t) => sub.querySelector('.grid').append(card(t)));
      sec.append(sub);
    }
    page.append(sec);
  });
  $app.replaceChildren(page);
}

// ---- Choose your specialty (Openings) -------------------------------------------------
// Set one slot of your specialty (or all of them) and refresh everything that depends on it.
function setSpecialty(slot, key) {
  progress.specialty = { ...(progress.specialty || {}), [slot]: key };
  saveProgress();
  refreshSpecialty();
  ringView.openings = undefined;
  renderStats();
}
const openingSets = (key) => Object.values(store('openings')[key]?.stars || {}).filter((x) => x > 0).length;
// ---- Openings home: your repertoire -------------------------------------------------
// Built around your specialty: one big card per pick (board, style, ladder progress, continue),
// your Openings rank, and every other opening to try.
const openingSolved = (key) => Object.values(progress.puzzles).filter((r) => r.ok > 0 && r.k === `op:${key}`).length;
function repCard(t, slot) {
  const tp = store('openings')[t.key];
  const cleared = openingSets(t.key);
  const stars = sum(Object.values(tp?.stars || {}));
  const frontier = nextFlat(tp, t.sets);
  const done = (tp?.frontier ?? 0) >= t.sets;
  const b = bandOfFlat(t, frontier);
  const rungNo = t.bandSets.findIndex(([m]) => m === b.min) + 1;
  const solved = openingSolved(t.key);
  const p = pct(cleared, t.sets);
  const cat = catalogs.openings;
  return `<div class="rep-card" style="--c:${optColor(t)}">
    <div class="rep-slot">${SLOT_ICONS[slot.key] || '♟'} ${esc(slot.name)}</div>
    <a class="rep-board" href="${hrefTheme(t.key, 'openings')}" title="Open the ${esc(t.name)} ladder">${openingDiagram(t)}</a>
    <div class="starter-title-row"><span class="starter-emblem"><i>${STARTERS[t.key]?.emblem ?? OPT_EMBLEM[t.key] ?? '♟'}</i></span><b class="starter-name">${esc(t.opening)}</b></div>
    <div class="rep-tags">${STARTERS[t.key] ? `<em class="starter-nick">${STARTERS[t.key].nick}</em>` : `<code>${esc(t.moves)}</code>`} ${styleBadge(t.key)}</div>
    <div class="rep-stage">${done ? 'Ladder complete 🏆' : `<b>${b.min}–${b.max}</b> · stage ${rungNo} of ${t.bands} · set ${b.n + 1} of ${b.count}`}</div>
    <div class="rep-bar"><i style="width:${p > 0 ? Math.max(p, 1.5) : 0}%"></i></div>
    <div class="rep-nums"><span><b>${cleared}</b>/${t.sets} sets</span><span>★ <b>${stars}</b></span><span><b>${solved.toLocaleString()}</b>/${t.puzzles.toLocaleString()} solved</span></div>
    <div class="rep-actions">
      ${done ? '' : `<a class="btn primary" href="${hrefPlay(t.key, frontier, 'openings')}">▶ ${cleared || tp ? 'Continue' : 'Start'}</a>`}
      <a class="btn ghost" href="${hrefTheme(t.key, 'openings')}">Ladder</a>
      <label class="rep-swap" title="Swap this pick">⇄<select data-slot="${slot.key}">${cat.themes.filter((o) => o.slot === slot.key).map((o) =>
        `<option value="${o.key}" ${o.key === t.key ? 'selected' : ''}>${styleOf(o.key)?.icon ?? ''} ${esc(o.opening)}${openingSets(o.key) ? ` · ${openingSets(o.key)} sets` : ''}</option>`).join('')}</select></label>
    </div>
  </div>`;
}
function emptyRepCard(slot) {
  // Not chosen yet: neutral grey, so it doesn't look like a red or blue (style) pick.
  return `<a class="rep-card empty" href="#/o/choose/${slot.key}" style="--c:var(--muted)">
    <div class="rep-slot">${SLOT_ICONS[slot.key] || '♟'} ${esc(slot.name)}</div>
    <div class="rep-empty-icon">?</div>
    <b class="starter-name">Choose your answer to ${slot.key === 'e4' ? '1.e4' : '1.d4'}</b>
    <span class="starter-tag">Pick the opening you play as Black to unlock its puzzles.</span>
    <span class="btn primary">Choose →</span>
  </a>`;
}
function showOpeningsHome() {
  const cat = catalogs.openings;
  const sp = progress.specialty || {};
  const mine = cat.slots.map((sl) => sp[sl.key] && cat.themes.find((t) => t.key === sp[sl.key])).filter(Boolean);
  const allSets = sum(mine.map((t) => t.sets));
  const cleared = sum(mine.map((t) => openingSets(t.key)));
  const stars = sum(mine.map((t) => sum(Object.values(store('openings')[t.key]?.stars || {}))));
  const r = trackRating('openings');
  const page = el(`<div class="home openings-home">
    <section class="rep-hero">
      <div class="rep-head">
        <div><div class="rep-kicker">Your specialty</div><h1>Your repertoire ${teamStyle(mine)}</h1>
          <p>Tactics from real games in the openings you play, from your side of the board. Get <b>${PASS_SCORE}/${SET_SIZE}</b> first try to clear a set.</p></div>
        <a class="btn ghost" href="#/o/choose">⇄ Change repertoire</a>
      </div>
      <div class="rep-grid">${cat.slots.map((slot) => {
        const t = sp[slot.key] && cat.themes.find((x) => x.key === sp[slot.key]);
        return t ? repCard(t, slot) : emptyRepCard(slot);
      }).join('')}</div>
      <div class="dash rep-dash">
        <div class="dash-tile"><small>Openings rating</small><b>${ratingText('openings')}</b><span>${r.games.toLocaleString()} puzzles played</span></div>
        <div class="dash-tile"><small>Sets cleared</small><b>${cleared.toLocaleString()}</b><span>of ${allSets.toLocaleString()} in your repertoire</span></div>
        <div class="dash-tile"><small>Stars</small><b>★ ${stars.toLocaleString()}</b><span>of ${(allSets * 3).toLocaleString()}</span></div>
        <div class="dash-tile"><small>Openings solved</small><b>${solvedCount('openings').toLocaleString()}</b><span>of ${tabPuzzles('openings').toLocaleString()} in your repertoire</span></div>
      </div>
    </section>
    ${startCard('openings')}
    ${rankRoad()}
    ${startLink('openings')}
    <section class="try-others">
      <div class="try-head"><h2>🧪 Try other openings</h2>
        <p>Play any ladder without changing your repertoire. Progress is kept and counts toward your Openings rating.</p></div>
      ${cat.slots.map((slot) => {
        const opts = cat.themes.filter((t) => t.slot === slot.key && t.key !== sp[slot.key]);
        return `<div class="try-group"><h3>${SLOT_ICONS[slot.key] || ''} ${esc(slot.name)}</h3><div class="try-grid">${opts.map((t) => {
          const cl = openingSets(t.key);
          return `<a class="try-card" href="${hrefTheme(t.key, 'openings')}" style="--c:${optColor(t)}">
            ${openingDiagram(t)}
            <span class="try-name">${esc(t.opening)}</span>${styleBadge(t.key)}
            <span class="try-meta">${cl ? `${cl}/${t.sets} sets cleared` : `${t.puzzles.toLocaleString()} puzzles`}</span>
            <button type="button" class="btn ghost small" data-make-spec="${t.key}">${sp[slot.key] ? 'Swap in' : 'Make it my pick'}</button>
          </a>`;
        }).join('')}</div></div>`;
      }).join('')}
    </section>
  </div>`);
  page.querySelectorAll('.rep-swap select').forEach((sel) => {
    sel.onchange = () => {
      setSpecialty(sel.dataset.slot, sel.value);
      toast(`Repertoire updated: ${cat.themes.find((t) => t.key === sel.value).name}`);
      showOpeningsHome();
    };
  });
  page.querySelectorAll('[data-make-spec]').forEach((b) => {
    b.onclick = (e) => {
      e.preventDefault();
      const t = cat.themes.find((x) => x.key === b.dataset.makeSpec);
      setSpecialty(t.slot, t.key);
      toast(`${t.name} is now in your repertoire`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showOpeningsHome();
    };
  });
  $app.replaceChildren(page);
}
// One opening as White, one defence against 1.e4 and one against 1.d4. The Openings tab, its
// rating pool and its rank requirements all follow these. Progress in each opening is kept, so
// you can switch and come back.
// Pick your specialty like choosing a starter: red 1.e4, blue 1.d4, green 1.c4 / 1.Nf3, then your
// answers to 1.e4 (red) and 1.d4 (blue). Each pick asks "Go with it?" before it sticks.
const STARTER_COLORS = { red: '#e5484d', blue: '#3e8ef7', green: '#3fbf6b' };
const STARTERS = {
  w_e4: { color: 'red', emblem: '🔥', nick: 'The Attacker', tag: 'Open lines, fast development and sharp attacks on the king.' },
  w_d4: { color: 'blue', emblem: '🌊', nick: 'The Strategist', tag: 'Central control and steady pressure that builds until it breaks.' },
  w_flank: { color: 'green', emblem: '🌍', nick: 'The Universalist', tag: 'Flexible setups that fit any opponent and transpose into whatever suits you.' },
};
const SLOT_COLOR = { e4: 'red', d4: 'blue' };
// Every opening has a style, shown everywhere with the same color: aggressive (red), strategic
// (blue) or universal (green), so people can pick openings that fit how they like to play.
const STYLES = {
  aggressive: { label: 'Aggressive', icon: '🔥', color: 'red', blurb: 'sharp, attacking, tactical' },
  strategic: { label: 'Strategic', icon: '🌊', color: 'blue', blurb: 'solid structures and long-term plans' },
  universal: { label: 'Universal', icon: '🌍', color: 'green', blurb: 'flexible, fits any opponent' },
};
const OPENING_STYLE = {
  w_e4: 'aggressive', w_d4: 'strategic', w_flank: 'universal',
  b_e5: 'universal', b_sicilian: 'aggressive', b_french: 'strategic', b_caro: 'strategic',
  b_pirc: 'aggressive', b_alekhine: 'aggressive', b_scandi: 'universal',
  b_qgd: 'strategic', b_slav: 'strategic', b_qga: 'universal', b_kid: 'aggressive',
  b_nimzo: 'universal', b_grunfeld: 'aggressive', b_dutch: 'aggressive', b_benoni: 'aggressive',
};
const styleOf = (key) => STYLES[OPENING_STYLE[key]] ?? null;
const styleBadge = (key) => {
  const st = styleOf(key);
  return st ? `<span class="style-badge" style="--s:${STARTER_COLORS[st.color]}">${st.icon} ${st.label}</span>` : '';
};
const OPT_EMBLEM = {
  b_e5: '⚔️', b_sicilian: '🐉', b_french: '🛡️', b_caro: '🪨', b_pirc: '🦎', b_alekhine: '🐎', b_scandi: '⚡',
  b_qgd: '🏛️', b_slav: '🧱', b_qga: '🎁', b_kid: '👑', b_nimzo: '🧭', b_grunfeld: '💥', b_dutch: '🌷', b_benoni: '🌀',
};
const SLOT_ICONS = { white: '♔', e4: '♚', d4: '♛' };
const STEP_TEXT = [
  ['Choose your starter', 'Every Dojoer starts with one opening as White. Pick the one you play.'],
  ['Your answer to 1.e4', 'As Black, how do you meet 1.e4? Pick by style: aggressive, strategic or universal.'],
  ['Your answer to 1.d4', 'As Black, how do you meet 1.d4? Pick by style: aggressive, strategic or universal.'],
  ['Your repertoire', 'These three openings are your repertoire and your Openings tab. You can swap any of them later.'],
];
const optColor = (t) => STARTER_COLORS[styleOf(t.key)?.color ?? SLOT_COLOR[t.slot] ?? 'green'];
// A small static board of an opening's defining moves (e.g. 1.e4 c5), from the side you play,
// on your board and pieces, with the last move highlighted. Options with several lines
// ("1.c4 · 1.Nf3", "1.e4 d6 · 1.e4 g6") show the shared position with an arrow for each move.
const diagramCache = new Map();
const sanList = (line) => line.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/);
function openingDiagram(t) {
  const [, dir, ext] = PIECES[progress.settings.pieces] ?? PIECES.standard;
  const [, bg] = BOARDS[progress.settings.board] ?? BOARDS.standard;
  const ck = `${t.key}:${dir}:${bg}`;
  if (diagramCache.has(ck)) return diagramCache.get(ck);
  const lines = t.moves.split(' · ').map(sanList);
  const play = (sans) => {
    const c = new Chess();
    const done = [];
    for (const san of sans) { try { done.push(c.move(san)); } catch { break; } }
    return { c, done };
  };
  let chess;
  let last = null;
  let arrows = [];
  if (lines.length > 1) {
    // Shared start, then one arrow per line's final move.
    const prefix = lines[0].slice(0, -1);
    chess = play(prefix).c;
    arrows = lines.map((l) => {
      const c = new Chess(chess.fen());
      try { return c.move(l.at(-1)); } catch { return null; }
    }).filter(Boolean);
  } else {
    const r = play(lines[0]);
    chess = r.c;
    last = r.done.at(-1) ?? null;
  }
  const flip = t.side === 'black';
  const files = 'abcdefgh';
  const xy = (sq) => {
    const f = files.indexOf(sq[0]);
    const r = Number(sq[1]);
    return [(flip ? 7 - f : f) + 0.5, (flip ? r - 1 : 8 - r) + 0.5];
  };
  let cells = '';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = `${files[flip ? 7 - f : f]}${flip ? r + 1 : 8 - r}`;
      const p = chess.get(sq);
      const hl = last && (last.from === sq || last.to === sq);
      cells += `<span class="${hl ? 'hl' : ''}">${p ? `<img src="${ASSETS}/pieces/${dir}/${p.color}${p.type.toUpperCase()}${ext}" alt="">` : ''}</span>`;
    }
  }
  const svg = arrows.length ? `<svg class="mini-arrows" viewBox="0 0 8 8"><defs><marker id="ah-${t.key}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
    ${arrows.map((m) => {
      const [x1, y1] = xy(m.from);
      const [x2, y2] = xy(m.to);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ex = x2 - ((x2 - x1) / len) * 0.32;
      const ey = y2 - ((y2 - y1) / len) * 0.32;
      return `<line x1="${x1}" y1="${y1}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" marker-end="url(#ah-${t.key})"/>`;
    }).join('')}</svg>` : '';
  const label = lines.map((l) => l.join(' ')).join(' or ');
  const html = `<span class="mini-board" style="background-image:url('${ASSETS}/backgrounds/${bg}')" aria-label="${esc(label)}">${cells}${svg}</span>`;
  diagramCache.set(ck, html);
  return html;
}
// "All aggressive", "Mostly strategic" or "A bit of everything" for a set of openings.
function teamStyle(team) {
  if (team.length < 2) return '';
  const counts = {};
  for (const t of team) { const k = OPENING_STYLE[t.key]; if (k) counts[k] = (counts[k] || 0) + 1; }
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!top) return '';
  const st = STYLES[top];
  const label = n === team.length ? `All ${st.label.toLowerCase()}` : n > 1 ? `Mostly ${st.label.toLowerCase()}` : 'A bit of everything';
  return `<span class="style-badge" style="--s:${STARTER_COLORS[n > 1 ? st.color : 'green']}">${n > 1 ? st.icon : '🎨'} ${label}</span>`;
}
// opts.slot: open on one pick only (e.g. 'e4' before your first Black puzzles); opts.want: the
// opening you clicked, offered straight away; opts.then: where to go once it's picked.
function showSpecialtyPicker(opts = {}) {
  const cat = catalogs.openings;
  const slots = cat.slots.map((sl) => sl.key);
  const pick = { ...(progress.specialty || {}) };
  const firstOpen = () => { const i = slots.findIndex((k) => !pick[k]); return i < 0 ? slots.length : i; };
  const focus = slots.includes(opts.slot) ? opts.slot : null;
  let step = focus ? slots.indexOf(focus) : 0;
  let pending = focus && opts.want ? opts.want : null; // option waiting for "Go with it?"
  let starterReady = null; // a fresh White pick: offer "Start training" / "Explore the openings"
  let styleFilter = null; // highlight one style on the Black steps
  const page = el('<div class="starter-page"></div>');
  const optsFor = (slot) => cat.themes.filter((t) => t.slot === slot);
  const meta = (k) => cat.themes.find((t) => t.key === k);

  const card = (t, big) => {
    const st = STARTERS[t.key];
    const sets = openingSets(t.key);
    const whiteStyle = pick.white && OPENING_STYLE[pick.white];
    const match = !st && whiteStyle && OPENING_STYLE[t.key] === whiteStyle;
    const dim = styleFilter && !st && OPENING_STYLE[t.key] !== styleFilter;
    return `<button type="button" class="starter ${big ? 'big' : ''} ${pick[t.slot] === t.key ? 'mine' : ''} ${dim ? 'dim' : ''}" data-key="${t.key}" style="--c:${optColor(t)}">
      ${match ? `<span class="style-match" title="Same style as your White opening">★ Matches your style</span>` : ''}
      <span class="starter-diagram">${openingDiagram(t)}</span>
      <span class="starter-title-row"><span class="starter-emblem"><i>${st?.emblem ?? OPT_EMBLEM[t.key] ?? '♟'}</i></span><b class="starter-name">${esc(t.opening)}</b></span>
      ${st ? `<em class="starter-nick">${st.nick}</em>` : `<code>${esc(t.moves)}</code>`}
      ${styleBadge(t.key)}
      <span class="starter-tag">${esc(st?.tag ?? t.blurb)}</span>
      <span class="starter-foot">${t.puzzles.toLocaleString()} puzzles${sets ? ` · ${sets} sets cleared` : ''}${pick[t.slot] === t.key ? ' · current pick' : ''}</span>
    </button>`;
  };

  const render = () => {
    let [title, sub] = STEP_TEXT[step];
    if (focus && step === slots.indexOf(focus)) {
      title = `Before your Black puzzles: ${cat.slots[step].name.replace(/^Against/, 'your answer to')}`;
      sub = `Pick the opening you play as Black against ${focus === 'e4' ? '1.e4' : '1.d4'} to unlock its puzzles. You can swap it any time.`;
    }
    if (starterReady) {
      const t = meta(starterReady);
      page.innerHTML = `<div class="starter-top"><h1 class="starter-title">🎉 ${esc(t.opening)} is your starter!</h1>
          <p class="starter-sub">Jump straight into its puzzles, or look around first. You'll pick your Black openings when you get to Black puzzles.</p></div>
        <div class="starter-ready" style="--c:${optColor(t)}">${card(t, true)}
          <div class="ready-actions">
            <button type="button" class="btn primary big-go" id="startTraining">▶ Start training</button>
            <button type="button" class="btn ghost big-go" id="explore">🧭 Explore the openings</button>
          </div>
          <button type="button" class="link-btn" id="pickBlack">or choose my Black openings now</button></div>`;
      const saveWhite = () => {
        progress.specialty = { ...(progress.specialty || {}), white: t.key };
        saveProgress();
        refreshSpecialty();
        ringView.openings = undefined;
        renderStats();
      };
      page.querySelector('#startTraining').onclick = () => {
        saveWhite();
        const f = nextFlat(store('openings')[t.key], t.sets);
        location.hash = hrefPlay(t.key, f, 'openings');
      };
      page.querySelector('#explore').onclick = () => {
        saveWhite();
        if (location.hash === '#/o') route();
        else location.hash = '#/o';
      };
      page.querySelector('#pickBlack').onclick = () => { starterReady = null; step = firstOpen(); render(); };
      return;
    }
    const stepper = slots.map((k, i) => {
      const m = pick[k] && meta(pick[k]);
      return `<button type="button" class="st-dot ${i === step ? 'cur' : ''} ${m ? 'done' : ''}" data-step="${i}" style="--c:${m ? optColor(m) : 'var(--line)'}">
        <span>${m ? (STARTERS[m.key]?.emblem ?? OPT_EMBLEM[m.key] ?? '♟') : SLOT_ICONS[k]}</span><small>${m ? esc(m.opening) : esc(cat.slots[i].name)}</small></button>`;
    }).join('<i class="st-line"></i>');
    let body;
    if (step < slots.length) {
      const opts = optsFor(slots[step]);
      const ws = pick.white && styleOf(pick.white);
      const chips = step === 0 ? '' : `<div class="style-filter">
        ${ws ? `<span class="sf-hint">You open with <b>${esc(meta(pick.white).opening)}</b> ${styleBadge(pick.white)}</span>` : ''}
        <span class="sf-chips"><button type="button" data-style="" class="${!styleFilter ? 'on' : ''}">All</button>${Object.entries(STYLES).map(([k, v]) =>
          `<button type="button" data-style="${k}" class="${styleFilter === k ? 'on' : ''}" style="--s:${STARTER_COLORS[v.color]}">${v.icon} ${v.label}</button>`).join('')}</span></div>`;
      body = `${chips}<div class="starter-grid ${step === 0 ? 'trio' : ''}">${opts.map((t) => card(t, step === 0)).join('')}</div>`;
    } else {
      const team = slots.map((k) => meta(pick[k]));
      body = `<div class="starter-grid trio team">${team.map((t, i) => `<div class="team-slot"><small>${esc(cat.slots[i].name)}</small>${card(t, true)}
        <button type="button" class="btn ghost small" data-step="${i}">Change</button></div>`).join('')}</div>
        <div class="team-total">${teamStyle(team)} · ${sum(team.map((t) => t.puzzles)).toLocaleString()} puzzles in your specialty</div>
        <div class="team-actions"><button type="button" class="btn primary big-go" id="lockIn">Lock in my specialty →</button></div>`;
    }
    page.innerHTML = `
      <div class="starter-top">
        <div class="stepper">${stepper}<i class="st-line"></i><button type="button" class="st-dot ${step === slots.length ? 'cur' : ''} ${firstOpen() === slots.length ? 'done' : ''}" data-step="${slots.length}" style="--c:var(--accent)"><span>🎯</span><small>Your repertoire</small></button></div>
        <h1 class="starter-title">${title}</h1>
        <p class="starter-sub">${sub}</p>
        <button type="button" class="btn ghost small" id="dojoPick">🎲 Let the Dojo decide</button>
      </div>
      <div class="starter-body" style="--c:${step === 0 ? 'var(--accent)' : step < slots.length ? STARTER_COLORS[SLOT_COLOR[slots[step]]] : 'var(--accent)'}">${body}</div>
      ${pending ? (() => {
        const t = meta(pending);
        return `<div class="starter-confirm" style="--c:${optColor(t)}"><div class="sc-card">
          ${card(t, true)}
          <h2>Go with ${esc(t.opening)}?</h2>
          <div class="sc-actions"><button type="button" class="btn primary" id="yes">Yes, that's mine!</button>
            <button type="button" class="btn ghost" id="no">Let me look again</button></div></div></div>`;
      })() : ''}`;
    wire();
  };

  const wire = () => {
    page.querySelectorAll('[data-step]').forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.step);
        if (i === slots.length && firstOpen() < slots.length) return; // finish the picks first
        step = i; pending = null; styleFilter = null; render();
      };
    });
    page.querySelectorAll('.sf-chips button').forEach((b) => {
      b.onclick = () => { styleFilter = b.dataset.style || null; render(); };
    });
    page.querySelectorAll('.starter-body .starter').forEach((b) => {
      if (step >= slots.length) return;
      b.onclick = () => { pending = b.dataset.key; playSound('move'); render(); };
    });
    const yes = page.querySelector('#yes');
    if (yes) {
      yes.onclick = () => {
        const t = meta(pending);
        pick[t.slot] = t.key;
        pending = null;
        burst(optColor(t));
        if (focus === t.slot) {
          // Picked the one we asked for: save it and carry on to where you were going.
          progress.specialty = { ...(progress.specialty || {}), [t.slot]: t.key };
          saveProgress();
          refreshSpecialty();
          ringView.openings = undefined;
          renderStats();
          toast(`${t.name} unlocked!`);
          const dest = opts.want === t.key && opts.then ? opts.then : '#/o';
          if (location.hash === dest) route();
          else location.hash = dest;
          return;
        }
        if (t.slot === 'white' && !pick.e4 && !pick.d4) {
          starterReady = t.key; // brand new: start training now, Black picks come later
          render();
          return;
        }
        step = firstOpen(); // next empty pick, or your repertoire once all three are chosen
        styleFilter = null;
        render();
      };
      page.querySelector('#no').onclick = () => { pending = null; render(); };
      page.querySelector('.starter-confirm').onclick = (e) => { if (e.target.classList.contains('starter-confirm')) { pending = null; render(); } };
    }
    page.querySelector('#dojoPick').onclick = () => {
      let ticks = 0;
      const timer = setInterval(() => {
        for (const k of slots) { const o = optsFor(k); pick[k] = o[Math.floor(Math.random() * o.length)].key; }
        step = slots.length; pending = null; render();
        if (++ticks >= 12) { clearInterval(timer); playSound('move'); confetti(); }
      }, 90);
    };
    const lock = page.querySelector('#lockIn');
    if (lock) {
      lock.onclick = () => {
        progress.specialty = Object.fromEntries(slots.map((k) => [k, pick[k]]));
        saveProgress();
        refreshSpecialty();
        ringView.openings = undefined;
        confetti();
        toast('Specialty locked in!');
        if (location.hash === '#/o') route();
        else location.hash = '#/o';
      };
    }
  };
  // A small burst of the pick's color.
  const burst = (color) => {
    const box = el('<div class="pick-burst"></div>');
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      box.append(el(`<i style="--dx:${Math.cos(a) * (120 + Math.random() * 80)}px;--dy:${Math.sin(a) * (120 + Math.random() * 80)}px;background:${color}"></i>`));
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 900);
  };
  render();
  $app.replaceChildren(page);
}

// ---- Custom (route #/custom): random puzzles from a range you choose ----------------
// Scopes: each tactics tier, all tactics, each openings group, all openings.
function practiceScopes() {
  const out = [];
  const tac = indexes.tactics;
  const tacKeys = (si) => {
    const st = TACTIC_STAGES[si];
    const keys = stageGroups(st).flatMap(([, ks]) => ks);
    if (si === TACTIC_STAGES.length - 1) {
      const placed = new Set(TACTIC_STAGES.flatMap((x) => stageGroups(x).flatMap(([, ks]) => ks)));
      keys.push(...tac.themes.filter((t) => !placed.has(t.key)).map((t) => t.key));
    }
    return keys.filter((k) => tac.themes.some((t) => t.key === k));
  };
  const range = (tr, keys) => {
    const ms = keys.map((k) => catalog(tr).themes.find((t) => t.key === k));
    return [Math.min(...ms.map((t) => t.min)), Math.max(...ms.map((t) => t.max))];
  };
  TACTIC_STAGES.forEach((st, si) => {
    const keys = tacKeys(si);
    out.push({ id: `t${si}`, label: st.name, track: 'tactics', keys, range: range('tactics', keys) });
  });
  const allT = tac.themes.map((t) => t.key);
  out.push({ id: 'tall', label: 'All tactics', track: 'tactics', keys: allT, range: range('tactics', allT) });
  if (indexes.openings?.themes.length) {
    const keys = indexes.openings.themes.map((t) => t.key);
    out.push({ id: 'o-spec', label: 'Your specialty (openings)', track: 'openings', keys, range: range('openings', keys) });
  }
  if (catalogs.openings && specialtyDone()) {
    const all = catalogs.openings.themes.map((t) => t.key);
    out.push({ id: 'o-all', label: 'All openings', track: 'openings', keys: all, range: range('openings', all) });
  }
  for (const tr of ['endgames']) {
    if (!indexes[tr]) continue;
    const all = indexes[tr].themes.map((t) => t.key);
    if (tr === 'endgames') out.push({ id: 'eall', label: 'All endgames', track: tr, keys: all, range: range(tr, all) });
    for (const g of indexes[tr].groups) {
      const keys = indexes[tr].themes.filter((t) => t.group === g.key).map((t) => t.key);
      const label = tr === 'openings' ? `${g.name} (openings)` : g.name;
      out.push({ id: `${tr[0]}-${g.key}`, label, track: tr, keys, range: range(tr, keys) });
    }
  }
  return out;
}
async function loadPool(scope, picked = []) {
  const keys = picked.length ? picked : scope.keys;
  const themes = await Promise.all(keys.map((k) => loadTheme(k, scope.track)));
  return themes.flatMap((t) => t.sets.flatMap((st) => st.puzzles.map((p) => ({ ...p, key: t.key, track: scope.track }))));
}
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
async function showPractice() {
  const scopes = practiceScopes();
  const ps = (progress.settings.practice ??= { scope: 't0', themes: [], min: 400, max: 1000, unsolved: true });
  if (!Array.isArray(ps.themes)) ps.themes = ps.theme ? [ps.theme] : []; // older saves had one theme
  const page = el(`<div class="practice-page">
    <div class="sessions-head"><h1>Custom</h1></div>
    <p class="page-intro">Random puzzles from any range, ten at a time. Everything you solve here counts toward your
      unique puzzles solved and is marked as done in its ladder set.</p>
    <section class="panel practice-form">
      <label>Range of puzzles <select id="pScope">${scopes.map((sc) => `<option value="${sc.id}">${esc(sc.label)} · ${sc.range[0]}–${sc.range[1]}</option>`).join('')}</select></label>
      <div class="theme-pick"><span class="tp-label">Themes <small>pick one or more · none picked = all</small></span><div class="chips pick" id="pThemes"></div></div>
      <div class="rating-range">
        <label>Rating from <input id="pMin" type="number" step="50"></label>
        <label>to <input id="pMax" type="number" step="50"></label>
      </div>
      <label class="check"><input id="pUnsolved" type="checkbox"> Only puzzles I haven't solved yet</label>
      <div class="pool-count" id="pCount">Counting puzzles…</div>
      <div class="controls"><button class="btn primary" id="pStart" disabled>Start 10 random puzzles</button></div>
    </section>
  </div>`);
  $app.replaceChildren(page);
  const $scope = page.querySelector('#pScope');
  const $themes = page.querySelector('#pThemes');
  let chosen = new Set();
  const $min = page.querySelector('#pMin');
  const $max = page.querySelector('#pMax');
  const $uns = page.querySelector('#pUnsolved');
  const $count = page.querySelector('#pCount');
  const $start = page.querySelector('#pStart');
  const scopeOf = () => scopes.find((sc) => sc.id === $scope.value) ?? scopes[0];
  let pool = [];
  let filtered = [];
  let token = 0;
  const fillThemes = () => {
    const sc = scopeOf();
    $themes.innerHTML = `<button type="button" class="chip-btn ${chosen.size ? '' : 'on'}" data-k="">All ${sc.keys.length}</button>` +
      sc.keys.map((k) => `<button type="button" class="chip-btn ${chosen.has(k) ? 'on' : ''}" data-k="${k}">${esc(shortName(catalog(sc.track).themes.find((t) => t.key === k)))}</button>`).join('');
    $themes.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        if (!b.dataset.k) chosen.clear();
        else if (chosen.has(b.dataset.k)) chosen.delete(b.dataset.k);
        else chosen.add(b.dataset.k);
        fillThemes();
        reload();
      };
    });
  };
  const refilter = () => {
    const lo = Number($min.value) || 0;
    const hi = Number($max.value) || 9999;
    const inRange = pool.filter((p) => p.rating >= lo && p.rating < hi);
    filtered = $uns.checked ? inRange.filter((p) => !isSolved(p.id)) : inRange;
    const done = inRange.length - inRange.filter((p) => !isSolved(p.id)).length;
    $count.innerHTML = `<b>${inRange.length.toLocaleString()}</b> puzzles in range · <b>${done.toLocaleString()}</b> solved · <b>${(inRange.length - done).toLocaleString()}</b> to go`;
    $start.disabled = filtered.length === 0;
    $start.textContent = filtered.length ? `Start ${Math.min(SET_SIZE, filtered.length)} random puzzles` : 'Nothing left in this range';
    Object.assign(ps, { scope: $scope.value, themes: [...chosen], min: lo, max: hi, unsolved: $uns.checked });
    delete ps.theme;
    saveProgress();
  };
  const reload = async () => {
    const my = ++token;
    $count.textContent = 'Loading puzzles…';
    $start.disabled = true;
    const p2 = await loadPool(scopeOf(), [...chosen]);
    if (my !== token) return;
    pool = p2;
    refilter();
  };
  $scope.value = scopes.some((sc) => sc.id === ps.scope) ? ps.scope : scopes[0].id;
  chosen = new Set(ps.themes.filter((k) => scopeOf().keys.includes(k)));
  fillThemes();
  $min.value = ps.min;
  $max.value = ps.max;
  $uns.checked = ps.unsolved;
  $scope.onchange = () => {
    chosen = new Set();
    fillThemes();
    [$min.value, $max.value] = scopeOf().range;
    reload();
  };
  $min.oninput = $max.oninput = refilter;
  $uns.onchange = refilter;
  $start.onclick = () => startPracticeRun(scopeOf(), filtered);
  reload();
}
function startPracticeRun(scope, candidates) {
  const ps = progress.settings.practice;
  const pick = shuffle(candidates.slice()).slice(0, SET_SIZE).sort((a, b) => a.rating - b.rating);
  cleanupBoard();
  playRun({
    mode: 'practice',
    puzzles: pick,
    backHref: '#/custom',
    backLabel: 'Custom settings',
    head: `<h2>Custom</h2><div class="set-sub">${esc(scope.label)}${ps.themes.length ? ` · ${ps.themes.slice(0, 3).map((k) => esc(themeName(sessionKey(k, scope.track)))).join(', ')}${ps.themes.length > 3 ? ` +${ps.themes.length - 3} more` : ''}` : ''} · ${ps.min}–${ps.max}${ps.unsolved ? ' · unsolved only' : ''}</div>`,
    rule: 'Random puzzles. Solving one marks it done in its ladder set too.',
    finish: (sum) => runResult(sum, pick, {
      title: 'Custom run done',
      again: ['Another 10', () => startPracticeRun(scope, candidates.filter((p) => !(ps.unsolved && isSolved(p.id))))],
      back: ['Change range', () => (location.hash = '#/custom')],
    }),
  });
}
// Result panel for Practice and Review runs.
function runResult(r, puzzles, { title, again, back, extra = '' }) {
  cleanupBoard();
  const score = r.results.filter(Boolean).length;
  const changes = ratingChanges(r.snapAtStart);
  if (score === puzzles.length && puzzles.length >= 5) confetti();
  const panel = el(`<div class="result ${score >= puzzles.length * 0.8 ? 'pass' : ''}">
    <div class="result-card">
      <h1>${title}</h1>
      <div class="result-score"><b>${score}</b>/${puzzles.length}</div>
      <div class="pips big">${r.results.map((x) => `<span class="pip ${x ? 'ok' : 'bad'}"></span>`).join('')}</div>
      <div class="result-time">
        <div><b>${fmtClock(r.runMs)}</b><small>run time</small></div>
        <div><b>${fmtSec(sum(r.puzzleMs) / Math.max(1, r.puzzleMs.length))}</b><small>avg / puzzle</small></div>
        <div><b>${r.newlySolved}</b><small>new solves</small></div>
        <div><b>${r.newBests}</b><small>new bests</small></div>
      </div>
      <div class="solved-note">${solvedCount().toLocaleString()} unique puzzles solved</div>
      ${changes}
      ${extra}
      <div class="controls center"></div>
    </div>
  </div>`);
  const ctr = panel.querySelector('.controls');
  for (const [label, fn, cls] of [[...again, 'primary'], [...back, 'ghost']]) {
    const b = el(`<button class="btn ${cls}">${label}</button>`);
    b.onclick = fn;
    ctr.append(b);
  }
  $app.replaceChildren(panel);
}

// ---- Review: puzzles you missed on the first try ---------------------------------------
async function findPuzzle(id) {
  const rec = puzzleRec(id);
  if (!rec) return null;
  const [tr, key] = splitKey(rec.k);
  if (!catalog(tr)?.themes.some((t) => t.key === key)) return null; // e.g. an opening ladder that no longer exists
  const theme = await loadTheme(key, tr);
  for (const st of theme.sets) {
    const p = st.puzzles.find((x) => x.id === id);
    if (p) return { ...p, key, track: tr };
  }
  return null;
}
function showReview() {
  const ids = reviewIds();
  const page = el(`<div class="practice-page">
    <div class="sessions-head"><h1>Review</h1></div>
    <p class="page-intro">Every puzzle you didn't get right on the first try lands here. Solve it first try (here or anywhere)
      and it leaves the queue.</p>
    <section class="panel">
      ${ids.length
        ? `<div class="review-top"><div><b class="big-num">${ids.length.toLocaleString()}</b> puzzle${ids.length === 1 ? '' : 's'} to review</div>
           <button class="btn primary" id="rStart">Review ${Math.min(SET_SIZE, ids.length)} puzzles</button></div>
           <table class="theme-table review-table"><thead><tr><th>Puzzle</th><th>Theme</th><th>Rating</th><th>Tries</th><th>Last played</th></tr></thead><tbody>
           ${ids.slice(0, 100).map((id) => {
             const r = puzzleRec(id);
             return `<tr><td><a href="https://lichess.org/training/${esc(id)}" target="_blank" rel="noopener">${esc(id)}</a></td>
               <td>${esc(themeName(r.k))}</td><td>${r.r}</td><td>${r.n}</td><td>${r.last ? new Date(r.last).toLocaleDateString() : '–'}</td></tr>`;
           }).join('')}</tbody></table>
           ${ids.length > 100 ? `<p class="muted">Showing the 100 oldest of ${ids.length.toLocaleString()}.</p>` : ''}`
        : '<div class="empty-card">Nothing to review — every puzzle you’ve played was solved first try (or you’ve cleared them since). 🎉</div>'}
    </section>
  </div>`);
  $app.replaceChildren(page);
  page.querySelector('#rStart')?.addEventListener('click', () => startReviewRun());
}
async function startReviewRun() {
  const ids = reviewIds().slice(0, SET_SIZE * 3);
  const found = (await Promise.all(ids.map(findPuzzle))).filter(Boolean).slice(0, SET_SIZE);
  if (!found.length) return toast('Those puzzles are no longer in the puzzle data.');
  cleanupBoard();
  playRun({
    mode: 'review',
    puzzles: found,
    backHref: '#/review',
    backLabel: 'Review queue',
    head: `<h2>Review</h2><div class="set-sub">Puzzles you missed on the first try · oldest first</div>`,
    rule: 'Solve a puzzle first try to clear it from your review queue.',
    finish: (r) => runResult(r, found, {
      title: 'Review done',
      again: reviewIds().length ? [`Review ${Math.min(SET_SIZE, reviewIds().length)} more`, () => startReviewRun()] : ['Back to review', () => showReview()],
      back: ['Review queue', () => showReview()],
      extra: `<div class="solved-note">${r.results.filter(Boolean).length} cleared from review · ${reviewIds().length.toLocaleString()} left</div>`,
    }),
  });
}

// ---- Leaderboard (compare against other Dojoers) ------------------------------------
// Where comparison data comes from. Today it's only this device, so you're the whole cohort.
// Later: a 'dojo' source that loads ChessDojo members' stats (same profile shape) from the Dojo API.
const COHORT_SOURCES = {
  local: {
    label: 'This device',
    async load() {
      return [{ id: 'me', me: true, name: progress.settings.name || 'You', ...myProfile() }];
    },
  },
  // Everyone who has saved Tactics Forger progress on chessdojo.club. Your own row uses this
  // device's numbers (fresher than the last save) with your Dojo name and cohort.
  dojo: {
    label: 'ChessDojo members',
    async load() {
      const [me] = await COHORT_SOURCES.local.load();
      const res = await askHost('leaderboard').catch(() => null);
      if (!res?.ok) return [me];
      const rows = res.data.players;
      const mine = rows.find((p) => p.username === res.username);
      const others = rows.filter((p) => p.username !== res.username).map((p) => ({
        id: p.username, name: p.displayName, cohort: p.cohort,
        solved: p.solved, setsCleared: p.setsCleared, stars: p.stars, accuracy: p.accuracy, avgMs: p.avgMs,
        rating: p.tracks?.tactics?.rating ?? null, openingsRating: p.tracks?.openings?.rating ?? null,
        endgamesRating: p.tracks?.endgames?.rating ?? null, attempts: p.attempts, xp: p.xp,
      }));
      return [{ ...me, name: mine?.displayName || me.name, cohort: mine?.cohort }, ...others];
    },
  },
  // Preview only: 1,000 made-up Dojoers so the page can be seen with a real-sized cohort.
  demo: {
    label: 'Demo cohort (fake data)',
    async load() {
      const me = await COHORT_SOURCES.local.load();
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const fake = Array.from({ length: 1000 }, (_, i) => {
        const solved = Math.round(Math.exp(rnd() * 7)) - 1; // most have done little, a few a lot
        const acc = Math.min(0.98, 0.55 + rnd() * 0.35);
        return {
          id: `demo${i}`, name: `Demo Dojoer ${i + 1}`, solved, setsCleared: Math.round(solved / 11),
          stars: Math.round(solved / 6), accuracy: solved ? acc : null, avgMs: solved ? 4000 + rnd() * 30000 : null,
          rating: solved ? Math.round(400 + rnd() * 1500) : null,
          openingsRating: solved && rnd() < 0.6 ? Math.round(400 + rnd() * 1500) : null,
          endgamesRating: solved && rnd() < 0.5 ? Math.round(400 + rnd() * 600) : null, attempts: solved, xp: solved * 15,
        };
      });
      return [...me, ...fake];
    },
  },
};
const COHORT_SOURCE = new URLSearchParams(location.search).has('demo-cohort') ? 'demo' : HOSTED ? 'dojo' : 'local';

// Your stats in the shape every cohort member will have.
function myProfile() {
  const stores = Object.values(TRACKS).map((t) => progress[t.store] || {});
  const starVals = stores.flatMap((st) => Object.values(st).flatMap((tp) => Object.values(tp.stars)));
  const attempts = progress.sessions.flatMap((s) => s.attempts);
  const ok = attempts.filter((a) => a[2]).length;
  const n = attempts.length;
  const rt = (tr) => (trackRating(tr).games ? trackRating(tr).rating : null);
  return {
    solved: solvedCount(),
    setsCleared: starVals.filter((x) => x > 0).length,
    stars: sum(starVals),
    accuracy: n ? ok / n : null,
    avgMs: n ? sum(attempts.map((a) => a[3])) / n : null,
    rating: rt('tactics'),
    openingsRating: rt('openings'),
    endgamesRating: rt('endgames'),
    attempts: n,
    xp: progress.xp,
  };
}
const METRICS = [
  { key: 'solved', label: 'Puzzles solved', fmt: (v) => v.toLocaleString(), better: 'high' },
  { key: 'setsCleared', label: 'Sets cleared', fmt: (v) => v.toLocaleString(), better: 'high' },
  { key: 'accuracy', label: 'First-try accuracy', fmt: (v) => `${Math.round(v * 100)}%`, better: 'high' },
  { key: 'avgMs', label: 'Avg time per puzzle', fmt: (v) => fmtSec(v), better: 'low' },
  { key: 'rating', label: 'Tactics rating', fmt: (v) => v, better: 'high' },
  { key: 'openingsRating', label: 'Openings rating', fmt: (v) => v, better: 'high' },
  { key: 'endgamesRating', label: 'Endgames rating', fmt: (v) => v, better: 'high' },
];
// Rank and percentile for one metric. Ties share the better rank.
function standingFor(cohort, me, m) {
  const val = me[m.key];
  const vals = cohort.map((p) => p[m.key]).filter((v) => v != null);
  if (val == null) return { val: null, n: vals.length };
  const better = (a, b) => (m.better === 'high' ? a > b : a < b);
  const rank = 1 + vals.filter((v) => better(v, val)).length;
  const others = vals.length - 1;
  const behind = vals.filter((v) => better(val, v)).length; // Dojoers you're ahead of
  return { val, rank, n: vals.length, others, behind, pctAhead: others > 0 ? behind / others : null };
}
function topLabel(st) {
  if (st.val == null) return 'Not enough data yet';
  if (!st.others) return `#1 of 1 · only you so far`;
  const top = Math.max(0.1, (1 - st.pctAhead) * 100);
  return `#${st.rank} of ${st.n.toLocaleString()} · top ${top < 1 ? top.toFixed(1) : Math.round(top)}%`;
}
const standingView = { cohortOnly: false };
async function showStanding() {
  const src = COHORT_SOURCES[COHORT_SOURCE];
  const everyone = await src.load();
  const meAll = everyone.find((p) => p.me);
  const cohortOnly = standingView.cohortOnly && !!meAll.cohort;
  const cohort = cohortOnly ? everyone.filter((p) => p.me || p.cohort === meAll.cohort) : everyone;
  const me = cohort.find((p) => p.me);
  const others = cohort.length - 1;
  const main = standingFor(cohort, me, METRICS[0]);
  const page = el(`<div class="standing-page">
    <div class="sessions-head"><h1>Leaderboard</h1>
      <span class="source-chip" title="Where the comparison data comes from">Compared against: <b>${esc(src.label)}</b> · ${cohort.length.toLocaleString()} Dojoer${cohort.length === 1 ? '' : 's'}</span>
      ${meAll.cohort ? `<div class="seg-tabs" id="cohortTabs"><button type="button" data-c="0" class="${cohortOnly ? '' : 'on'}">All Dojoers</button><button type="button" data-c="1" class="${cohortOnly ? 'on' : ''}">My cohort (${esc(meAll.cohort)})</button></div>` : ''}</div>
    <section class="standing-hero">
      <div class="sh-rank"><small>Puzzles solved</small><b>#${main.rank}</b><span>of ${main.n.toLocaleString()} Dojoer${main.n === 1 ? '' : 's'}</span></div>
      <div class="sh-text">
        ${others
          ? `<h2>You've solved more puzzles than <b>${Math.round(main.pctAhead * 100)}%</b> of Dojoers</h2>
             <p>${topLabel(main)} — ahead of ${main.behind.toLocaleString()} of ${others.toLocaleString()} others.</p>`
          : HOSTED
            ? `<h2>You're out in front — no other Dojoer${cohortOnly ? ' in your cohort' : ''} has saved Tactics Forger progress yet.</h2>
               <p>As more Dojoers train here, this page shows your rank and percentile (like “top 0.1%”) using the same stats below.</p>`
            : `<h2>You're out in front — so far you're the only Dojoer here.</h2>
             <p>Right now this compares you against the data on this device, which is just you. Open the Tactics Forger on
             chessdojo.club to save your progress to your account and compare against other Dojoers.</p>`}
        <div class="sh-bar"><div style="width:${others ? Math.max(2, main.pctAhead * 100) : 100}%"></div></div>
        <div class="sh-axis"><span>Fewest puzzles</span><span>Most puzzles</span></div>
      </div>
    </section>
    <section class="metric-grid"></section>
    <section class="panel"><h2>Top Dojoers <span class="h2-meta">by puzzles solved</span></h2>
      <table class="theme-table lb"><thead><tr><th>#</th><th>Dojoer</th><th>Solved</th><th>Sets</th><th>Accuracy</th><th>Avg time</th><th>Tactics</th><th>Openings</th><th>Endgames</th></tr></thead><tbody></tbody></table>
      ${HOSTED ? '' : `<label class="name-edit">Your display name <input id="dname" maxlength="24" placeholder="You" value="${esc(progress.settings.name || '')}"></label>`}
    </section>
  </div>`);
  const grid = page.querySelector('.metric-grid');
  for (const m of METRICS) {
    const st = standingFor(cohort, me, m);
    grid.append(el(`<div class="metric-card">
      <small>${m.label}</small>
      <b>${st.val == null ? '–' : m.fmt(st.val)}</b>
      <div class="mc-bar"><div style="width:${st.val == null ? 0 : st.others ? Math.max(2, st.pctAhead * 100) : 100}%"></div></div>
      <span>${topLabel(st)}</span>
      ${m.note ? `<em>${m.note}</em>` : ''}
    </div>`));
  }
  const tb = page.querySelector('.lb tbody');
  const ranked = cohort.slice().sort((a, b) => b.solved - a.solved);
  const myIdx = ranked.findIndex((p) => p.me);
  // Top 10, plus your row if you're further down.
  ranked.forEach((p, i) => {
    if (i >= 10 && !p.me) return;
    if (i === myIdx && i > 10) tb.append(el('<tr class="gap"><td colspan="9">⋯</td></tr>'));
    tb.append(el(`<tr class="${p.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.name)}${p.me ? ' <span class="you">you</span>' : ''}</td>
      <td>${p.solved.toLocaleString()}</td><td>${p.setsCleared.toLocaleString()}</td>
      <td>${p.accuracy == null ? '–' : `${Math.round(p.accuracy * 100)}%`}</td>
      <td>${p.avgMs == null ? '–' : fmtSec(p.avgMs)}</td><td>${p.rating ?? '–'}</td><td>${p.openingsRating ?? '–'}</td><td>${p.endgamesRating ?? '–'}</td></tr>`));
  });
  const dn = page.querySelector('#dname');
  if (dn) {
    dn.onchange = () => {
      progress.settings.name = dn.value.trim();
      saveProgress();
      showStanding();
    };
  }
  page.querySelectorAll('#cohortTabs button').forEach((b) => {
    b.onclick = () => { standingView.cohortOnly = b.dataset.c === '1'; showStanding(); };
  });
  $app.replaceChildren(page);
}

// ---- Stats page -----------------------------------------------------------------
// Everything here is derived from your saved sessions, so the daily / weekly / monthly / yearly
// totals are always complete. Ratings are replayed puzzle by puzzle (per tab) to know what your
// rating was when you played each set.
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const PERIODS = {
  day: { label: 'Daily', key: (t) => ymd(new Date(t)), fmt: (k) => new Date(`${k}T12:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
  week: {
    label: 'Weekly',
    key: (t) => { const d = new Date(t); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }, // Monday
    fmt: (k) => `Week of ${new Date(`${k}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
  },
  month: { label: 'Monthly', key: (t) => ymd(new Date(t)).slice(0, 7), fmt: (k) => new Date(`${k}-01T12:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
  year: { label: 'Yearly', key: (t) => String(new Date(t).getFullYear()), fmt: (k) => k },
};
let statsMemo = { n: -1 };
function statsModel() {
  const n = `${sum(progress.sessions.map((s) => s.attempts.length + s.sets.length))}:${JSON.stringify(progress.specialty || {})}`;
  if (statsMemo.n === n) return statsMemo.value;
  const per = ratingEngine().per;
  let ai = 0;
  const attempts = [];
  const runInfo = {}; // run id -> { solver: rating at its first puzzle, ms: summed puzzle time }
  const solvedIds = new Set();
  for (const s of progress.sessions) {
    for (const a of s.attempts) {
      const [k, rating, ok, ms, id, d] = a;
      const [tr, key] = splitKey(k);
      const [, before, after] = per[ai++];
      const solver = Math.round(before);
      const firstSolve = !!ok && !solvedIds.has(id);
      if (ok) solvedIds.add(id);
      const rec = { t: d?.at ?? s.start, tr, key, sk: k, rating, ok: !!ok, ms: d?.total ?? ms, id, solver, after: Math.round(after), firstSolve };
      attempts.push(rec);
      if (d?.run) {
        const ri = (runInfo[d.run] ??= { solver, ms: 0 });
        ri.ms += rec.ms;
      }
    }
  }
  const sets = progress.sessions.flatMap((s) => s.sets.map(([k, flat, min, score, stars, tm]) => {
    const [tr, key] = splitKey(k);
    const ri = tm?.run ? runInfo[tm.run] : null;
    return { t: tm?.start ?? s.start, tr, key, sk: k, flat, min, score, stars, ms: tm?.ms ?? ri?.ms ?? 0, solver: ri?.solver ?? null };
  }));
  const value = { attempts, sets };
  statsMemo = { n, value };
  return value;
}
// Totals per period, newest first. `tr` = 'all' or one track.
function periodTotals(period, tr) {
  const { attempts, sets } = statsModel();
  const P = PERIODS[period];
  const rows = new Map();
  const row = (k) => {
    if (!rows.has(k)) rows.set(k, { k, n: 0, ok: 0, ms: 0, ratingSum: 0, newSolves: 0, setsPlayed: 0, setsCleared: 0, perfect: 0, start: {}, end: {} });
    return rows.get(k);
  };
  for (const a of attempts) {
    const r = row(P.key(a.t));
    // Rating at the start/end of each period, per tab (even under a filter, for the rating columns).
    if (!(a.tr in r.start)) r.start[a.tr] = a.solver;
    r.end[a.tr] = a.after;
    if (tr !== 'all' && a.tr !== tr) continue;
    r.n++; r.ok += a.ok; r.ms += a.ms; r.ratingSum += a.rating; r.newSolves += a.firstSolve;
  }
  for (const st of sets) {
    if (tr !== 'all' && st.tr !== tr) continue;
    const r = row(P.key(st.t));
    r.setsPlayed++; r.setsCleared += st.stars > 0; r.perfect += st.stars === 3;
  }
  return [...rows.values()].filter((r) => r.n || r.setsPlayed).sort((a, b) => (a.k < b.k ? 1 : -1));
}
// Per set and per ladder: attempts, scores, time, accuracy and your rating when you played.
function setStats(tr) {
  const { sets } = statsModel();
  const bySet = new Map();
  for (const st of sets) {
    if (tr !== 'all' && st.tr !== tr) continue;
    const id = `${st.sk}#${st.flat}`;
    const x = bySet.get(id) ?? { ...st, attempts: 0, best: 0, bestStars: 0, ms: 0, scoreSum: 0, solvers: [], last: 0 };
    x.attempts++; x.best = Math.max(x.best, st.score); x.bestStars = Math.max(x.bestStars, st.stars);
    x.ms += st.ms; x.scoreSum += st.score; x.last = Math.max(x.last, st.t);
    if (st.solver != null) x.solvers.push(st.solver);
    bySet.set(id, x);
  }
  return bySet;
}
const STATS_FILTERS = [['all', 'All'], ['tactics', 'Tactics'], ['openings', 'Openings'], ['endgames', 'Endgames']];
const statsView = { tr: 'all', period: 'day', open: null, unplayed: false };
const avg = (a) => (a.length ? Math.round(sum(a) / a.length) : null);
const accCell = (ok, n) => (n ? `<span class="acc ${accClass(ok / n)}">${Math.round((ok / n) * 100)}%</span>` : '–');
function showStats() {
  const tr = statsView.tr;
  const trs = tr === 'all' ? Object.keys(TRACKS) : [tr];
  const page = el(`<div class="sessions-page stats-page">
    <div class="sessions-head"><h1>Stats</h1>
      <div class="seg-tabs" id="trf">${STATS_FILTERS.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === tr ? 'on' : ''}">${l}</button>`).join('')}</div></div>
  </div>`);
  page.querySelectorAll('#trf button').forEach((b) => (b.onclick = () => { statsView.tr = b.dataset.k; statsView.open = null; showStats(); }));

  // Current day / week / month / year at a glance.
  const now = Date.now();
  const tiles = Object.entries(PERIODS).map(([p, P]) => {
    const r = periodTotals(p, tr).find((x) => x.k === P.key(now));
    const name = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' }[p];
    return `<div class="dash-tile"><small>${name}</small><b>${(r?.n ?? 0).toLocaleString()}</b>
      <span>puzzles · ${r?.n ? `${Math.round((r.ok / r.n) * 100)}% · ` : ''}${fmtDur(r?.ms ?? 0)} · ${r?.setsCleared ?? 0} set${r?.setsCleared === 1 ? '' : 's'} cleared</span></div>`;
  }).join('');
  page.append(el(`<div class="dash">${tiles}</div>`));

  // Period totals table.
  const rows = periodTotals(statsView.period, tr);
  const rt = (r, t) => {
    if (r.end[t] == null) return '<td class="muted">–</td>';
    const d = r.end[t] - r.start[t];
    return `<td>${r.end[t]} <small class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</small></td>`;
  };
  const per = el(`<section class="panel"><h2>Totals <span class="seg-tabs small" id="pf">${Object.entries(PERIODS).map(([k, P]) =>
      `<button type="button" data-k="${k}" class="${k === statsView.period ? 'on' : ''}">${P.label}</button>`).join('')}</span></h2>
    ${rows.length ? `<div class="table-wrap"><table class="theme-table stats-table"><thead><tr><th>Period</th><th>Puzzles</th><th>New solves</th><th>Accuracy</th><th>Time</th>
      <th>Sets played</th><th>Cleared</th><th>Avg puzzle</th>${trs.map((t) => `<th>${TRACKS[t].label} rating</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(PERIODS[statsView.period].fmt(r.k))}</td><td>${r.n.toLocaleString()}</td><td>${r.newSolves.toLocaleString()}</td>
        <td>${accCell(r.ok, r.n)}</td><td>${fmtDur(r.ms)}</td><td>${r.setsPlayed}</td><td>${r.setsCleared}${r.perfect ? ` <small class="muted">(${r.perfect}★★★)</small>` : ''}</td>
        <td>${r.n ? Math.round(r.ratingSum / r.n) : '–'}</td>${trs.map((t) => rt(r, t)).join('')}</tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">Nothing played yet. Totals appear here as you train.</p>'}
  </section>`);
  per.querySelectorAll('#pf button').forEach((b) => (b.onclick = () => { statsView.period = b.dataset.k; showStats(); }));
  page.append(per);

  // Sets: every ladder with sets available / played / cleared; click one for set-by-set stats.
  const bySet = setStats(tr);
  const { attempts } = statsModel();
  const ladders = [];
  for (const t of trs) {
    const cat = catalog(t);
    if (!cat) continue;
    for (const meta of cat.themes) {
      const sk = sessionKey(meta.key, t);
      const played = [...bySet.values()].filter((x) => x.sk === sk);
      const tp = progress[TRACKS[t].store]?.[meta.key];
      const stars = Object.values(tp?.stars || {});
      const atts = attempts.filter((a) => a.sk === sk);
      ladders.push({
        t, meta, sk, played,
        cleared: stars.filter((x) => x > 0).length, perfect: stars.filter((x) => x === 3).length,
        runs: sum(played.map((x) => x.attempts)), ms: sum(played.map((x) => x.ms)),
        puzzles: atts.length, ok: atts.filter((a) => a.ok).length,
        solver: avg(played.flatMap((x) => x.solvers)),
      });
    }
  }
  const shown = ladders.filter((l) => statsView.unplayed || l.runs || l.puzzles).sort((a, b) => b.runs - a.runs || b.puzzles - a.puzzles);
  const totalSets = sum(ladders.map((l) => l.meta.sets));
  const setsSec = el(`<section class="panel"><h2>Sets <span class="h2-meta">${sum(ladders.map((l) => l.played.length)).toLocaleString()} of ${totalSets.toLocaleString()} sets played · ${sum(ladders.map((l) => l.cleared)).toLocaleString()} cleared</span>
      <label class="unplayed"><input type="checkbox" id="unpl" ${statsView.unplayed ? 'checked' : ''}> Show ladders I haven't played</label></h2>
    ${shown.length ? `<div class="table-wrap"><table class="theme-table stats-table ladders"><thead><tr><th>Ladder</th>${tr === 'all' ? '<th>Tab</th>' : ''}<th>Sets available</th><th>Played</th><th>Cleared</th><th>Perfect</th>
      <th>Set attempts</th><th>Time in sets</th><th>Accuracy</th><th>Your rating when played</th></tr></thead><tbody></tbody></table></div>`
      : '<p class="muted">No sets played yet. Turn on "Show ladders I haven’t played" to see everything available.</p>'}
  </section>`);
  setsSec.querySelector('#unpl').onchange = (e) => { statsView.unplayed = e.target.checked; showStats(); };
  const tb = setsSec.querySelector('tbody');
  for (const l of shown) {
    const isOpen = statsView.open === l.sk;
    const tr1 = el(`<tr class="ladder-row ${isOpen ? 'open' : ''}" tabindex="0"><td><span class="caret">${l.played.length ? (isOpen ? '▾' : '▸') : ''}</span> ${esc(l.meta.name)}</td>
      ${tr === 'all' ? `<td class="muted">${TRACKS[l.t].label}</td>` : ''}<td>${l.meta.sets}</td><td>${l.played.length}</td><td>${l.cleared}</td><td>${l.perfect}</td>
      <td>${l.runs}</td><td>${l.ms ? fmtDur(l.ms) : '–'}</td><td>${accCell(l.ok, l.puzzles)}</td><td>${l.solver ?? '–'}</td></tr>`);
    if (l.played.length) {
      tr1.onclick = () => { statsView.open = isOpen ? null : l.sk; showStats(); };
      tr1.onkeydown = (e) => { if (e.key === 'Enter') tr1.onclick(); };
    }
    tb.append(tr1);
    if (!isOpen) continue;
    const cols = tr === 'all' ? 10 : 9;
    const detail = l.played.sort((a, b) => a.flat - b.flat).map((x) => {
      const b = bandOfFlat(l.meta, x.flat);
      return `<tr><td><a href="${hrefPlay(l.meta.key, x.flat, l.t)}">${b.min}–${b.max} · set ${b.n + 1}</a></td><td>${x.attempts}</td><td>${x.best}/${SET_SIZE}</td>
        <td class="stars">${starStr(x.bestStars)}</td><td>${fmtDur(x.ms)}</td><td>${fmtClock(x.ms / x.attempts)}</td>
        <td>${accCell(x.scoreSum, x.attempts * SET_SIZE)}</td><td>${x.solvers.length ? `${avg(x.solvers)}${x.solvers.length > 1 ? ` <small class="muted">(last ${x.solvers.at(-1)})</small>` : ''}` : '–'}</td>
        <td class="muted">${new Date(x.last).toLocaleDateString()}</td></tr>`;
    }).join('');
    tb.append(el(`<tr class="set-detail"><td colspan="${cols}"><table class="theme-table inner"><thead><tr><th>Set</th><th>Attempts</th><th>Best</th><th>Stars</th>
      <th>Total time</th><th>Avg / attempt</th><th>Accuracy</th><th>Your rating</th><th>Last played</th></tr></thead><tbody>${detail}</tbody></table>
      <div class="muted small-note">${l.meta.sets - l.played.length} of ${l.meta.sets} sets in this ladder not played yet.</div></td></tr>`));
  }
  page.append(setsSec);
  $app.replaceChildren(page);
}

// ---- Sessions page ------------------------------------------------------------
// Export everything in a stable, documented shape so it can later be uploaded and
// compared against a cohort (for a relative tactics rating).
function exportData() {
  const attempt = ([theme, rating, ok, ms, id, d]) => ({
    track: splitKey(theme)[0],
    theme: splitKey(theme)[1], puzzleId: id, puzzleRating: rating,
    firstTryCorrect: !!ok, msToResult: ms,
    ...(d ? {
      run: d.run, at: d.at, msToFirstMove: d.first, msTotal: d.total,
      finishedLine: !!d.solved, viewedSolution: !!d.sol,
      moves: (d.moves || []).map(([uci, thinkMs, correct]) => ({ uci, thinkMs, correct: !!correct })),
    } : {}),
  });
  const setRow = ([theme, flat, min, score, stars, tm]) => ({
    track: splitKey(theme)[0],
    theme: splitKey(theme)[1], setIndex: flat, rungMin: min, score, stars,
    ...(tm ? { run: tm.run, start: tm.start, end: tm.end, ms: tm.ms, puzzleMs: tm.puzzleMs } : {}),
  });
  const data = {
    format: 'dojo-tactics-progression/sessions', version: 1, exportedAt: new Date().toISOString(),
    rules: { setSize: SET_SIZE, passScore: PASS_SCORE },
    totals: {
      xp: progress.xp, solved: solvedCount(),
      tracks: Object.fromEntries(Object.keys(TRACKS).map((tr) => [tr, { solved: solvedCount(tr), rating: trackRating(tr).rating, rank: userRank(tr)[2] }])),
    },
    puzzles: progress.puzzles,
    sessions: progress.sessions.map((s) => ({
      id: s.id, start: s.start, end: s.end, xp: s.xp,
      sets: s.sets.map(setRow), attempts: s.attempts.map(attempt),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dojo-tactics-forger-sessions-${today()}.json`;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function themeName(k) {
  const [tr, key] = splitKey(k);
  return catalog(tr)?.themes.find((t) => t.key === key)?.name ?? key.replace(/_/g, ' ');
}
const themeHref = (k) => hrefTheme(splitKey(k)[1], splitKey(k)[0]);
function accClass(a) {
  return a >= 0.85 ? 'hi' : a >= 0.7 ? 'mid' : 'lo';
}
function showSessions() {
  const sessions = progress.sessions.filter((s) => s.attempts.length || s.sets.length);
  const all = sessions.flatMap((s) => s.attempts);
  const page = el(`<div class="sessions-page"><div class="sessions-head"><h1>Sessions</h1>
    <button class="btn ghost small" id="exportBtn" type="button" title="Download all session data, including per-move timing, as JSON">⬇ Export data</button></div></div>`);
  page.querySelector('#exportBtn').onclick = exportData;
  if (!all.length) {
    page.append(el(`<div class="empty-card">No sessions yet. Every time you train, the puzzles, themes, accuracy and time are logged here.
      A new session starts after 30 minutes away. <a class="btn primary" href="#">Start climbing</a></div>`));
    $app.replaceChildren(page);
    return;
  }
  const ok = all.filter((a) => a[2]).length;
  const allMoves = all.flatMap((a) => (a[5]?.moves || []).map((m) => m[1]));
  const allFirst = all.map((a) => a[5]?.first).filter((v) => v != null);
  const totalMs = sum(sessions.map((s) => s.end - s.start));
  const sets = sessions.flatMap((s) => s.sets);
  page.append(el(`<div class="dash">
    <div class="dash-tile"><small>Sessions</small><b>${sessions.length}</b><span>${fmtDur(totalMs)} total</span></div>
    <div class="dash-tile"><small>Puzzles</small><b>${all.length.toLocaleString()}</b><span>${ok.toLocaleString()} first-try</span></div>
    <div class="dash-tile"><small>Accuracy</small><b class="acc ${accClass(ok / all.length)}">${Math.round((ok / all.length) * 100)}%</b><span>first try</span></div>
    <div class="dash-tile"><small>Avg time</small><b>${fmtSec(sum(all.map((a) => a[3])) / all.length)}</b><span>per puzzle</span></div>
    <div class="dash-tile"><small>Avg move</small><b>${allMoves.length ? fmtSec(sum(allMoves) / allMoves.length) : '–'}</b><span>${allMoves.length.toLocaleString()} moves timed</span></div>
    <div class="dash-tile"><small>First move</small><b>${allFirst.length ? fmtSec(sum(allFirst) / allFirst.length) : '–'}</b><span>avg think time</span></div>
    <div class="dash-tile"><small>Sets</small><b>${sets.filter((x) => x[4] > 0).length}/${sets.length}</b><span>cleared · ${sets.filter((x) => x[4] === 3).length} perfect</span></div>
    <div class="dash-tile"><small>Avg rating</small><b>${Math.round(sum(all.map((a) => a[1])) / all.length)}</b><span>puzzles played</span></div>
  </div>`));

  // Accuracy trend (last 20 sessions)
  const recent = sessions.slice(-20);
  const trend = el(`<section class="panel"><h2>Accuracy by session</h2><div class="trend"></div><div class="trend-axis"><span>older</span><span>latest</span></div></section>`);
  const tr = trend.querySelector('.trend');
  for (const s of recent) {
    const sm = sessionSummary(s);
    const h = Math.max(4, Math.round(sm.acc * 100));
    tr.append(el(`<div class="trend-col" title="${new Date(s.start).toLocaleString()} · ${sm.n} puzzles · ${Math.round(sm.acc * 100)}%">
      <span class="trend-val">${sm.n ? Math.round(sm.acc * 100) : '–'}</span>
      <div class="trend-bar ${accClass(sm.acc)}" style="height:${sm.n ? h : 2}%"></div>
      <span class="trend-n">${sm.n}</span></div>`));
  }
  page.append(trend);

  // Theme breakdown
  const byTheme = {};
  for (const [k, r, good, ms] of all) {
    const t = (byTheme[k] ??= { n: 0, ok: 0, ms: 0, r: 0 });
    t.n++; t.ok += good; t.ms += ms; t.r += r;
  }
  const rows = Object.entries(byTheme).sort((a, b) => b[1].n - a[1].n);
  const weakest = rows.length < 2 ? null : rows.filter(([, t]) => t.n >= 10).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
  const tbl = el(`<section class="panel"><h2>By theme ${weakest ? `<span class="h2-meta">Weakest: <a href="${themeHref(weakest[0])}">${esc(themeName(weakest[0]))}</a> (${Math.round((weakest[1].ok / weakest[1].n) * 100)}%)</span>` : ''}</h2>
    <table class="theme-table"><thead><tr><th>Theme</th><th>Puzzles</th><th>Accuracy</th><th>Avg rating</th><th>Avg time</th></tr></thead><tbody></tbody></table></section>`);
  const tb = tbl.querySelector('tbody');
  for (const [k, t] of rows) {
    const a = t.ok / t.n;
    tb.append(el(`<tr><td><a href="${themeHref(k)}">${esc(themeName(k))}</a></td><td>${t.n}</td>
      <td><div class="acc-cell"><div class="acc-bar"><div class="${accClass(a)}" style="width:${Math.round(a * 100)}%"></div></div><span>${Math.round(a * 100)}%</span></div></td>
      <td>${Math.round(t.r / t.n)}</td><td>${fmtSec(t.ms / t.n)}</td></tr>`));
  }
  page.append(tbl);

  // Session list, newest first
  const list = el(`<section><h2 class="list-h">All sessions</h2><div class="session-list"></div></section>`);
  const sl = list.querySelector('.session-list');
  sessions.slice().reverse().forEach((s, i) => {
    const sm = sessionSummary(s);
    const n = sessions.length - i;
    const d = new Date(s.start);
    const live = Date.now() - s.end < SESSION_GAP;
    const chips = Object.entries(sm.themes).sort((a, b) => b[1].n - a[1].n)
      .map(([k, t]) => `<span class="chip"><b>${esc(themeName(k))}</b> ${t.n} · <span class="acc ${accClass(t.ok / t.n)}">${Math.round((t.ok / t.n) * 100)}%</span></span>`).join('');
    const card = el(`<details class="session-card">
      <summary>
        <div class="sc-head">
          <div><b>Session ${n}</b> ${live ? '<span class="live-dot">● live</span>' : ''}
            <div class="sc-date">${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${fmtDur(sm.duration)}</div></div>
          <div class="sc-stats">
            <div><b>${sm.n}</b><small>puzzles</small></div>
            <div><b class="acc ${accClass(sm.acc)}">${sm.n ? Math.round(sm.acc * 100) + '%' : '–'}</b><small>accuracy</small></div>
            <div><b>${sm.avgRating || '–'}</b><small>avg rating</small></div>
            <div><b>${sm.n ? fmtSec(sm.avgMs) : '–'}</b><small>avg puzzle</small></div>
            <div><b>${sm.moveN ? fmtSec(sm.avgMoveMs) : '–'}</b><small>avg move</small></div>
            <div><b>${sm.setsCleared}/${sm.setsPlayed}</b><small>sets</small></div>
            <div><b>+${s.xp}</b><small>XP</small></div>
          </div>
        </div>
        <div class="chips">${chips}</div>
      </summary>
      <div class="sc-body">
        ${s.sets.length ? `<div class="sc-sets">${s.sets.map(([k, f, min, score, st, tm]) => `<span class="set-chip ${st ? 'pass' : 'fail'}">${esc(themeName(k))} ${min} · ${score}/10 ${st ? starStr(st) : ''}${tm ? ` · ⏱ ${fmtClock(tm.ms)} · ${fmtSec(sum(tm.puzzleMs) / Math.max(1, tm.puzzleMs.length))}/puzzle` : ''}</span>`).join('')}</div>` : ''}
        <div class="attempts">${s.attempts.map(([k, r, good, ms, id, d]) => {
          const mv = d?.moves?.length ? `\nMoves: ${d.moves.map(([u, t, c]) => `${u} ${fmtSec(t)}${c ? '' : ' ✗'}`).join(', ')}` : '';
          const extra = d ? `\nFirst move ${d.first != null ? fmtSec(d.first) : '–'} · total ${fmtSec(d.total)}${d.sol ? ' · viewed solution' : ''}` : '';
          return `<a class="att ${good ? 'ok' : 'bad'}" href="https://lichess.org/training/${esc(id)}" target="_blank" rel="noopener" title="${esc(themeName(k))} · ${r} · ${fmtSec(ms)}${esc(extra)}${esc(mv)}">${good ? '✓' : '✗'} ${r} <small>${fmtSec(d?.total ?? ms)}</small></a>`;
        }).join('')}</div>
      </div>
    </details>`);
    sl.append(card);
  });
  page.append(list);
  $app.replaceChildren(page);
}

// ---- Ladder ---------------------------------------------------------------------
async function showLadder(key) {
  const meta = catalog(track).themes.find((t) => t.key === key);
  if (!meta) return (location.hash = hrefHome());
  $app.replaceChildren(el(`<div class="loading">Loading ${esc(meta.name)}…</div>`));
  const theme = await loadTheme(key);
  const tp = themeProgress(key);
  const page = el(`<div class="ladder-page">
    <div class="ladder-head">
      <a class="back" href="${hrefHome()}">← All ${T().nounPl}</a>
      <h1>${esc(theme.name)}</h1>
      ${track === 'openings' && !specialtyKeys().includes(key) ? `<div class="try-banner">🧪 Trying out an opening outside your specialty. Progress here is kept.
        <button type="button" class="btn small" id="makeSpec">Make it my specialty pick</button></div>` : ''}
      <div class="ladder-summary"></div>
    </div>
    <div class="ladder-actions">
        <button class="btn primary" id="cont">${tp.frontier >= theme.sets.length ? 'Ladder complete 🏆' : 'Continue climbing'}</button>
        <label class="jump">Jump to
          <select id="jump">${theme.bands.map((b, i) => {
            const flat = theme.sets.findIndex((s) => s.band === i);
            return `<option value="${flat}">${b.min}</option>`;
          }).join('')}</select>
        </label>
    </div>
    <div class="ladder"></div>
  </div>`);
  const ms = page.querySelector('#makeSpec');
  if (ms) {
    ms.onclick = () => {
      setSpecialty(meta.slot, key);
      toast(`${meta.name} is now in your specialty`);
      ms.parentElement.remove();
    };
  }
  const ladder = page.querySelector('.ladder');
  const byBand = new Map();
  theme.sets.forEach((s, flat) => {
    if (!byBand.has(s.band)) byBand.set(s.band, []);
    byBand.get(s.band).push(flat);
  });
  // Summary
  const total = theme.sets.length;
  const cleared = Object.values(tp.stars).filter((s) => s > 0).length;
  const stars = sum(Object.values(tp.stars));
  const perfect = Object.values(tp.stars).filter((s) => s === 3).length;
  const here = nextSet(tp, total);
  const curSet = theme.sets[Math.min(here, total - 1)];
  const rungNo = curSet.band + 1;
  const ltr = trackRating();
  const lrp = rankProgress(ltr.rating, track);
  const [, rIcon, rTitle] = lrp.rank;
  page.querySelector('.ladder-summary').innerHTML = `
    <div class="sum-rank"><span class="rank-icon">${rankIcon(rIcon, 48)}</span><div class="sum-rank-main"><b>${rTitle}</b>
      <small>${T().label} rating ${ratingText(track)} · ${solvedCount(track).toLocaleString()} solved${lrp.next ? ` · next ${lrp.next[2]}` : ' · top rank'}</small>
      <div class="rr-bar small"><div style="width:${lrp.frac > 0 ? Math.max(2, lrp.frac * 100) : 0}%"></div></div></div></div>
    <div class="sum-tile"><small>Current stage</small><b>${curSet.min}–${curSet.max}</b><span>Stage ${rungNo} of ${theme.bands.length}</span></div>
    <div class="sum-tile"><small>Sets cleared</small><b>${cleared}/${total}</b><span>${pct(cleared, total)}% complete</span></div>
    <div class="sum-tile"><small>Stars</small><b>★ ${stars}</b><span>of ${total * 3} · ${perfect} perfect</span></div>
    <div class="sum-bar"><div class="bar big"><div style="width:${pct(cleared, total)}%"></div></div></div>`;

  const bandEntries = [...byBand.entries()]; // lowest rung first, work down the page
  bandEntries.forEach(([bi, flats], i) => {
    const b = theme.bands[bi];
    const rungCleared = flats.filter((f) => tp.stars[f] > 0).length;
    const rungStars = sum(flats.map((f) => tp.stars[f] || 0));
    const unlocked = flats[0] <= here;
    const isCurrent = flats.includes(here);
    const complete = rungCleared === flats.length;
    const rung = el(`<div class="rung ${isCurrent ? 'current' : ''} ${complete ? 'complete' : ''}">
      <div class="rung-label"><b>${b.min}</b><small>–${b.max}</small><span class="rung-no">Stage ${bi + 1}</span></div>
      <div class="rung-sets"></div>
      <div class="rung-count"><b>${rungCleared}/${flats.length}</b><small>sets</small><span>★ ${rungStars}/${flats.length * 3}</span></div>
    </div>`);
    const wrap = rung.querySelector('.rung-sets');
    for (const f of flats) {
      const st = tp.stars[f] || 0;
      const wait = st ? 0 : waitLeft(tp, f);
      const state = st ? 'done' : wait ? 'wait' : f === here ? 'next' : 'open';
      const known = theme.sets[f].puzzles.filter((pz) => isSolved(pz.id)).length;
      const node = el(`<button class="node ${state}"
        title="Set ${theme.sets[f].n + 1} · ${b.min}–${b.max} · ${known}/${theme.sets[f].puzzles.length} puzzles solved${wait ? ` · practice only, clear it in ${fmtWait(wait)}` : ''}">
        <span class="node-n">${theme.sets[f].n + 1}</span>
        <span class="node-stars">${st ? starStr(st) : state === 'next' ? 'GO' : state === 'wait' ? '🔒' : ''}</span>
        ${known && !st ? `<span class="node-known">${known}/${theme.sets[f].puzzles.length}</span>` : ''}
      </button>`);
      node.onclick = () => (location.hash = hrefPlay(key, f));
      wrap.append(node);
    }
    // Rank milestone just above the rung where that rank starts
    const rank = RANKS.find(([r]) => r === b.min);
    if (rank && rank[0] > 0) {
      ladder.append(el(`<div class="milestone ${unlocked ? 'reached' : ''}"><span class="inline-rank">${rankIcon(rank[1], 20)} ${rank[2]} · ${rank[0]}</span></div>`));
    }
    ladder.append(rung);
  });
  page.querySelector('#cont').onclick = () => {
    if (tp.frontier < theme.sets.length) location.hash = hrefPlay(key, here);
  };
  const jump = page.querySelector('#jump');
  jump.value = String(theme.sets.findIndex((s) => s.band === curSet.band));
  jump.onchange = () => {
    // Moves your place to that stage: Continue and Next up carry on from there.
    tp.at = Number(jump.value);
    saveProgress();
    showLadder(key).then(() => document.querySelector('.rung.current')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };

  $app.replaceChildren(page);
  page.querySelector('.rung.current')?.scrollIntoView({ block: 'center' });
}

// ---- Play -------------------------------------------------------------------------
let cg = null;
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
let ticker = null;
function cleanupBoard() {
  clearInterval(ticker);
  ticker = null;
  timers.forEach(clearTimeout);
  timers = [];
  cg?.destroy();
  cg = null;
}

function dests(chess) {
  const d = new Map();
  for (const m of chess.moves({ verbose: true })) {
    if (!d.has(m.from)) d.set(m.from, []);
    d.get(m.from).push(m.to);
  }
  return d;
}
const uciToMove = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
const colorName = (c) => (c === 'w' ? 'white' : 'black');

async function showPlay(key, flat) {
  const meta = catalog(track).themes.find((t) => t.key === key);
  if (!meta) return (location.hash = hrefHome());
  const theme = await loadTheme(key);
  const tp = themeProgress(key);
  const set = theme.sets[flat];
  if (!set) return (location.hash = hrefTheme(key));
  const tryingAhead = flat > lowestUncleared(tp, theme.sets.length);
  const waitMs = waitLeft(tp, flat); // > 0: practice only, can't clear it yet
  tp.at = flat; // your place is wherever you play
  const cleared = Object.values(tp.stars).filter((s) => s > 0).length;
  const known = set.puzzles.filter((p) => isSolved(p.id)).length;
  const tr = track;
  playRun({
    mode: 'set',
    puzzles: set.puzzles.map((p) => ({ ...p, key, track: tr })),
    backHref: hrefTheme(key),
    backLabel: '', // the title links back to the ladder
    head: `<a class="set-name" href="${hrefTheme(key)}" title="Back to the ${esc(theme.name)} ladder"><span class="set-back" aria-hidden="true">‹</span><h2>${esc(theme.name)}</h2></a>
      ${waitMs ? `<div class="wait-badge" title="You missed this set. Play it as much as you like; it can be cleared again in ${fmtWait(waitMs)}.">🔒 Practice only · clear it in ${fmtWait(waitMs)}</div>` : ''}
      ${tryingAhead && !waitMs ? `<div class="ahead-badge" title="You've skipped ahead of sets you haven't cleared. Clearing this one saves its stars and fills your ring; the lower sets stay open.">🚀 Trying ahead</div>` : ''}
      <div class="set-sub"><b>${set.min}–${set.max}</b> · Stage ${set.band + 1}/${theme.bands.length} · Set ${set.n + 1}/${theme.sets.filter((s) => s.band === set.band).length}${known ? ` · <span class="known-note" title="Puzzles you've solved before are underlined in the progress row.">${known}/${set.puzzles.length} seen before</span>` : ''}</div>`,
    progress: `<div class="theme-progress">
        <div class="tp-row"><span>Sets cleared</span><span>${cleared}/${theme.sets.length}</span></div>
        <div class="bar"><div style="width:${pct(cleared, theme.sets.length)}%"></div></div>
      </div>`,
    rule: waitMs ? `Practice run: this set can be cleared again in ${fmtWait(waitMs)}.` : `Clear the set with ${PASS_SCORE}/${SET_SIZE} first-try solves. Miss and you wait 24 hours to clear it.`,
    passScore: PASS_SCORE,
    finish: finishSet,
  });

  function finishSet({ results, puzzleMs, runId, runStart, runMs, snapAtStart, newlySolved }) {
    const score = results.filter(Boolean).length;
    const prev = tp.stars[flat] || 0;
    const practice = waitMs > 0 && prev === 0; // started while waiting: can't clear it this time
    const stars = practice ? 0 : starsFor(score);
    if (!practice && stars === 0 && prev === 0) (tp.failed ??= {})[flat] = Date.now(); // start the wait
    if (stars > 0 && tp.failed) delete tp.failed[flat];
    const waitNow = waitLeft(tp, flat);
    const si = stageOf(key);
    const beforeFrac = clearedCount(key) / theme.sets.length;
    const stageBefore = si >= 0 ? stageProgress(si).frac : 0;
    let bonus = 0;
    const firstClear = stars > 0 && prev === 0;
    if (stars > 0) {
      if (stars > prev) tp.stars[flat] = stars;
      if (prev === 0) bonus += SET_CLEAR_XP;
      tp.at = flat;
      tp.frontier = lowestUncleared(tp, theme.sets.length);
      if (stars === 3 && prev < 3) bonus += PERFECT_XP;
      const d = today();
      if (progress.lastDay !== d) {
        const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        progress.streak = progress.lastDay === y ? (progress.streak || 0) + 1 : 1;
        progress.lastDay = d;
      }
    }
    const lvlBefore = levelFromXp(progress.xp);
    progress.xp += bonus;
    recordSet(sessionKey(key), flat, set.min, score, stars, bonus, { run: runId, start: runStart, end: Date.now(), ms: runMs, puzzleMs });
    renderStats();
    if (levelFromXp(progress.xp) > lvlBefore) toast(`Level up! You're now level ${levelFromXp(progress.xp)}`);
    cleanupBoard();

    const next = theme.sets[flat + 1];
    const newRung = next && next.band !== set.band && firstClear;
    const passed = stars > 0;
    const rungSets = theme.sets.map((s, f) => (s.band === set.band ? f : -1)).filter((f) => f >= 0);
    const rungCleared = rungSets.filter((f) => tp.stars[f] > 0).length;
    const themeCleared = Object.values(tp.stars).filter((s) => s > 0).length;
    const changes = ratingChanges(snapAtStart);
    const solvedNote = newlySolved ? `<div class="solved-note">+${newlySolved} new puzzle${newlySolved === 1 ? '' : 's'} solved · ${solvedCount().toLocaleString()} total</div>` : '';
    const themeDoneNow = firstClear && clearedCount(key) >= theme.sets.length;
    const stageAfter = si >= 0 ? stageProgress(si).frac : 0;
    const ringDoneNow = si >= 0 && stageBefore < 1 && stageAfter >= 1;
    if (stars === 3 || themeDoneNow || ringDoneNow) confetti();
    if (ringDoneNow) toast(`💍 ${STAGES[si].name} complete!${si < STAGES.length - 1 ? ` ${STAGES[si + 1].name} awaits.` : ''}`);
    else if (themeDoneNow) toast(`${theme.name} slice complete!`);
    const panel = el(`<div class="result ${passed ? 'pass' : 'fail'} ${stars === 3 ? 'perfect' : ''}">
      <div class="result-card">
        <div class="result-stars">${starStr(stars)}</div>
        <h1>${passed ? (stars === 3 ? 'Perfect set!' : 'Set cleared!') : practice && score >= PASS_SCORE ? 'Nice practice!' : 'Not quite'}</h1>
        <div class="result-score"><b>${score}</b>/${SET_SIZE}</div>
        <div class="pips big">${results.map((r) => `<span class="pip ${r ? 'ok' : 'bad'}"></span>`).join('')}</div>
        <div class="result-time">
          <div><b>${fmtClock(runMs)}</b><small>set time</small></div>
          <div><b>${fmtSec(sum(puzzleMs) / puzzleMs.length)}</b><small>avg / puzzle</small></div>
          <div><b>${fmtSec(Math.min(...puzzleMs))}</b><small>fastest</small></div>
          <div><b>${fmtSec(Math.max(...puzzleMs))}</b><small>slowest</small></div>
        </div>
        <p>${passed
          ? newRung ? `🎉 New stage unlocked: <b>${next.min}–${next.max}</b>` : bonus ? `<span class="xp">+${bonus} bonus XP</span>` : 'Stars updated.'
          : practice ? `Practice run. You can clear this set in <b>${fmtWait(waitNow)}</b>.`
          : `You need ${PASS_SCORE}/${SET_SIZE} to clear this set. You can practice it now and clear it in <b>24 hours</b>.`}</p>
        ${solvedNote}
        ${changes}
        ${si >= 0 ? `<div class="result-ring">
          <div class="ring-wrap small">${ringsSvg({ stages: [si], size: 170, stroke: 18, gap: 0, highlight: key, before: { [key]: beforeFrac }, links: false })}
            <div class="ring-center"><small>${esc(STAGES[si].name)}</small><b style="color:${STAGE_COLORS[si]}">${ringPct(stageAfter)}%</b></div>
          </div>
          <div class="result-ring-text">${stageAfter > stageBefore
            ? `<b style="color:${STAGE_COLORS[si]}">+${ringPct(stageAfter - stageBefore)}%</b> ${esc(STAGES[si].name)}<br><small>${esc(theme.name)} slice ${ringPct(clearedCount(key) / theme.sets.length)}% full</small>`
            : `<small>Clear the set to fill your ${esc(theme.name)} slice.</small>`}</div>
        </div>` : ''}
        <div class="result-progress">
          <div class="tp-row"><span>Stage ${set.min}–${set.max}</span><span>${rungCleared}/${rungSets.length} sets</span></div>
          <div class="segs">${rungSets.map((f) => `<span class="seg ${tp.stars[f] ? 'on' : ''} ${f === flat ? 'cur' : ''}"></span>`).join('')}</div>
          <div class="tp-row"><span>${esc(theme.name)} ladder</span><span>${themeCleared}/${theme.sets.length} sets · ${pct(themeCleared, theme.sets.length)}%</span></div>
          <div class="bar"><div style="width:${pct(themeCleared, theme.sets.length)}%"></div></div>
        </div>
        <div class="controls center"></div>
      </div>
    </div>`);
    const ctr = panel.querySelector('.controls');
    const btn = (label, fn, cls) => {
      const b = el(`<button class="btn ${cls || ''}">${label}</button>`);
      b.onclick = fn;
      ctr.append(b);
    };
    const replay = () => (route());
    const nx = nextSet(tp, theme.sets.length);
    const canNext = nx < theme.sets.length && nx !== flat;
    if (canNext) btn('Next set →', () => (location.hash = hrefPlay(key, nx)), 'primary');
    btn(passed ? 'Replay set' : waitNow ? 'Practice again' : 'Retry set', replay, passed || canNext ? 'ghost' : 'primary');
    btn('Ladder', () => (location.hash = hrefTheme(key)), 'ghost');
    $app.replaceChildren(panel);
    animateRings(panel);
  }

}

// The puzzle player, shared by ladder sets, Practice and Review.
// run: { mode, puzzles: [{ id, fen, moves, rating, key, track }], backHref, backLabel,
//        head (html), progress (html), rule (text), passScore (sets only), finish(summary) }
function playRun(run) {
  const N = run.puzzles.length;
  const snapAtStart = ratingSnap();
  const solvedAtStart = solvedCount();
  const results = Array(N).fill(null);
  let idx = 0;
  if (new URLSearchParams(location.search).has('test')) window.__run = { run, idx: () => idx };

  const page = el(`<div class="play">
    <div class="play-board">
      <div id="board" class="cg-board-wrap dojo-board"></div>
      <div class="board-settings">
        <label>Board <select id="setBoard">${Object.entries(BOARDS).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label>Pieces <select id="setPieces">${Object.entries(PIECES).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <button class="btn ghost small" id="setSound" type="button"></button>
      </div>
    </div>
    <aside class="play-side">
      ${run.backLabel ? `<a class="back" href="${run.backHref}">← ${esc(run.backLabel)}</a>` : ''}
      <div class="set-title">${run.head}</div>
      ${run.progress || ''}
      <div class="pips"></div>
      <div class="combo" id="combo"></div>
      <div class="clock" id="clock"></div>
      <div class="status" id="status"></div>
      <div class="puzzle-meta" id="pmeta"></div>
      <div class="controls" id="controls"></div>
      <p class="rule">${run.rule}</p>
      <div class="live-session" id="liveSession"></div>
    </aside>
  </div>`);
  $app.replaceChildren(page);
  const $pips = page.querySelector('.pips');
  const $status = page.querySelector('#status');
  const $meta = page.querySelector('#pmeta');
  const $controls = page.querySelector('#controls');

  const $board = page.querySelector('#board');
  applyBoardLook($board);
  const $setBoard = page.querySelector('#setBoard');
  const $setPieces = page.querySelector('#setPieces');
  const $setSound = page.querySelector('#setSound');
  $setBoard.value = progress.settings.board;
  $setPieces.value = progress.settings.pieces;
  const soundLabel = () => ($setSound.textContent = progress.settings.sound ? '🔊 Sound' : '🔇 Muted');
  soundLabel();
  $setBoard.onchange = () => { progress.settings.board = $setBoard.value; saveProgress(); applyBoardLook($board); checkOfflineReady(); };
  $setPieces.onchange = () => { progress.settings.pieces = $setPieces.value; saveProgress(); applyBoardLook($board); checkOfflineReady(); };
  $setSound.onclick = () => { progress.settings.sound = !progress.settings.sound; saveProgress(); soundLabel(); };

  const $live = page.querySelector('#liveSession');
  const renderLive = () => {
    const s = currentSession(false);
    if (!s || !s.attempts.length) {
      $live.innerHTML = '<div class="live-head">This session</div><div class="live-empty">Your session stats will show up here.</div>';
      return;
    }
    const sm = sessionSummary(s);
    $live.innerHTML = `<div class="live-head">This session <a href="#/sessions">History →</a></div>
      <div class="live-grid">
        <div><b>${sm.n}</b><small>puzzles</small></div>
        <div><b>${Math.round(sm.acc * 100)}%</b><small>accuracy</small></div>
        <div><b>${fmtDur(Date.now() - s.start)}</b><small>time</small></div>
        <div><b>+${s.xp}</b><small>XP</small></div>
      </div>`;
  };
  renderLive();

  const $combo = page.querySelector('#combo');
  let combo = 0;
  const renderCombo = () => {
    const score = results.filter(Boolean).length;
    const misses = results.filter((r) => r === false).length;
    const safe = run.passScore ? N - run.passScore - misses : null;
    $combo.innerHTML = `
      <span class="combo-streak ${combo >= 3 ? 'hot' : ''}">${combo >= 2 ? `🔥 ${combo} in a row` : '&nbsp;'}</span>
      <span class="combo-safe ${safe == null ? '' : safe < 0 ? 'out' : safe === 0 ? 'edge' : ''}">${safe == null ? '' : safe < 0 ? 'Set can’t be cleared — finish for practice · ' : safe === 0 ? 'No more misses allowed! · ' : `${safe} miss${safe === 1 ? '' : 'es'} to spare · `}${score} ✓</span>`;
  };
  const renderPips = () => {
    renderCombo();
    $pips.innerHTML = results
      .map((r, i) => `<span class="pip ${r === true ? 'ok' : r === false ? 'bad' : ''} ${i === idx ? 'cur' : ''} ${r === null && isSolved(run.puzzles[i].id) ? 'known' : ''}" title="${isSolved(run.puzzles[i].id) ? 'Solved before' : 'New puzzle'}">${i + 1}</span>`)
      .join('');
  };
  const status = (cls, html) => {
    $status.className = `status ${cls}`;
    $status.innerHTML = html;
  };
  const controls = (buttons) => {
    $controls.replaceChildren(...buttons.map(([label, fn, cls]) => {
      const b = el(`<button class="btn ${cls || ''}">${label}</button>`);
      b.onclick = fn;
      return b;
    }));
  };

  cg = Chessground(page.querySelector('#board'), {
    animation: { enabled: true, duration: 220 },
    highlight: { lastMove: true, check: true },
    movable: { free: false, showDests: true },
    premovable: { enabled: false },
    draggable: { showGhost: true },
    trustAllEvents: new URLSearchParams(location.search).has('test'),
  });

  let chess, moves, ply, player, failed, done, tStart, tDecided, recorded;
  // Timing: one "run" per attempt at this set.
  const runId = Date.now();
  const runStart = Date.now();
  const puzzleMs = [];
  let tTurn = 0; // when it last became your turn
  let moveLog = [];
  let sawSolution = false;
  let newlySolved = 0;
  let newBests = 0;
  let solvedLine = false;
  let tEnd = null;
  const $clock = page.querySelector('#clock');
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const tick = () => {
    if (!$clock.isConnected) return;
    const pz = tStart && ply > 0 ? (tEnd ?? performance.now()) - tStart : 0;
    $clock.innerHTML = `<span title="Time on this run">⏱ ${run.mode === 'set' ? 'Set' : 'Run'} <b>${mmss(Date.now() - runStart)}</b></span><span title="Time on this puzzle">Puzzle <b>${(pz / 1000).toFixed(1)}s</b></span>`;
  };
  ticker = setInterval(tick, 200);
  tick();
  const moveSound = (m) => playSound(m.san.includes('+') || m.san.includes('#') ? 'check' : m.captured ? 'capture' : 'move');

  function sync(lastMove) {
    const turn = colorName(chess.turn());
    cg.set({
      fen: chess.fen(),
      turnColor: turn,
      check: chess.inCheck(),
      lastMove,
      movable: { color: !done && turn === player ? player : undefined, dests: !done && turn === player ? dests(chess) : new Map(), events: { after: onUserMove } },
    });
  }

  function playComputer() {
    const u = moves[ply];
    moveSound(chess.move(uciToMove(u)));
    ply++;
    sync([u.slice(0, 2), u.slice(2, 4)]);
    if (ply === 1) tStart = performance.now();
    tTurn = performance.now();
  }

  function startPuzzle() {
    const p = run.puzzles[idx];
    chess = new Chess(p.fen);
    moves = p.moves;
    ply = 0;
    failed = false;
    done = false;
    recorded = false;
    tStart = performance.now();
    tDecided = null;
    tEnd = null;
    moveLog = [];
    sawSolution = false;
    solvedLine = false;
    player = chess.turn() === 'w' ? 'black' : 'white';
    cg.set({ orientation: player, fen: p.fen, lastMove: undefined, check: false, movable: { color: undefined, dests: new Map() } });
    renderPips();
    const rec = puzzleRec(p.id);
    const seen = !rec ? '<span class="pz-tag new">New puzzle</span>'
      : rec.ok ? `<span class="pz-tag done">✓ Solved before · best ${fmtSec(rec.best)}</span>`
      : '<span class="pz-tag miss">Missed before</span>';
    $meta.innerHTML = `Puzzle ${idx + 1}/${N} · rated <b>${p.rating}</b>${run.mode !== 'set' ? ` · ${esc(themeName(sessionKey(p.key, p.track)))}` : ''}<div>${seen}</div>`;
    status('', `<span class="dot ${player}"></span> <b>${player === 'white' ? 'White' : 'Black'} to play</b>`);
    controls([]);
    later(playComputer, 550);
  }

  function onUserMove(orig, dest) {
    const expected = moves[ply];
    const piece = chess.get(orig);
    const isPromo = piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1');
    const promo = isPromo ? (expected.startsWith(orig + dest) && expected[4] ? expected[4] : 'q') : '';
    const uci = orig + dest + promo;
    let ok = uci === expected;
    if (!ok && ply === moves.length - 1) {
      // Any mate on the final move counts.
      const test = new Chess(chess.fen());
      try {
        test.move(uciToMove(uci));
        ok = test.isCheckmate();
      } catch {}
    }
    const now = performance.now();
    moveLog.push([uci, Math.round(now - tTurn), ok ? 1 : 0]);
    tTurn = now; // a retry's think time starts now
    if (!ok) {
      if (!failed) {
        failed = true;
        tDecided ??= performance.now();
        combo = 0;
        results[idx] = false;
        renderPips();
      }
      playSound('move');
      status('bad', `✗ Not the move. Try again, or see the solution.`);
      controls([['Show solution', showSolution], ['Skip', finishPuzzle, 'ghost']]);
      later(() => sync(ply ? [moves[ply - 1].slice(0, 2), moves[ply - 1].slice(2, 4)] : undefined), 180);
      page.querySelector('.play-board').classList.add('shake');
      later(() => page.querySelector('.play-board').classList.remove('shake'), 400);
      return;
    }
    moveSound(chess.move(uciToMove(uci)));
    ply++;
    if (ply >= moves.length) return solved([orig, dest]);
    sync([orig, dest]);
    status(failed ? 'bad' : 'good', failed ? '✓ Right — keep going.' : '✓ Good move — keep going!');
    later(() => {
      playComputer();
    }, 380);
  }

  function solved(lastMove) {
    done = true;
    solvedLine = true;
    tDecided ??= performance.now();
    tEnd = performance.now();
    sync(lastMove);
    if (!failed) {
      results[idx] = true;
      combo++;
      const p = run.puzzles[idx];
      const xp = xpForPuzzle(p.rating) + (combo >= 3 ? 5 : 0);
      progress.xp += xp;
      addSessionXp(xp);
      const ms = Math.round(tEnd - tStart);
      const prevRec = puzzleRec(p.id);
      const note = !prevRec?.ok ? ' <span class="pz-tag new">+1 puzzle solved</span>'
        : ms < prevRec.best ? ` <span class="pz-tag best">New best! ${fmtSec(ms)}</span>`
        : ` <small>(best ${fmtSec(prevRec.best)})</small>`;
      status('good', `✓ Solved in ${fmtSec(ms)}! <span class="xp">+${xp} XP</span>${combo >= 3 ? ' <small>(combo bonus)</small>' : ''}${note}`);
    } else {
      status('bad', '✓ Solved, but it counts as a miss.');
    }
    renderPips();
    later(finishPuzzle, failed ? 1100 : 750);
  }

  function showSolution() {
    if (!failed) {
      failed = true;
      tDecided ??= performance.now();
      combo = 0;
      results[idx] = false;
      renderPips();
    }
    done = true;
    sawSolution = true;
    tEnd ??= performance.now();
    controls([]);
    status('bad', 'Solution:');
    const step = () => {
      if (ply >= moves.length) {
        controls([['Next puzzle →', finishPuzzle, 'primary']]);
        return;
      }
      playComputer();
      later(step, 700);
    };
    sync();
    later(step, 300);
  }

  function finishPuzzle() {
    timers.forEach(clearTimeout);
    timers = [];
    if (results[idx] === null) {
      results[idx] = false;
      combo = 0;
    }
    if (!recorded) {
      recorded = true;
      const p = run.puzzles[idx];
      const end = tEnd ?? performance.now();
      const total = Math.round(end - tStart);
      puzzleMs.push(total);
      const sk = sessionKey(p.key, p.track);
      const change = recordPuzzle(p, sk, results[idx], total);
      if (change.firstSolve) newlySolved++;
      if (change.newBest) newBests++;
      recordAttempt(sk, p.rating, results[idx], (tDecided ?? end) - tStart, p.id, {
        run: runId, moves: moveLog, first: moveLog[0]?.[1] ?? null, total,
        solved: solvedLine ? 1 : 0, sol: sawSolution ? 1 : 0, at: Date.now(),
      });
      renderStats();
      renderLive();
    }
    idx++;
    if (idx < N) return startPuzzle();
    run.finish({
      results, puzzleMs, runId, runStart, runMs: Date.now() - runStart,
      snapAtStart, newlySolved, newBests, solvedAtStart,
    });
  }


  startPuzzle();
}

// ---- Saving to your Dojo account (only inside chessdojo.club) --------------------------------
// The page around the frame (TacticsForgerFrame on the site) makes the signed-in API calls; the app
// asks it over postMessage. Progress is loaded once at start, merged with this browser's copy, and
// saved a few seconds after each change. If another device saved in between (409), the app loads
// that copy, merges and saves again.
let hostSeq = 0;
function askHost(type, body) {
  return new Promise((resolve, reject) => {
    const id = ++hostSeq;
    const done = (e) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      if (e.data?.source !== 'tactics-forger-host' || e.data.id !== id) return;
      window.removeEventListener('message', done);
      clearTimeout(timer);
      resolve(e.data);
    };
    const timer = setTimeout(() => {
      window.removeEventListener('message', done);
      reject(new Error(`host ${type} timed out`));
    }, 20000);
    window.addEventListener('message', done);
    window.parent.postMessage({ source: 'tactics-forger', id, type, body }, location.origin);
  });
}

// Combines two copies of progress (this browser's and the saved one) without losing anything:
// best stars per set, every puzzle record (most plays, any first-try solve, fastest time), every
// session (by id), the higher XP, and settings from whichever copy was saved last.
function mergeProgress(a, b) {
  const newer = (a.savedAt ?? 0) >= (b.savedAt ?? 0) ? a : b;
  const older = newer === a ? b : a;
  const out = { ...older, ...newer };
  out.xp = Math.max(a.xp ?? 0, b.xp ?? 0);
  for (const st of ['themes', 'openings', 'endgames']) {
    const merged = {};
    for (const src of [older[st] ?? {}, newer[st] ?? {}]) {
      for (const [key, tp] of Object.entries(src)) {
        const m = (merged[key] ??= { ...tp, stars: {}, failed: { ...(tp.failed ?? {}) } });
        for (const [f, n] of Object.entries(tp.stars ?? {})) m.stars[f] = Math.max(m.stars[f] ?? 0, n);
        m.start = Math.min(m.start ?? 0, tp.start ?? 0);
        m.frontier = Math.min(m.frontier ?? 0, tp.frontier ?? 0);
        if (tp.at != null) m.at = tp.at; // newer copy's place wins
        for (const [f, t] of Object.entries(tp.failed ?? {})) (m.failed ??= {})[f] = Math.max(m.failed?.[f] ?? 0, t);
      }
    }
    out[st] = merged;
  }
  const puzzles = { ...(older.puzzles ?? {}) };
  for (const [id, r] of Object.entries(newer.puzzles ?? {})) {
    const o = puzzles[id];
    if (!o) { puzzles[id] = r; continue; }
    const best = [o.best, r.best].filter((x) => x != null);
    const later = (r.last ?? 0) >= (o.last ?? 0) ? r : o;
    puzzles[id] = { ...o, ...r, n: Math.max(o.n ?? 0, r.n ?? 0), ok: Math.max(o.ok ?? 0, r.ok ?? 0),
      best: best.length ? Math.min(...best) : null, last: later.last, rev: later.rev };
  }
  out.puzzles = puzzles;
  const sessions = new Map();
  for (const s of [...(older.sessions ?? []), ...(newer.sessions ?? [])]) {
    const o = sessions.get(s.id);
    if (!o || (s.attempts?.length ?? 0) + (s.sets?.length ?? 0) >= (o.attempts?.length ?? 0) + (o.sets?.length ?? 0)) sessions.set(s.id, s);
  }
  out.sessions = [...sessions.values()].sort((x, y) => x.start - y.start);
  return out;
}

// Swaps in a new progress object and refreshes everything computed from it.
function setProgress(next) {
  progress = next;
  progress.puzzles ??= {};
  progress.sessions ??= [];
  progress.settings ??= { board: 'standard', pieces: 'standard', sound: true };
  for (const tr of Object.keys(TRACKS)) {
    for (const [key, tp] of Object.entries(progress[TRACKS[tr].store] || {})) {
      const meta = catalog(tr)?.themes.find((t) => t.key === key);
      if (meta) tp.frontier = lowestUncleared(tp, meta.sets);
    }
  }
  puzzlesVersion++;
  engineCache = { n: -1 };
  statsMemo = { n: -1 };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch {}
}

// The frame can start before the site page is listening, so say hello until it answers.
async function waitForHost(timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const hi = await Promise.race([askHost('hello'), new Promise((_, no) => setTimeout(no, 700))]);
      if (hi?.cohort && hi.cohort !== cloud.cohort) {
        cloud.cohort = hi.cohort; // for the starting-point suggestion
        if (needsStart(track) && !location.hash.includes('/play/')) route();
      }
      return true;
    } catch {}
  }
  return false;
}

// Loads the saved progress at start. This browser's copy is merged in unless it belongs to a
// different Dojo account (then the account's copy replaces it).
async function cloudLoad() {
  if (!HOSTED || !(await waitForHost())) return false;
  const res = await askHost('load').catch(() => null);
  if (!res?.ok) return false;
  cloud.username = res.username ?? null;
  cloud.cohort = res.cohort ?? cloud.cohort ?? null;
  cloud.version = res.data.version;
  const remote = res.data.progress;
  const mine = !progress.owner || progress.owner === cloud.username;
  const next = !remote ? (mine ? progress : loadDefaults()) : mine ? mergeProgress(progress, remote) : remote;
  next.owner = cloud.username;
  setProgress(next);
  cloud.ready = true;
  if (!remote || JSON.stringify(next) !== JSON.stringify(remote)) cloudSaveSoon(0);
  else markUnsynced(false);
  return true;
}
const loadDefaults = () => ({ xp: 0, themes: {}, streak: 0, lastDay: null, solved: 0 });

// Offline or a failed save: the progress stays on this device, marked as not yet saved to the
// account, and goes out when the connection is back (or on the next try, 30 s doubling to 5 min).
function cloudRetryLater() {
  cloud.retryMs = Math.min((cloud.retryMs || 15000) * 2, 300000);
  if (navigator.onLine) cloudSaveSoon(cloud.retryMs);
}
function markUnsynced(on) {
  if (offline.unsynced === on) return;
  offline.unsynced = on;
  try { on ? localStorage.setItem(UNSYNCED_KEY, '1') : localStorage.removeItem(UNSYNCED_KEY); } catch {}
  renderOfflineChip();
}
function cloudSaveSoon(delay = 4000) {
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(() => void cloudSave(), delay);
}

// The leaderboard numbers that go with each save.
function cloudSummary() {
  const p = myProfile();
  const track = (tr) => ({ solved: solvedCount(tr), rating: trackRating(tr).games ? trackRating(tr).rating : null, rank: userRank(tr)[2] });
  return {
    solved: p.solved, setsCleared: p.setsCleared, stars: p.stars, attempts: p.attempts,
    accuracy: p.accuracy, avgMs: p.avgMs, xp: Math.max(0, p.xp),
    tracks: { tactics: track('tactics'), openings: track('openings'), endgames: track('endgames') },
  };
}

async function cloudSave(retry = true) {
  if (!cloud.ready) return;
  if (cloud.saving) { cloud.again = true; return; }
  cloud.saving = true;
  try {
    const savedAt = progress.savedAt;
    const res = await askHost('save', { progress, baseVersion: cloud.version, summary: cloudSummary() });
    if (res.ok) {
      cloud.version = res.data.version;
      cloud.retryMs = 0;
      if (progress.savedAt === savedAt) markUnsynced(false);
    } else if (res.status === 409 && retry) {
      const latest = await askHost('load');
      if (latest?.ok && latest.data.progress) {
        setProgress({ ...mergeProgress(progress, latest.data.progress), owner: cloud.username });
        cloud.version = latest.data.version;
        renderStats();
      }
      cloud.saving = false;
      return cloudSave(false);
    } else {
      console.warn('Tactics Forger: save failed', res.status);
      cloudRetryLater();
    }
  } catch (err) {
    console.warn('Tactics Forger: save failed', err);
    cloudRetryLater();
  } finally {
    cloud.saving = false;
  }
  if (cloud.again) { cloud.again = false; cloudSaveSoon(1000); }
}

// ---- Offline ---------------------------------------------------------------------
// sw.js keeps the app and every puzzle file you've opened, so it loads and plays with no
// connection. "Download for offline" fetches the rest of Tactics, Endgames and your specialty
// openings ahead of time. Progress is always saved on this device first; on chessdojo.club it's
// sent to your account when the connection is back.
function offlineUrls() {
  const urls = ['data/index.json', 'data/openings/index.json', 'data/endgames/index.json'];
  for (const t of indexes.tactics?.themes ?? []) urls.push(`data/${t.key}.json`);
  for (const t of indexes.endgames?.themes ?? []) urls.push(`data/endgames/${t.key}.json`);
  for (const k of Object.values(progress.specialty ?? {})) if (k) urls.push(`data/openings/${k}.json`);
  urls.push(...['move', 'capture', 'check'].map((n) => `${ASSETS}/sounds/${n}.mp3`));
  // The board and pieces you play with (other looks are kept once you've used them online).
  const [, bg] = BOARDS[progress.settings.board] ?? BOARDS.standard;
  const [, dir, ext] = PIECES[progress.settings.pieces] ?? PIECES.standard;
  urls.push(`${ASSETS}/backgrounds/${bg}`);
  for (const c of 'wb') for (const p of 'PNBRQK') urls.push(`${ASSETS}/pieces/${dir}/${c}${p}${ext}`);
  return urls.map((u) => new URL(u, location.href).href);
}
async function checkOfflineReady() {
  if (!offline.sw || !('caches' in window)) return;
  const hits = await Promise.all(offlineUrls().map((u) => caches.match(u)));
  offline.ready = hits.every(Boolean);
  renderOfflineChip();
}
async function downloadForOffline() {
  if (offline.dl || !offline.sw) return;
  const urls = [];
  for (const u of offlineUrls()) if (!(await caches.match(u))) urls.push(u);
  // Files only get cached by the service worker once it controls this page (right after install).
  if (!navigator.serviceWorker.controller) {
    await new Promise((res) => {
      navigator.serviceWorker.addEventListener('controllerchange', res, { once: true });
      setTimeout(res, 3000);
    });
  }
  offline.dl = { done: 0, total: urls.length };
  offline.failed = false;
  renderOfflineChip();
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const u = urls[next++];
      try {
        const r = await fetch(u);
        if (!r.ok) throw new Error(r.status);
        await r.arrayBuffer(); // the service worker stores it on the way through
      } catch { offline.failed = true; }
      offline.dl.done++;
      renderOfflineChip();
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  offline.dl = null;
  await checkOfflineReady();
  if (offline.ready) toast('Ready to play offline ✓');
  else if (offline.failed) toast('Some puzzles didn\'t download. Try again when the connection is better.');
}
function offlineChip() {
  const st = !offline.online ? ['off', '⚡', 'Offline']
    : offline.dl ? ['dl', '⬇', `${Math.round((offline.dl.done / Math.max(1, offline.dl.total)) * 100)}%`]
    : offline.ready ? ['ready', '✓', 'Offline']
    : offline.sw ? ['get', '⬇', 'Offline'] : null;
  if (!st) return '<button type="button" class="stat offline-chip" data-offline hidden></button>'; // filled in once the worker is ready
  return `<button type="button" class="stat offline-chip oc-${st[0]}" data-offline title="Offline play">${st[1]} <b>${st[2]}</b></button>`;
}
function renderOfflineChip() {
  const html = offlineChip();
  document.querySelectorAll('[data-offline]').forEach((b) => (b.outerHTML = html));
  if (offline.open) renderOfflineCard();
}
function renderOfflineCard() {
  let card = document.getElementById('offlineCard');
  if (!offline.open) return card?.remove();
  if (!card) {
    card = el('<div id="offlineCard" class="offline-card" role="dialog" aria-label="Offline play"></div>');
    document.body.append(card);
  }
  const acct = !HOSTED ? 'Your progress is saved on this device.'
    : !offline.online ? 'Your progress is saved on this device and goes to your Dojo account when you\'re back online.'
    : cloud.ready && !offline.unsynced ? 'Your progress is saved to your Dojo account.'
    : cloud.ready ? 'Saving your latest progress to your Dojo account…'
    : 'Your progress is saved on this device.';
  const body = !offline.sw
    ? '<p>This browser can\'t keep the puzzles for offline use.</p>'
    : offline.dl
      ? `<p>Downloading puzzles… ${offline.dl.done}/${offline.dl.total}</p><div class="rr-bar small"><div style="width:${(offline.dl.done / Math.max(1, offline.dl.total)) * 100}%"></div></div>`
      : offline.ready
        ? '<p><b>✓ Ready to play offline.</b> Tactics, Endgames and your specialty openings are on this device. Other openings work offline once you\'ve opened them.</p>'
        : `<p>Puzzles you've already opened work offline. Download the rest of Tactics, Endgames and your specialty openings (about 5 MB) to play anywhere.</p>
           <button type="button" class="btn primary" id="offlineGo" ${offline.online ? '' : 'disabled'}>⬇ Download for offline</button>`;
  card.innerHTML = `<div class="oc-head"><b>${offline.online ? 'Offline play' : '⚡ You\'re offline'}</b><button type="button" class="oc-close" aria-label="Close">✕</button></div>
    ${body}<p class="oc-acct">${acct}</p>`;
  card.querySelector('.oc-close').onclick = () => { offline.open = false; renderOfflineCard(); };
  const go = card.querySelector('#offlineGo');
  if (go) go.onclick = () => downloadForOffline();
}
function setupOffline() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-offline]')) {
      offline.open = !offline.open;
      renderOfflineCard();
    } else if (offline.open && !e.target.closest('#offlineCard')) {
      offline.open = false;
      renderOfflineCard();
    }
  });
  const net = () => { offline.online = navigator.onLine; renderOfflineChip(); };
  window.addEventListener('online', net);
  window.addEventListener('offline', net);
  if (progress.settings.sound) ['move', 'capture', 'check'].forEach(loadSound);
  if (!('serviceWorker' in navigator) || !('caches' in window)) return renderOfflineChip();
  navigator.serviceWorker.register('sw.js').then(async (reg) => {
    // Older app versions on the site live in other folders, each with its own worker: drop them.
    for (const r of await navigator.serviceWorker.getRegistrations()) {
      if (r !== reg && r.scope.includes('/tactics-forger/') && r.scope !== reg.scope) r.unregister();
    }
    await navigator.serviceWorker.ready;
    offline.sw = true;
    checkOfflineReady();
  }).catch((err) => { console.warn('Tactics Forger: offline support unavailable', err); renderOfflineChip(); });
}

// ---- Boot ----------------------------------------------------------------------
(async () => {
  document.querySelector('.brand-mark').outerHTML = LOGO_SVG;
  const sideLogo = document.querySelector('.side-logo');
  // Own gradient ids: the header copy can be display:none, and shared ids would render blank here.
  if (sideLogo) sideLogo.innerHTML = LOGO_SVG.replace('width="36" height="36"', 'width="76" height="76"').replaceAll('lg-', 'lgs-');
  const fav = document.createElement('link');
  fav.rel = 'icon';
  fav.href = LOGO_DATA_URI;
  document.head.append(fav);
  try {
    indexes.tactics = await fetch('data/index.json').then((r) => r.json());
    catalogs.openings = await fetch('data/openings/index.json').then((r) => r.json()).catch(() => null);
    if (catalogs.openings) refreshSpecialty();
    indexes.endgames = await fetch('data/endgames/index.json').then((r) => r.json()).catch(() => null);
    setTrack('tactics');
  } catch {
    $app.innerHTML = '<div class="loading">Could not load data/index.json. Serve this folder over HTTP (see README).</div>';
    return;
  }
  await migrateProgress();
  backfillPuzzles();
  for (const tr of Object.keys(TRACKS)) {
    if (!indexes[tr]) continue;
    for (const [key, tp] of Object.entries(progress[TRACKS[tr].store] || {})) {
      const meta = catalog(tr).themes.find((t) => t.key === key);
      if (meta) tp.frontier = lowestUncleared(tp, meta.sets);
    }
  }
  saveProgress();
  renderStats();
  route();
  setupOffline();
  // Pinned rows (the ladder's Continue bar) sit just under the top bar, whose height changes as it wraps.
  const topbar = document.querySelector('.topbar');
  if (topbar && 'ResizeObserver' in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`)).observe(topbar);
  }
  // On chessdojo.club: bring in the progress saved to the account, then redraw with it. If that
  // fails (offline), keep playing on this device and try again once the connection is back.
  const connect = async () => {
    if (cloud.ready || cloud.connecting) return;
    cloud.connecting = true;
    const ok = await cloudLoad().catch(() => false);
    cloud.connecting = false;
    if (ok) {
      renderStats();
      if (!location.hash.includes('/play/')) route(); // don't restart a puzzle already in progress
    }
  };
  await connect();
  if (HOSTED) {
    window.addEventListener('online', () => (cloud.ready ? cloudSaveSoon(500) : connect()));
    setInterval(() => { if (!cloud.ready && navigator.onLine) connect(); }, 60000);
  }
})();

// Set numbers are positions in a theme's ladder, so saved stars and your place must be
// remapped whenever the set layout changes. Old layouts are kept in data/layout-v1.json.
async function migrateProgress() {
  const store = progress.themes || {};
  const hasProgress = Object.keys(store).length > 0;
  if (!hasProgress) {
    progress.dataMin = index.minRating;
    progress.tacticsLayout = index.layout ?? 1;
    progress.castlingMigrated = true;
    return saveProgress();
  }
  let v1 = null;
  // Castling was briefly missing from layout 2, so a save migrated then may still hold layout-1 Castling sets.
  const castlingPending = progress.tacticsLayout === 2 && store.castling && !store.castling.layout2 && !progress.castlingMigrated;
  const needsV1 = castlingPending || (progress.dataMin ?? 600) !== 400 || (progress.tacticsLayout ?? 1) !== (index.layout ?? 1);
  if (needsV1) v1 = await fetch('data/layout-v1.json').then((r) => r.json()).catch(() => null);
  if (!v1) {
    progress.castlingMigrated = true; // nothing old left to remap
    return saveProgress();
  }

  // 1) Very old saves started at 600: shift onto layout 1 (which starts at 400).
  if ((progress.dataMin ?? 600) > 400) {
    for (const [key, tp] of Object.entries(store)) {
      const off = sum((v1.themes[key] || []).filter(([min]) => min < (progress.dataMin ?? 600)).map(([, n]) => n));
      if (!off) continue;
      tp.stars = Object.fromEntries(Object.entries(tp.stars).map(([f, st]) => [Number(f) + off, st]));
      tp.frontier += off;
      tp.start = (tp.start ?? 0) + off;
    }
    progress.dataMin = 400;
  }

  // 2) Layout 1 (400–2000, 10 sets per rung) -> layout 2 (each stage has its own range, 5 sets per rung).
  //    Map by rating rung: clearing k of a rung's old sets clears the same share of its new sets.
  const remapAll = (progress.tacticsLayout ?? 1) === 1 && (index.layout ?? 1) === 2;
  if (remapAll || castlingPending) {
    const locate = (bandSets, flat) => {
      let acc = 0;
      for (const [min, n] of bandSets) {
        if (flat < acc + n) return { min, n: flat - acc, count: n };
        acc += n;
      }
      return null;
    };
    for (const [key, tp] of Object.entries(store)) {
      if (!remapAll && key !== 'castling') continue;
      const oldBands = v1.themes[key];
      const meta = index.themes.find((t) => t.key === key);
      if (!oldBands || !meta) continue;
      const newStart = {};
      let acc = 0;
      for (const [min, n] of meta.bandSets) { newStart[min] = { at: acc, n }; acc += n; }
      // Cleared sets and best stars per rung.
      const perRung = {};
      for (const [f, st] of Object.entries(tp.stars)) {
        if (!(st > 0)) continue;
        const loc = locate(oldBands, Number(f));
        if (!loc) continue;
        const r = (perRung[loc.min] ??= { k: 0, best: 0, count: loc.count });
        r.k++; r.best = Math.max(r.best, st);
      }
      const stars = {};
      for (const [min, r] of Object.entries(perRung)) {
        const nb = newStart[min];
        if (!nb) continue; // rung no longer in this theme's range
        const k = Math.min(nb.n, Math.ceil((r.k * nb.n) / r.count));
        for (let i = 0; i < k; i++) stars[nb.at + i] = r.best;
      }
      // Your place: same rung, same share of the way through it.
      const loc = locate(oldBands, tp.frontier);
      let frontier;
      if (!loc) frontier = meta.sets; // finished the old ladder
      else if (newStart[loc.min]) frontier = newStart[loc.min].at + Math.floor((loc.n * newStart[loc.min].n) / loc.count);
      else frontier = loc.min < meta.min ? 0 : meta.sets;
      while (stars[frontier] > 0) frontier++;
      tp.stars = stars;
      tp.frontier = Math.min(frontier, meta.sets);
      tp.start = 0;
      tp.layout2 = true;
    }
    progress.tacticsLayout = 2;
    progress.castlingMigrated = true;
  }
  saveProgress();
}
