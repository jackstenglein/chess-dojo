'use client';

import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { RATING_BIN_EDGES, ratingBinLabel } from './ratingBins';

/** Height of the plot area, in px. */
const CHART_HEIGHT = 96;
/** Room above the tallest bar for its count label, in px. */
const LABEL_ROOM = 20;
/**
 * The narrowest a column (and its label) can get, in px. Columns share the full width of the
 * panel, and the chart scrolls sideways on screens too narrow to fit them.
 */
const COLUMN_WIDTH = 66;
/** Width of each bar as a share of its column, so the spacing looks the same at any width. */
const BAR_WIDTH_FRACTION = '26%';
/** Bars stop growing at this width on very wide screens, in px. */
const MAX_BAR_WIDTH = 36;

interface RatingBandsProps {
    /** The number of puzzles in each band. */
    counts: number[];
    /** The indexes of the selected bands. */
    selected: number[];
    onToggle: (band: number) => void;
}

/**
 * A histogram of how many puzzles are in each rating band. Clicking a column filters to that band.
 */
export function RatingBands({ counts, selected, onToggle }: RatingBandsProps) {
    const max = Math.max(1, ...counts);
    const anySelected = selected.length > 0;

    return (
        <Box sx={{ overflowX: 'auto' }}>
            <Typography
                variant='overline'
                sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block', mb: 0.5 }}
            >
                Puzzles by rating
            </Typography>

            <Box sx={{ width: '100%', minWidth: RATING_BIN_EDGES.length * COLUMN_WIDTH }}>
                <Box
                    role='group'
                    aria-label='Puzzles by rating band'
                    sx={{
                        position: 'relative',
                        height: CHART_HEIGHT,
                        display: 'flex',
                        alignItems: 'stretch',
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    {/* Gridlines at the top and middle of the plot area. */}
                    {[LABEL_ROOM, LABEL_ROOM + (CHART_HEIGHT - LABEL_ROOM) / 2].map((top) => (
                        <Box
                            key={top}
                            aria-hidden
                            sx={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top,
                                borderTop: '1px dashed',
                                borderColor: 'divider',
                                opacity: 0.6,
                                pointerEvents: 'none',
                            }}
                        />
                    ))}

                    {RATING_BIN_EDGES.map((_, band) => {
                        const isSelected = selected.includes(band);
                        const count = counts[band];
                        const barHeight =
                            count === 0
                                ? 2
                                : Math.max(6, (count / max) * (CHART_HEIGHT - LABEL_ROOM));
                        const dimmed = anySelected && !isSelected;

                        return (
                            <Tooltip
                                key={band}
                                arrow
                                placement='top'
                                title={`${ratingBinLabel(band)} · ${count} ${
                                    count === 1 ? 'puzzle' : 'puzzles'
                                }`}
                            >
                                <ButtonBase
                                    onClick={() => onToggle(band)}
                                    aria-pressed={isSelected}
                                    aria-label={`${ratingBinLabel(band)}: ${count} puzzles`}
                                    sx={{
                                        flex: `1 1 ${COLUMN_WIDTH}px`,
                                        minWidth: COLUMN_WIDTH,
                                        flexDirection: 'column',
                                        justifyContent: 'flex-end',
                                        position: 'relative',
                                        zIndex: 1,
                                        borderRadius: '4px 4px 0 0',
                                        bgcolor: (theme) =>
                                            isSelected
                                                ? alpha(theme.palette.primary.main, 0.1)
                                                : undefined,
                                        '&:hover': {
                                            bgcolor: (theme) =>
                                                alpha(theme.palette.primary.main, 0.08),
                                            '& .bar': { filter: 'brightness(1.15)' },
                                        },
                                    }}
                                >
                                    <Typography
                                        variant='caption'
                                        sx={{
                                            mb: 0.5,
                                            lineHeight: 1,
                                            fontWeight: 'bold',
                                            fontVariantNumeric: 'tabular-nums',
                                            color: count === 0 ? 'text.disabled' : 'text.primary',
                                            opacity: dimmed ? 0.5 : 1,
                                        }}
                                    >
                                        {count}
                                    </Typography>
                                    <Box
                                        className='bar'
                                        sx={{
                                            width: BAR_WIDTH_FRACTION,
                                            maxWidth: MAX_BAR_WIDTH,
                                            height: barHeight,
                                            borderRadius: '3px 3px 0 0',
                                            background: (theme) =>
                                                count === 0
                                                    ? alpha(theme.palette.text.primary, 0.15)
                                                    : `linear-gradient(180deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.55)})`,
                                            opacity: dimmed ? 0.3 : 1,
                                            boxShadow: (theme) =>
                                                isSelected
                                                    ? `0 0 0 2px ${alpha(theme.palette.primary.light, 0.6)}`
                                                    : 'none',
                                            transition:
                                                'height .25s ease, opacity .2s ease, filter .15s ease',
                                        }}
                                    />
                                </ButtonBase>
                            </Tooltip>
                        );
                    })}
                </Box>

                <Box sx={{ display: 'flex', pt: 0.5 }}>
                    {RATING_BIN_EDGES.map((_, band) => (
                        <Typography
                            key={band}
                            variant='caption'
                            color={selected.includes(band) ? 'text.primary' : 'text.secondary'}
                            sx={{
                                flex: `1 1 ${COLUMN_WIDTH}px`,
                                minWidth: COLUMN_WIDTH,
                                textAlign: 'center',
                                fontSize: 11,
                                fontWeight: selected.includes(band) ? 'bold' : undefined,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {ratingBinLabel(band)}
                        </Typography>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}
