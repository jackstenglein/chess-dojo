#!/usr/bin/env node
/**
 * Builds the bundled puzzle pack for the /rush landing page.
 *
 * Source:  Lichess open puzzle database, https://database.lichess.org/#puzzles
 * Licence: CC0 (public domain)
 * Built:   2026-11-13, from the database file dated 2026-11-01
 *
 * The page lets logged-out visitors play Dojo Rush, and POST /puzzle/rush/next needs
 * a login, so the demo ships its own small set of puzzles. The app's corpus is built
 * from the same database by scripts/lichess_puzzle_upload.py, and this script follows
 * its rules so a demo run feels like a real one:
 *   - mate puzzles are left out,
 *   - the rating deviation is at most 100,
 *   - the Lichess rating is converted to the Dojo scale (Lichess 1250 is Dojo 300).
 * On top of that the pack keeps only well-played, well-liked puzzles of at most four
 * moves for the solver.
 *
 * The database is one ~310 MB file written by pzstd: a chain of independent zstd
 * frames of about 9 MB, each announced by a 12-byte skippable frame that holds its
 * size. This script downloads one frame at a time with HTTP range requests and stops
 * as soon as every rating band is full, so it never fetches the whole file. Rows are
 * ordered by puzzle id, so the first rows are a fair sample of the whole file.
 *
 * Usage, from the frontend folder (needs Node 22.15+ for zstd):
 *     node scripts/build-rush-pack.mjs
 */
/* eslint-disable no-console -- a command-line script reports its result on stdout */
import { Chess } from '@jackstenglein/chess';
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync, zstdDecompressSync } from 'node:zlib';

const SOURCE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const OUTPUT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../src/app/[locale]/rush/pack/puzzlePack.json',
);

/** Copied from scripts/lichess_puzzle_upload.py. Keep the two in step. */
const LICHESS_BOUNDARIES = [
    1250, 1310, 1370, 1435, 1500, 1550, 1600, 1665, 1730, 1795, 1850, 1910, 1970, 2030, 2090, 2150,
    2225, 2310, 2370, 2410, 2440, 2470,
];
const DOJO_COHORTS = [
    [0, 300],
    ...Array.from({ length: 21 }, (_, i) => [300 + i * 100, 400 + i * 100]),
];
const MAX_RATING_DEVIATION = 100;

/** Dojo rating bands, each 100 points wide, and how many puzzles each one gets. */
const BAND_SIZE = 100;
/**
 * A run starts at a search rating of 300 and the first window reaches down to 250,
 * so the pack keeps some puzzles just under the start rating, as the app's corpus does.
 */
const LEAD_IN_MIN = 250;
const LEAD_IN_TARGET = 20;
/** Every band in this range must be full before the script stops. */
const REQUIRED_MIN = 300;
const REQUIRED_MAX = 2600;
/** Three runs spend most of their time below this rating, so those bands get more. */
const BUSY_MAX = 1500;
const BUSY_TARGET = 30;
const REQUIRED_TARGET = 25;
/** The ladder tops out at 3500. These bands are filled as far as the sample allows. */
const EXTRA_MAX = 3500;
const EXTRA_TARGET = 8;
/** Stop looking for the optional bands after this many frames of the file. */
const EXTRA_FRAME_BUDGET = 3;
const HARD_FRAME_BUDGET = 8;
const SKIPPABLE_MAGIC = 0x184d2a50;
const SKIPPABLE_HEADER_BYTES = 12;
const MAX_PLIES = 8;

/** Converts a Lichess puzzle rating to the Dojo scale, as the app's upload script does. */
function normalizeRating(lichessRating) {
    for (let i = 0; i < LICHESS_BOUNDARIES.length; i++) {
        const x2 = LICHESS_BOUNDARIES[i];
        if (x2 < lichessRating) continue;
        const x1 = i === 0 ? 0 : LICHESS_BOUNDARIES[i - 1];
        const [y1, y2] = DOJO_COHORTS[i];
        return Math.round(((y2 - y1) / (x2 - x1)) * (lichessRating - x1) + y1);
    }
    const x1 = LICHESS_BOUNDARIES.at(-2);
    const x2 = LICHESS_BOUNDARIES.at(-1);
    return Math.round((100 / (x2 - x1)) * (lichessRating - x1) + 2300);
}

/** The lead-in puzzles share one bucket. Every other band is 100 points wide. */
function bandOf(rating) {
    if (rating >= LEAD_IN_MIN && rating < REQUIRED_MIN) return LEAD_IN_MIN;
    return Math.floor(rating / BAND_SIZE) * BAND_SIZE;
}

function targetFor(band) {
    if (band === LEAD_IN_MIN) return LEAD_IN_TARGET;
    if (band < REQUIRED_MIN || band >= EXTRA_MAX) return 0;
    if (band < BUSY_MAX) return BUSY_TARGET;
    if (band < REQUIRED_MAX) return REQUIRED_TARGET;
    return EXTRA_TARGET;
}

/** Quality bars. The sparse top of the rating range gets a looser bar. */
function passesQuality({ rating, deviation, popularity, plays }) {
    if (deviation > MAX_RATING_DEVIATION) return false;
    if (rating >= REQUIRED_MAX) {
        return popularity >= 60 && plays >= 30;
    }
    return deviation <= 85 && popularity >= 85 && plays >= 300;
}

/** Replays the solution. Returns false if a move is illegal or the line ends in mate. */
function isPlayableNonMate(fen, moves) {
    try {
        const chess = new Chess({ fen });
        for (const move of moves) {
            if (!chess.move(move)) return false;
        }
        return !chess.isCheckmate();
    } catch {
        return false;
    }
}

async function fetchRange(from, to) {
    const response = await fetch(SOURCE_URL, { headers: { Range: `bytes=${from}-${to}` } });
    if (response.status !== 206) {
        throw new Error(`Range request failed: ${response.status}`);
    }
    return {
        bytes: Buffer.from(await response.arrayBuffer()),
        lastModified: response.headers.get('last-modified') ?? 'unknown',
    };
}

/** Yields the decompressed text of each frame, in file order. */
async function* readFrames() {
    let offset = 0;
    for (let frame = 0; frame < HARD_FRAME_BUDGET; frame++) {
        const header = await fetchRange(offset, offset + SKIPPABLE_HEADER_BYTES - 1);
        if (header.bytes.readUInt32LE(0) !== SKIPPABLE_MAGIC) {
            throw new Error(`Expected a pzstd frame header at byte ${offset}`);
        }
        const frameBytes = header.bytes.readUInt32LE(8);
        const start = offset + SKIPPABLE_HEADER_BYTES;
        const body = await fetchRange(start, start + frameBytes - 1);
        offset = start + frameBytes;
        yield {
            text: zstdDecompressSync(body.bytes).toString('utf8'),
            compressedBytes: offset,
            lastModified: header.lastModified,
        };
    }
}

async function main() {
    const bands = new Map();
    let rows = 0;
    let frames = 0;
    let compressedBytes = 0;
    let sourceLastModified = 'unknown';
    let carry = '';

    const isFull = (band) => (bands.get(band)?.length ?? 0) >= targetFor(band);
    const allFull = (from, to) => {
        for (let band = from; band < to; band += BAND_SIZE) {
            if (!isFull(band)) return false;
        }
        return true;
    };

    const consider = (line) => {
        const [id, fen, moveText, ratingText, deviationText, popularityText, playsText, themeText] =
            line.split(',');
        const lichessRating = Number(ratingText);
        if (!Number.isFinite(lichessRating)) return;

        const rating = normalizeRating(lichessRating);
        const band = bandOf(rating);
        const themes = (themeText ?? '').split(' ').filter(Boolean);
        const moves = (moveText ?? '').split(' ').filter(Boolean);

        const wanted =
            targetFor(band) > 0 &&
            !isFull(band) &&
            moves.length >= 2 &&
            moves.length % 2 === 0 &&
            moves.length <= MAX_PLIES &&
            !themes.some((theme) => theme.toLowerCase().includes('mate')) &&
            passesQuality({
                rating,
                deviation: Number(deviationText),
                popularity: Number(popularityText),
                plays: Number(playsText),
            });

        if (wanted && isPlayableNonMate(fen, moves)) {
            bands.set(band, [...(bands.get(band) ?? []), { id, fen, moves, rating, themes }]);
        }
    };

    for await (const frame of readFrames()) {
        frames += 1;
        compressedBytes = frame.compressedBytes;
        sourceLastModified = frame.lastModified;

        const lines = (carry + frame.text).split('\n');
        carry = lines.pop() ?? '';
        for (const line of lines) {
            rows += 1;
            if (rows > 1) consider(line); // row 1 is the header
        }

        const requiredDone = isFull(LEAD_IN_MIN) && allFull(REQUIRED_MIN, REQUIRED_MAX);
        const extraDone = allFull(REQUIRED_MAX, EXTRA_MAX);
        if (requiredDone && (extraDone || frames >= EXTRA_FRAME_BUDGET)) break;
    }

    const puzzles = [...bands.values()]
        .flat()
        .sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));

    const pack = {
        source: SOURCE_URL,
        licence: 'CC0',
        sourceLastModified,
        builtAt: new Date().toISOString().slice(0, 10),
        ratingScale: 'ChessDojo (converted from Lichess as in scripts/lichess_puzzle_upload.py)',
        puzzles,
    };
    const json = JSON.stringify(pack);
    writeFileSync(OUTPUT, `${json}\n`);

    console.log(
        `Read ${rows} rows in ${frames} frame(s), ${(compressedBytes / 1024 / 1024).toFixed(1)} MB.`,
    );
    for (const band of [...bands.keys()].sort((a, b) => a - b)) {
        const top = band === LEAD_IN_MIN ? REQUIRED_MIN - 1 : band + BAND_SIZE - 1;
        console.log(`${band}-${top}: ${bands.get(band).length} of ${targetFor(band)}`);
    }
    console.log(
        `${puzzles.length} puzzles, ${(json.length / 1024).toFixed(1)} KB, ` +
            `${(gzipSync(json).length / 1024).toFixed(1)} KB gzipped -> ${OUTPUT}`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
