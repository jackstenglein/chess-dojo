import { dojoCohorts, getCohortRangeInt } from '../database/cohort';
import { RatingSystem } from '../database/ratingSystem';

/**
 * Returns true if the given rating system is a custom system.
 * @param ratingSystem The rating system to check.
 */
export function isCustom(ratingSystem: RatingSystem | string | undefined): boolean {
    return (
        ratingSystem === RatingSystem.Custom ||
        ratingSystem === RatingSystem.Custom2 ||
        ratingSystem === RatingSystem.Custom3
    );
}

export function getRatingBoundary(
    cohort: string,
    ratingSystem: RatingSystem,
    boundaries: Record<string, Record<RatingSystem, number>> = ratingBoundaries,
): number | undefined {
    const cohortBoundaries = boundaries[cohort];
    if (!cohortBoundaries) {
        return undefined;
    }

    const boundary = cohortBoundaries[ratingSystem];
    if (boundary <= 0) {
        return undefined;
    }
    return boundary;
}

/**
 * Returns the minimum rating for the given cohort and rating system.
 * @param cohort The cohort to get the minimum rating for.
 * @param ratingSystem The rating system to get the minimum rating for.
 * @returns The minimum rating for the given cohort and rating system.
 */
export function getMinRatingBoundary(
    cohort: string,
    ratingSystem: RatingSystem,
    boundaries: Record<string, Record<RatingSystem, number>> = ratingBoundaries,
): number {
    const cohortIdx = dojoCohorts.findIndex((c) => c === cohort);
    if (cohortIdx <= 0) {
        return 0;
    }
    return getRatingBoundary(dojoCohorts[cohortIdx - 1], ratingSystem, boundaries) || 0;
}

export function getNormalizedRating(
    rating: number,
    ratingSystem: RatingSystem,
    boundaries: Record<string, Record<RatingSystem, number>> = ratingBoundaries,
): number {
    for (const cohort of dojoCohorts) {
        const x2 = getRatingBoundary(cohort, ratingSystem, boundaries);
        if (!x2) {
            continue;
        }

        if (x2 >= rating) {
            const x1 = getMinRatingBoundary(cohort, ratingSystem, boundaries);

            let [y1, y2] = getCohortRangeInt(cohort);

            if (y1 === -1) {
                y1 = 0;
            }
            if (y2 === -1) {
                y2 = 0;
            }

            const result = ((y2 - y1) / (x2 - x1)) * (rating - x1) + y1;
            return Math.round(result * 10) / 10;
        }
    }

    // We are in the 2400+ cohort if we make it here, so we just extrapolate from the 2300-2400 line
    const x1 = getMinRatingBoundary('2300-2400', ratingSystem, boundaries);
    const x2 = getRatingBoundary('2300-2400', ratingSystem, boundaries) || 0;
    const y1 = 2300;
    const y2 = 2400;
    const result = ((y2 - y1) / (x2 - x1)) * (rating - x1) + y1;
    return Math.round(result * 10) / 10;
}
// Assume that custom ratings boundaries are already normalized.
export const ratingBoundaries: Record<string, Record<RatingSystem, number>> = {
    '0-300': {
        [RatingSystem.Chesscom]: 550,
        [RatingSystem.Lichess]: 1250,
        [RatingSystem.Fide]: 0,
        [RatingSystem.Uscf]: 350,
        [RatingSystem.Ecf]: 400,
        [RatingSystem.Cfc]: 350,
        [RatingSystem.Dwz]: 450,
        [RatingSystem.Acf]: 300,
        [RatingSystem.Knsb]: 400,
        [RatingSystem.Custom]: 300,
        [RatingSystem.Custom2]: 300,
        [RatingSystem.Custom3]: 300,
    },
    '300-400': {
        [RatingSystem.Chesscom]: 650,
        [RatingSystem.Lichess]: 1310,
        [RatingSystem.Fide]: 0,
        [RatingSystem.Uscf]: 460,
        [RatingSystem.Ecf]: 625,
        [RatingSystem.Cfc]: 460,
        [RatingSystem.Dwz]: 540,
        [RatingSystem.Acf]: 395,
        [RatingSystem.Knsb]: 600,
        [RatingSystem.Custom]: 400,
        [RatingSystem.Custom2]: 400,
        [RatingSystem.Custom3]: 400,
    },
    '400-500': {
        [RatingSystem.Chesscom]: 750,
        [RatingSystem.Lichess]: 1370,
        [RatingSystem.Fide]: 0,
        [RatingSystem.Uscf]: 570,
        [RatingSystem.Ecf]: 850,
        [RatingSystem.Cfc]: 570,
        [RatingSystem.Dwz]: 630,
        [RatingSystem.Acf]: 490,
        [RatingSystem.Knsb]: 800,
        [RatingSystem.Custom]: 500,
        [RatingSystem.Custom2]: 500,
        [RatingSystem.Custom3]: 500,
    },
    '500-600': {
        [RatingSystem.Chesscom]: 850,
        [RatingSystem.Lichess]: 1435,
        [RatingSystem.Fide]: 0,
        [RatingSystem.Uscf]: 680,
        [RatingSystem.Ecf]: 1000,
        [RatingSystem.Cfc]: 680,
        [RatingSystem.Dwz]: 725,
        [RatingSystem.Acf]: 585,
        [RatingSystem.Knsb]: 1000,
        [RatingSystem.Custom]: 600,
        [RatingSystem.Custom2]: 600,
        [RatingSystem.Custom3]: 600,
    },
    '600-700': {
        [RatingSystem.Chesscom]: 950,
        [RatingSystem.Lichess]: 1500,
        [RatingSystem.Fide]: 0,
        [RatingSystem.Uscf]: 790,
        [RatingSystem.Ecf]: 1130,
        [RatingSystem.Cfc]: 780,
        [RatingSystem.Dwz]: 815,
        [RatingSystem.Acf]: 680,
        [RatingSystem.Knsb]: 1140,
        [RatingSystem.Custom]: 700,
        [RatingSystem.Custom2]: 700,
        [RatingSystem.Custom3]: 700,
    },
    '700-800': {
        [RatingSystem.Chesscom]: 1050,
        [RatingSystem.Lichess]: 1550,
        [RatingSystem.Fide]: 0,
        [RatingSystem.Uscf]: 900,
        [RatingSystem.Ecf]: 1210,
        [RatingSystem.Cfc]: 880,
        [RatingSystem.Dwz]: 920,
        [RatingSystem.Acf]: 775,
        [RatingSystem.Knsb]: 1280,
        [RatingSystem.Custom]: 800,
        [RatingSystem.Custom2]: 800,
        [RatingSystem.Custom3]: 800,
    },
    '800-900': {
        [RatingSystem.Chesscom]: 1150,
        [RatingSystem.Lichess]: 1600,
        [RatingSystem.Fide]: 0,
        [RatingSystem.Uscf]: 1010,
        [RatingSystem.Ecf]: 1270,
        [RatingSystem.Cfc]: 980,
        [RatingSystem.Dwz]: 1025,
        [RatingSystem.Acf]: 870,
        [RatingSystem.Knsb]: 1400,
        [RatingSystem.Custom]: 900,
        [RatingSystem.Custom2]: 900,
        [RatingSystem.Custom3]: 900,
    },
    '900-1000': {
        [RatingSystem.Fide]: 1450,
        [RatingSystem.Uscf]: 1120,
        [RatingSystem.Chesscom]: 1250,
        [RatingSystem.Lichess]: 1665,
        [RatingSystem.Ecf]: 1325,
        [RatingSystem.Cfc]: 1090,
        [RatingSystem.Dwz]: 1110,
        [RatingSystem.Acf]: 990,
        [RatingSystem.Knsb]: 1450,
        [RatingSystem.Custom]: 1000,
        [RatingSystem.Custom2]: 1000,
        [RatingSystem.Custom3]: 1000,
    },
    '1000-1100': {
        [RatingSystem.Fide]: 1500,
        [RatingSystem.Uscf]: 1230,
        [RatingSystem.Chesscom]: 1350,
        [RatingSystem.Lichess]: 1730,
        [RatingSystem.Ecf]: 1390,
        [RatingSystem.Cfc]: 1200,
        [RatingSystem.Dwz]: 1185,
        [RatingSystem.Acf]: 1100,
        [RatingSystem.Knsb]: 1500,
        [RatingSystem.Custom]: 1100,
        [RatingSystem.Custom2]: 1100,
        [RatingSystem.Custom3]: 1100,
    },
    '1100-1200': {
        [RatingSystem.Fide]: 1550,
        [RatingSystem.Uscf]: 1330,
        [RatingSystem.Chesscom]: 1450,
        [RatingSystem.Lichess]: 1795,
        [RatingSystem.Ecf]: 1455,
        [RatingSystem.Cfc]: 1300,
        [RatingSystem.Dwz]: 1260,
        [RatingSystem.Acf]: 1210,
        [RatingSystem.Knsb]: 1550,
        [RatingSystem.Custom]: 1200,
        [RatingSystem.Custom2]: 1200,
        [RatingSystem.Custom3]: 1200,
    },
    '1200-1300': {
        [RatingSystem.Fide]: 1600,
        [RatingSystem.Uscf]: 1420,
        [RatingSystem.Chesscom]: 1550,
        [RatingSystem.Lichess]: 1850,
        [RatingSystem.Ecf]: 1535,
        [RatingSystem.Cfc]: 1390,
        [RatingSystem.Dwz]: 1335,
        [RatingSystem.Acf]: 1320,
        [RatingSystem.Knsb]: 1600,
        [RatingSystem.Custom]: 1300,
        [RatingSystem.Custom2]: 1300,
        [RatingSystem.Custom3]: 1300,
    },
    '1300-1400': {
        [RatingSystem.Fide]: 1650,
        [RatingSystem.Uscf]: 1510,
        [RatingSystem.Chesscom]: 1650,
        [RatingSystem.Lichess]: 1910,
        [RatingSystem.Ecf]: 1595,
        [RatingSystem.Cfc]: 1480,
        [RatingSystem.Dwz]: 1410,
        [RatingSystem.Acf]: 1415,
        [RatingSystem.Knsb]: 1650,
        [RatingSystem.Custom]: 1400,
        [RatingSystem.Custom2]: 1400,
        [RatingSystem.Custom3]: 1400,
    },
    '1400-1500': {
        [RatingSystem.Fide]: 1700,
        [RatingSystem.Uscf]: 1600,
        [RatingSystem.Chesscom]: 1750,
        [RatingSystem.Lichess]: 1970,
        [RatingSystem.Ecf]: 1665,
        [RatingSystem.Cfc]: 1570,
        [RatingSystem.Dwz]: 1480,
        [RatingSystem.Acf]: 1510,
        [RatingSystem.Knsb]: 1700,
        [RatingSystem.Custom]: 1500,
        [RatingSystem.Custom2]: 1500,
        [RatingSystem.Custom3]: 1500,
    },
    '1500-1600': {
        [RatingSystem.Fide]: 1750,
        [RatingSystem.Uscf]: 1675,
        [RatingSystem.Chesscom]: 1850,
        [RatingSystem.Lichess]: 2030,
        [RatingSystem.Ecf]: 1735,
        [RatingSystem.Cfc]: 1645,
        [RatingSystem.Dwz]: 1560,
        [RatingSystem.Acf]: 1605,
        [RatingSystem.Knsb]: 1750,
        [RatingSystem.Custom]: 1600,
        [RatingSystem.Custom2]: 1600,
        [RatingSystem.Custom3]: 1600,
    },
    '1600-1700': {
        [RatingSystem.Fide]: 1800,
        [RatingSystem.Uscf]: 1750,
        [RatingSystem.Chesscom]: 1950,
        [RatingSystem.Lichess]: 2090,
        [RatingSystem.Ecf]: 1805,
        [RatingSystem.Cfc]: 1730,
        [RatingSystem.Dwz]: 1640,
        [RatingSystem.Acf]: 1700,
        [RatingSystem.Knsb]: 1800,
        [RatingSystem.Custom]: 1700,
        [RatingSystem.Custom2]: 1700,
        [RatingSystem.Custom3]: 1700,
    },
    '1700-1800': {
        [RatingSystem.Fide]: 1850,
        [RatingSystem.Uscf]: 1825,
        [RatingSystem.Chesscom]: 2050,
        [RatingSystem.Lichess]: 2150,
        [RatingSystem.Ecf]: 1875,
        [RatingSystem.Cfc]: 1825,
        [RatingSystem.Dwz]: 1720,
        [RatingSystem.Acf]: 1790,
        [RatingSystem.Knsb]: 1850,
        [RatingSystem.Custom]: 1800,
        [RatingSystem.Custom2]: 1800,
        [RatingSystem.Custom3]: 1800,
    },
    '1800-1900': {
        [RatingSystem.Fide]: 1910,
        [RatingSystem.Uscf]: 1930,
        [RatingSystem.Chesscom]: 2165,
        [RatingSystem.Lichess]: 2225,
        [RatingSystem.Ecf]: 1955,
        [RatingSystem.Cfc]: 1925,
        [RatingSystem.Dwz]: 1815,
        [RatingSystem.Acf]: 1900,
        [RatingSystem.Knsb]: 1910,
        [RatingSystem.Custom]: 1900,
        [RatingSystem.Custom2]: 1900,
        [RatingSystem.Custom3]: 1900,
    },
    '1900-2000': {
        [RatingSystem.Fide]: 2000,
        [RatingSystem.Uscf]: 2055,
        [RatingSystem.Chesscom]: 2275,
        [RatingSystem.Lichess]: 2310,
        [RatingSystem.Ecf]: 2065,
        [RatingSystem.Cfc]: 2060,
        [RatingSystem.Dwz]: 1940,
        [RatingSystem.Acf]: 2000,
        [RatingSystem.Knsb]: 2000,
        [RatingSystem.Custom]: 2000,
        [RatingSystem.Custom2]: 2000,
        [RatingSystem.Custom3]: 2000,
    },
    '2000-2100': {
        [RatingSystem.Fide]: 2100,
        [RatingSystem.Uscf]: 2185,
        [RatingSystem.Chesscom]: 2360,
        [RatingSystem.Lichess]: 2370,
        [RatingSystem.Ecf]: 2165,
        [RatingSystem.Cfc]: 2185,
        [RatingSystem.Dwz]: 2070,
        [RatingSystem.Acf]: 2105,
        [RatingSystem.Knsb]: 2100,
        [RatingSystem.Custom]: 2100,
        [RatingSystem.Custom2]: 2100,
        [RatingSystem.Custom3]: 2100,
    },
    '2100-2200': {
        [RatingSystem.Fide]: 2200,
        [RatingSystem.Uscf]: 2290,
        [RatingSystem.Chesscom]: 2425,
        [RatingSystem.Lichess]: 2410,
        [RatingSystem.Ecf]: 2260,
        [RatingSystem.Cfc]: 2290,
        [RatingSystem.Dwz]: 2185,
        [RatingSystem.Acf]: 2215,
        [RatingSystem.Knsb]: 2200,
        [RatingSystem.Custom]: 2200,
        [RatingSystem.Custom2]: 2200,
        [RatingSystem.Custom3]: 2200,
    },
    '2200-2300': {
        [RatingSystem.Fide]: 2300,
        [RatingSystem.Uscf]: 2395,
        [RatingSystem.Chesscom]: 2485,
        [RatingSystem.Lichess]: 2440,
        [RatingSystem.Ecf]: 2360,
        [RatingSystem.Cfc]: 2395,
        [RatingSystem.Dwz]: 2285,
        [RatingSystem.Acf]: 2330,
        [RatingSystem.Knsb]: 2300,
        [RatingSystem.Custom]: 2300,
        [RatingSystem.Custom2]: 2300,
        [RatingSystem.Custom3]: 2300,
    },
    '2300-2400': {
        [RatingSystem.Fide]: 2400,
        [RatingSystem.Uscf]: 2500,
        [RatingSystem.Chesscom]: 2550,
        [RatingSystem.Lichess]: 2470,
        [RatingSystem.Ecf]: 2460,
        [RatingSystem.Cfc]: 2500,
        [RatingSystem.Dwz]: 2385,
        [RatingSystem.Acf]: 2450,
        [RatingSystem.Knsb]: 2400,
        [RatingSystem.Custom]: 2400,
        [RatingSystem.Custom2]: 2400,
        [RatingSystem.Custom3]: 2400,
    },
};
