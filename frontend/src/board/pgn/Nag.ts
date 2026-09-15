import { compareNags, Nag, NagDetails, nags } from '@jackstenglein/chess-dojo-common/src/pgn/nag';
import { nagSvgs } from './NagIcon';

export { compareNags, nags };
export type { Nag, NagDetails };

export function getStandardNag(nag: string): Nag {
    switch (nag) {
        case '$11':
            return '$10';
        case '$12':
            return '$10';
        case '$23':
            return '$22';
        case '$27':
            return '$26';
        case '$33':
            return '$32';
        case '$37':
            return '$36';
        case '$41':
            return '$40';
        case '$45':
            return '$44';
        case '$133':
            return '$132';
        case '$139':
            return '$138';
        case '$256':
            return '$13';

        default:
            return nag;
    }
}

export const badMoveNags: Nag[] = ['$6', '$2', '$4'];
export const goodMoveNags: Nag[] = ['$3', '$1', '$5'];

export const moveNags: Nag[] = ['$3', '$1', '$5', '$6', '$2', '$4', '$7'];
export const evalNags: Nag[] = ['$13', '$18', '$16', '$14', '$10', '$15', '$17', '$19'];
export const positionalNags: Nag[] = [
    '$22',
    '$146',
    '$32',
    '$36',
    '$40',
    '$132',
    '$138',
    '$44',
    '$140',
    '$142',
    '$143',
    '$1300',
    '$1301',
    '$1302',
    '$1303',
    '$1305',
    '$1306',
    '$1307',
    '$1308',
    '$1304',
];

export function getNagInSet(nagSet: Nag[], nags: string[] | undefined): Nag {
    if (!nags) {
        return '';
    }

    for (const nag of nags) {
        const stdNag = getStandardNag(nag);
        if (nagSet.includes(stdNag)) {
            return stdNag;
        }
    }
    return '';
}

export function setNagInSet(nag: Nag | null, nagSet: Nag[], nags?: string[]): Nag[] {
    if (!nags) {
        if (nag) {
            return [nag];
        }
        return [];
    }

    nags = nags.filter((n) => !nagSet.includes(getStandardNag(n)));
    if (nag) {
        nags.push(nag);
    }
    return nags.sort(compareNags);
}

export function getNagsInSet(nagSet: Nag[], nags?: string[]): Nag[] {
    if (!nags) {
        return [];
    }
    return nags
        .map((n) => getStandardNag(n))
        .filter((n) => nagSet.includes(n))
        .sort(compareNags);
}

export function setNagsInSet(newNags: Nag[], nagSet: Nag[], nags?: string[]): Nag[] {
    if (!nags) {
        return newNags;
    }

    nags = nags.filter((n) => !nagSet.includes(getStandardNag(n)));
    nags.push(...newNags);
    return nags.sort(compareNags);
}

export function getNagGlyph(nag: string): string {
    const details = nags[nag];

    const svg = nagSvgs[nag];

    return `
        <defs>
            <filter id="shadow">
                <feDropShadow dx="4" dy="7" stdDeviation="5" flood-opacity="0.5"></feDropShadow>
            </filter>
        </defs>
        <g transform="translate(71 -12) scale(0.4)">
            <circle style="fill:${details.color || 'purple'};filter:url(#shadow)" cx="50" cy="50" r="50"></circle>
            ${
                svg
                    ? ''
                    : `<text
                font-size="${details.glyphFontSize ?? '4.5rem'}" 
                font-weight="bold" 
                text-anchor="middle" 
                fill="white" 
                x="50" 
                y="${details.glyphY ?? 75}"
            >
                ${details.label}
            </text>`
            }
        </g>
        ${svg ? svg : ''}
        `;
}
