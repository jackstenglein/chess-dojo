import { createTheme, PaletteOptions, ThemeProvider } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PieceSx } from './boardThemes';
import { getPromotionPosition, PromotionDialog, type PrePromotionMove } from './PromotionDialog';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const theme = createTheme({
    palette: {
        dojoOrange: { main: '#F7941F' },
    } as PaletteOptions,
});

function move(dest: string, color: 'white' | 'black' = 'white'): PrePromotionMove {
    return {
        orig: color === 'white' ? 'e7' : 'e2',
        dest: dest as PrePromotionMove['dest'],
        color,
    };
}

function testPieceSx(): PieceSx {
    const pieces = ['pawn', 'bishop', 'knight', 'rook', 'queen', 'king'] as const;
    const sx = {} as PieceSx;
    for (const color of ['white', 'black'] as const) {
        for (const piece of pieces) {
            sx[`--${color}-${piece}`] = `url('/pieces/${color}-${piece}.svg')`;
        }
    }
    return sx;
}

function renderDialog(promotion: PrePromotionMove | null, orientation?: 'white' | 'black') {
    const onFinishPromotion = vi.fn();
    const onCancelPromotion = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <PromotionDialog
                promotion={promotion}
                orientation={orientation}
                onFinishPromotion={onFinishPromotion}
                onCancelPromotion={onCancelPromotion}
                pieceSx={testPieceSx()}
            />
        </ThemeProvider>,
    );
    return { onFinishPromotion, onCancelPromotion };
}

/** Reads an authored CSS declaration. Computed style collapses percentages when the board has no size. */
function declaredStyle(element: HTMLElement, property: string): string {
    const classes = new Set(element.classList);
    let found = element.style.getPropertyValue(property).trim();
    for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            continue;
        }
        for (const rule of rules) {
            if (!(rule instanceof CSSStyleRule)) {
                continue;
            }
            const matches = rule.selectorText.split(',').some((selector) =>
                selector
                    .trim()
                    .split(/\s+/)
                    .some((part) => part.split('.').some((className) => classes.has(className))),
            );
            if (!matches) {
                continue;
            }
            const value = rule.style.getPropertyValue(property).trim();
            if (value) {
                found = value;
            }
        }
    }
    return found;
}

function promotionColumn(): HTMLElement {
    const column = screen.getByTestId('promotion-dialog').firstElementChild;
    if (!(column instanceof HTMLElement)) {
        throw new Error('Promotion column was not rendered');
    }
    return column;
}

function pieceButtons(): HTMLElement[] {
    return screen.getAllByRole('button');
}

function pieceBackground(button: HTMLElement): string {
    const graphic = button.querySelector('div');
    if (!(graphic instanceof HTMLElement)) {
        throw new Error('Piece graphic was not rendered');
    }
    return declaredStyle(graphic, 'background-image').replaceAll('"', "'");
}

async function activateClickAway() {
    await act(async () => {
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    });
}

describe('getPromotionPosition', () => {
    it('returns the origin when nothing is being promoted', () => {
        expect(getPromotionPosition(null, 'white')).toEqual({ left: 0, reversed: false });
        expect(getPromotionPosition(null, 'black')).toEqual({ left: 0, reversed: false });
    });

    it.each(files)(
        'places the %s-file chooser on that file and grows it away from the near edge',
        (file) => {
            const index = file.charCodeAt(0) - 'a'.charCodeAt(0);
            const fromWhite = (index / 8) * 100;
            const fromBlack = ((7 - index) / 8) * 100;

            expect(getPromotionPosition(move(`${file}8`), 'white')).toEqual({
                left: fromWhite,
                reversed: false,
            });
            expect(getPromotionPosition(move(`${file}8`), undefined)).toEqual({
                left: fromWhite,
                reversed: false,
            });
            expect(getPromotionPosition(move(`${file}1`), 'white')).toEqual({
                left: fromWhite,
                reversed: true,
            });
            expect(getPromotionPosition(move(`${file}8`), 'black')).toEqual({
                left: fromBlack,
                reversed: true,
            });
            expect(getPromotionPosition(move(`${file}1`), 'black')).toEqual({
                left: fromBlack,
                reversed: false,
            });
        },
    );
});

describe('PromotionDialog', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders nothing when no promotion is pending', () => {
        const { container } = render(
            <ThemeProvider theme={theme}>
                <PromotionDialog
                    promotion={null}
                    onFinishPromotion={vi.fn()}
                    onCancelPromotion={vi.fn()}
                    pieceSx={testPieceSx()}
                />
            </ThemeProvider>,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('covers the board and stacks queen, knight, rook, and bishop down from the promotion square', () => {
        renderDialog(move('e8'), 'white');

        const dialog = screen.getByTestId('promotion-dialog');
        expect(declaredStyle(dialog, 'width')).toBe('var(---cg-width)');
        expect(declaredStyle(dialog, 'height')).toBe('var(---cg-height)');

        expect(declaredStyle(promotionColumn(), 'left')).toBe('50%');
        expect(declaredStyle(promotionColumn(), 'width')).toBe('12.5%');

        const buttons = pieceButtons();
        expect(buttons.map((button) => declaredStyle(button, 'top'))).toEqual([
            '0%',
            '12.5%',
            '25%',
            '37.5%',
        ]);
        expect(buttons.map((button) => pieceBackground(button))).toEqual([
            "url('/pieces/white-queen.svg')",
            "url('/pieces/white-knight.svg')",
            "url('/pieces/white-rook.svg')",
            "url('/pieces/white-bishop.svg')",
        ]);
    });

    it("grows upward from a promotion square on the near edge and uses that side's pieces", () => {
        renderDialog(move('a1', 'black'), 'white');

        expect(declaredStyle(promotionColumn(), 'left')).toBe('0%');
        const buttons = pieceButtons();
        expect(buttons.map((button) => declaredStyle(button, 'top'))).toEqual([
            '87.5%',
            '75%',
            '62.5%',
            '50%',
        ]);
        expect(pieceBackground(buttons[0])).toBe("url('/pieces/black-queen.svg')");
    });

    it('mirrors the file when black is at the bottom', () => {
        renderDialog(move('a8'), 'black');

        expect(declaredStyle(promotionColumn(), 'left')).toBe('87.5%');
        expect(declaredStyle(pieceButtons()[0], 'top')).toBe('87.5%');
    });

    it('promotes to the chosen piece', () => {
        const { onFinishPromotion, onCancelPromotion } = renderDialog(move('h8'), 'white');

        const [queen, knight, rook, bishop] = pieceButtons();
        fireEvent.click(knight);
        fireEvent.click(queen);
        fireEvent.click(rook);
        fireEvent.click(bishop);

        expect(onFinishPromotion.mock.calls).toEqual([['n'], ['q'], ['r'], ['b']]);
        expect(onCancelPromotion).not.toHaveBeenCalled();
    });

    it('cancels when the player clicks the rest of the board', async () => {
        const { onFinishPromotion, onCancelPromotion } = renderDialog(move('c8'), 'white');
        await activateClickAway();

        fireEvent.click(screen.getByTestId('promotion-dialog'));

        expect(onCancelPromotion).toHaveBeenCalledOnce();
        expect(onFinishPromotion).not.toHaveBeenCalled();
    });
});
