import { PlayerId, PLAYERS } from './config';
import { CONFIRMATION, PLAYER_ROLES } from './content';
import { describePicks, Picks } from './prediction';

/**
 * Draws the picks card as a 1080x1350 PNG, the portrait size Instagram and X show
 * without cropping. Drawn by hand on a canvas so the page ships no image library.
 */

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 84;
const INK = '#08080F';
const ORANGE = '#F7941F';
const MUTED = '#B9BDC9';
const HAIRLINE = 'rgba(255, 255, 255, 0.16)';

export interface ShareCardFonts {
    display: string;
    condensed: string;
    body: string;
}

export interface ShareCardData {
    picks: Picks;
    displayName: string;
    /** Shown at the bottom, without the protocol. */
    url: string;
}

function drawBoard(context: CanvasRenderingContext2D) {
    const size = 108;
    const originX = WIDTH - size * 6;
    for (let row = 0; row < 6; row++) {
        for (let column = 0; column < 6; column++) {
            if ((row + column) % 2 === 1) {
                continue;
            }
            const distance = Math.hypot(5 - column, row) / 6;
            const alpha = Math.max(0, 0.085 * (1 - distance));
            context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            context.fillRect(originX + column * size, row * size, size, size);
        }
    }
}

/** Rounded where the browser can draw it. Safari before 16 gets square corners. */
function flagOutline(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    if (typeof context.roundRect === 'function') {
        context.roundRect(x, y, width, height, 8);
    } else {
        context.rect(x, y, width, height);
    }
}

function drawFlag(context: CanvasRenderingContext2D, player: PlayerId, x: number, y: number) {
    const width = 120;
    const height = 80;
    context.save();
    context.beginPath();
    flagOutline(context, x, y, width, height);
    context.clip();
    if (player === 'gukesh') {
        context.fillStyle = '#FFFFFF';
        context.fillRect(x, y, width, height);
        context.fillStyle = '#FF9933';
        context.fillRect(x, y, width, height / 3);
        context.fillStyle = '#138808';
        context.fillRect(x, y + (height * 2) / 3, width, height / 3);
        context.strokeStyle = '#000080';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(x + width / 2, y + height / 2, 9.5, 0, Math.PI * 2);
        context.stroke();
    } else {
        context.fillStyle = '#CE1126';
        context.fillRect(x, y, width, height);
        context.fillStyle = '#0099B5';
        context.fillRect(x, y, width, 25);
        context.fillStyle = '#FFFFFF';
        context.fillRect(x, y + 27.5, width, 25);
        context.fillStyle = '#1EB53A';
        context.fillRect(x, y + 55, width, 25);
        context.fillStyle = '#FFFFFF';
        context.beginPath();
        context.arc(x + 21, y + 12.5, 7.5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#0099B5';
        context.beginPath();
        context.arc(x + 24, y + 12.5, 6.8, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#FFFFFF';
        for (const starX of [34.5, 40, 45.5]) {
            context.beginPath();
            context.arc(x + starX, y + 17.5, 1.5, 0, Math.PI * 2);
            context.fill();
        }
    }
    context.restore();
    context.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    context.lineWidth = 2;
    context.beginPath();
    flagOutline(context, x, y, width, height);
    context.stroke();
}

function hairline(context: CanvasRenderingContext2D, y: number) {
    context.fillStyle = HAIRLINE;
    context.fillRect(MARGIN, y, WIDTH - MARGIN * 2, 2);
}

/** Shrinks the text until it fits the given width. */
function fitFont(
    context: CanvasRenderingContext2D,
    text: string,
    weight: string,
    size: number,
    family: string,
    maxWidth: number,
) {
    let current = size;
    context.font = `${weight} ${current}px ${family}`;
    while (context.measureText(text).width > maxWidth && current > 24) {
        current -= 4;
        context.font = `${weight} ${current}px ${family}`;
    }
}

export async function renderShareCard(data: ShareCardData, fonts: ShareCardFonts): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas is not available');
    }

    // The page fonts are already loaded. This waits for any weight that is still on its way.
    await Promise.allSettled([
        document.fonts.load(`400 100px ${fonts.display}`),
        document.fonts.load(`600 40px ${fonts.condensed}`),
        document.fonts.load(`400 40px ${fonts.body}`),
    ]);

    const { picks } = data;
    const contentWidth = WIDTH - MARGIN * 2;

    context.fillStyle = INK;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    drawBoard(context);
    context.fillStyle = ORANGE;
    context.fillRect(0, 0, WIDTH, 12);

    context.textBaseline = 'alphabetic';
    context.fillStyle = ORANGE;
    fitFont(
        context,
        CONFIRMATION.cardTitle.toUpperCase(),
        '600',
        40,
        fonts.condensed,
        contentWidth,
    );
    context.fillText(CONFIRMATION.cardTitle.toUpperCase(), MARGIN, 150);

    context.fillStyle = MUTED;
    const name = data.displayName || CONFIRMATION.cardFallbackName;
    fitFont(context, name, '400', 46, fonts.body, contentWidth);
    context.fillText(name, MARGIN, 218);

    drawFlag(context, picks.winner, MARGIN, 296);
    context.fillStyle = '#FFFFFF';
    fitFont(context, PLAYERS[picks.winner].name, '400', 190, fonts.display, contentWidth);
    context.fillText(PLAYERS[picks.winner].name, MARGIN - 4, 566);
    context.fillStyle = MUTED;
    context.font = `400 44px ${fonts.body}`;
    context.fillText(
        `${PLAYER_ROLES[picks.winner]} · ${PLAYERS[picks.winner].country}`,
        MARGIN,
        636,
    );

    const lines = describePicks(picks).slice(1);
    let y = 700;
    for (const line of lines) {
        hairline(context, y);
        y += 80;
        context.textAlign = 'left';
        context.fillStyle = MUTED;
        context.font = `400 42px ${fonts.body}`;
        context.fillText(line.label, MARGIN, y);
        context.textAlign = 'right';
        context.fillStyle = '#FFFFFF';
        context.font = `600 56px ${fonts.condensed}`;
        context.fillText(line.value, WIDTH - MARGIN, y + 4);
        y += 30;
    }
    hairline(context, y);

    context.textAlign = 'left';
    context.fillStyle = MUTED;
    context.font = `400 38px ${fonts.body}`;
    context.fillText(CONFIRMATION.tieBreakerLine(picks.game1Moves), MARGIN, y + 64);

    context.fillStyle = ORANGE;
    context.font = `600 46px ${fonts.condensed}`;
    context.fillText(data.url, MARGIN, HEIGHT - 76);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Could not draw the card'))),
            'image/png',
        );
    });
}

/** Opens the phone's share sheet when it takes files, otherwise downloads the image. */
export async function saveShareCard(blob: Blob, fileName: string, title: string) {
    const file = new File([blob], fileName, { type: 'image/png' });
    const onPhone = window.matchMedia('(pointer: coarse)').matches;
    if (onPhone && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title });
            return;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
        }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
