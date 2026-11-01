import { type Square } from '@jackstenglein/chess';
import { Color } from '@lichess-org/chessground/types';
import { Box, Button, ClickAwayListener } from '@mui/material';
import type { PieceSx } from './boardThemes';

export interface PrePromotionMove {
    orig: Square;
    dest: Square;
    color: Color;
}

const promotionPieces = [
    {
        key: 'q',
        name: 'queen',
    },
    {
        key: 'n',
        name: 'knight',
    },
    {
        key: 'r',
        name: 'rook',
    },
    {
        key: 'b',
        name: 'bishop',
    },
] as const;

export function PromotionDialog({
    promotion,
    orientation,
    onFinishPromotion,
    onCancelPromotion,
    pieceSx,
}: {
    promotion: PrePromotionMove | null;
    orientation?: 'white' | 'black';
    onFinishPromotion: (piece: string) => void;
    onCancelPromotion: () => void;
    pieceSx: PieceSx;
}) {
    if (!promotion) {
        return null;
    }

    const { left, reversed } = getPromotionPosition(promotion, orientation);

    return (
        <Box
            data-testid='promotion-dialog'
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 'var(---cg-width)',
                height: 'var(---cg-height)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                transition: 'opacity 225ms cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: 1,
                zIndex: 205,
            }}
        >
            <ClickAwayListener onClickAway={onCancelPromotion}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: `${left}%`,
                        width: '12.5%',
                        height: 1,
                    }}
                >
                    {promotionPieces.map((piece, i) => (
                        <Button
                            key={piece.key}
                            onClick={() => onFinishPromotion(piece.key)}
                            color='dojoOrange'
                            sx={{
                                position: 'absolute',
                                top: reversed ? `${100 - (i + 1) * 12.5}%` : `${i * 12.5}%`,
                                width: 1,
                                height: '12.5%',
                                minWidth: 1,
                                minHeight: '12.5%',
                                padding: 0,
                                backgroundColor: '#b0b0b0',
                                boxShadow: 'inset 0 0 25px 3px gray',
                                borderRadius: '50%',
                                transition: 'all .15s',
                                ':hover': {
                                    boxShadow:
                                        'inset 0 0 48px 8px var(--mui-palette-dojoOrange-main)',
                                    borderRadius: 0,
                                    '& div': {
                                        width: 1,
                                    },
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    transition: 'all .15s',
                                    width: 0.8,
                                    aspectRatio: 1,
                                    backgroundSize: 'cover',
                                    backgroundImage: promotion
                                        ? pieceSx[`--${promotion.color}-${piece.name}`]
                                        : '',
                                }}
                            />
                        </Button>
                    ))}
                </Box>
            </ClickAwayListener>
        </Box>
    );
}

/**
 * Places the promotion chooser on the destination file.
 * Pieces run down from the promotion square, so the order is reversed when
 * that square is on the near side of the board.
 */
export function getPromotionPosition(
    promotion: PrePromotionMove | null,
    orientation: 'black' | 'white' | undefined,
): { left: number; reversed: boolean } {
    if (!promotion) {
        return { left: 0, reversed: false };
    }

    const file = promotion.dest.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = Number(promotion.dest[1]);

    if (orientation === 'black') {
        return {
            left: ((7 - file) / 8) * 100,
            reversed: rank === 8,
        };
    }

    return {
        left: (file / 8) * 100,
        reversed: rank === 1,
    };
}
