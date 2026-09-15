export type Nag = string;

export interface NagDetails {
    label: string;
    description: string;
    color?: string;
    pdfColorName?: string;
    glyphY?: number;
    glyphFontSize?: string;
    prefix?: boolean;
}

export const nags: Record<Nag, NagDetails> = {
    $1: {
        label: '!',
        description: 'Good move',
        color: '#21c43a',
        pdfColorName: 'good',
    },
    $2: {
        label: '?',
        description: 'Mistake',
        color: '#e69d00',
        pdfColorName: 'mistake',
    },
    $3: {
        label: '!!',
        description: 'Brilliant move',
        color: '#22ac38',
        pdfColorName: 'brilliant',
    },
    $4: {
        label: '??',
        description: 'Blunder',
        color: '#df5353',
        glyphFontSize: '4rem',
        pdfColorName: 'blunder',
    },
    $5: {
        label: '!?',
        description: 'Interesting move',
        color: '#f075e1',
        pdfColorName: 'interesting',
    },
    $6: {
        label: '?!',
        description: 'Dubious move',
        color: '#53b2ea',
        pdfColorName: 'dubious',
    },
    $7: {
        label: '□',
        description: 'Only move',
        glyphY: 65,
    },
    $10: {
        label: '=',
        description: 'Equal position',
        glyphY: 65,
        pdfColorName: 'eval',
    },
    $11: {
        label: '=',
        description: 'Equal position',
        pdfColorName: 'eval',
    },
    $12: {
        label: '=',
        description: 'Equal position',
        pdfColorName: 'eval',
    },
    $13: {
        label: '∞',
        description: 'Unclear position',
        pdfColorName: 'eval',
    },
    $14: {
        label: '⩲',
        description: 'White is slightly better',
        glyphFontSize: '4rem',
        glyphY: 65,
        pdfColorName: 'eval',
    },
    $15: {
        label: '⩱',
        description: 'Black is slightly better',
        glyphFontSize: '4rem',
        glyphY: 65,
        pdfColorName: 'eval',
    },
    $16: {
        label: '±',
        description: 'White is better',
        glyphY: 65,
        pdfColorName: 'eval',
    },
    $17: {
        label: '∓',
        description: 'Black is better',
        pdfColorName: 'eval',
    },
    $18: {
        label: '+−',
        description: 'White is winning',
        glyphFontSize: '4rem',
        glyphY: 65,
        pdfColorName: 'eval',
    },
    $19: {
        label: '−+',
        description: 'Black is winning',
        glyphFontSize: '4rem',
        glyphY: 65,
        pdfColorName: 'eval',
    },
    $22: {
        label: '⨀',
        description: 'Zugzwang',
        glyphFontSize: '4rem',
        glyphY: 65,
    },
    $23: {
        label: '⨀',
        description: 'Zugzwang',
    },
    $26: {
        label: '○',
        description: 'Space advantage',
    },
    $27: {
        label: '○',
        description: 'Space advantage',
    },
    $32: {
        label: '⟳',
        description: 'Development advantage',
        glyphFontSize: '4rem',
        glyphY: 65,
    },
    $33: {
        label: '⟳',
        description: 'Development advantage',
    },
    $36: {
        label: '↑',
        description: 'Initiative',
        glyphFontSize: '4rem',
        glyphY: 65,
    },
    $37: {
        label: '↑',
        description: 'Initiative',
    },
    $40: {
        label: '→',
        description: 'Attack',
        glyphY: 65,
    },
    $41: {
        label: '→',
        description: 'Attack',
    },
    $44: {
        label: '=∞',
        description: 'Compensation',
        glyphFontSize: '4rem',
    },
    $45: {
        label: '=∞',
        description: 'Compensation',
    },
    $132: {
        label: '⇆',
        description: 'Counterplay',
        glyphY: 65,
    },
    $133: {
        label: '⇆',
        description: 'Counterplay',
    },
    $138: {
        label: '⨁',
        description: 'Time pressure',
        glyphFontSize: '4rem',
        glyphY: 65,
    },
    $139: {
        label: '⨁',
        description: 'Time pressure',
    },
    $140: {
        label: '∆',
        description: 'With the idea',
    },
    $142: {
        label: '⌓',
        description: 'Better is...',
        prefix: true,
        glyphFontSize: '6rem',
        glyphY: 65,
    },
    $143: {
        label: '<=',
        description: 'Worse is...',
        prefix: true,
        glyphFontSize: '3rem',
        glyphY: 65,
    },
    $146: {
        label: 'N',
        description: 'Novelty',
        glyphFontSize: '4rem',
    },
    $1300: {
        label: '',
        description: 'Move found during game',
    },
    $1301: {
        label: '',
        description: 'Move not found during game',
    },
    $1302: {
        label: '',
        description: 'Move found reviewing with another player',
    },
    $1303: {
        label: '',
        description: 'Out of book',
    },
    $1304: {
        label: '',
        description: 'Include diagram of position in PDF',
    },
    $1305: {
        label: '',
        description: 'Played too slowly',
    },
    $1306: {
        label: '',
        description: 'Played too quickly',
    },
    $1307: {
        label: '',
        description: 'Draw offer declined',
    },
    $1308: {
        label: '',
        description: 'Draw offer agreed',
    },
};

/**
 * A function that sorts NAGs in ascending order.
 * @param lhs The left-hand NAG to compare.
 * @param rhs The right-hand NAG to compare.
 * @returns A negative number if lhs < rhs and a positive number otherwise.
 */
export function compareNags(lhs: Nag, rhs: Nag): number {
    const lhsNum = parseInt(lhs.slice(1));
    const rhsNum = parseInt(rhs.slice(1));

    if (lhsNum < rhsNum) {
        return -1;
    }
    return 1;
}
