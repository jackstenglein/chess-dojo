import { Box, Stack, Typography } from '@mui/material';

/**
 * The PuzzleBase mark: a 2x2 board where one square is the move to find, in the primary color.
 * It is drawn in the text color so it suits both themes.
 */
export function PuzzlebaseMark({ size = 36 }: { size?: number }) {
    return (
        <Box
            component='svg'
            viewBox='0 0 32 32'
            aria-hidden
            sx={{ width: size, height: size, flexShrink: 0, display: 'block' }}
        >
            <rect
                x='1.5'
                y='1.5'
                width='29'
                height='29'
                rx='5'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
            />
            <rect x='6' y='6' width='10' height='10' rx='1.5' fill='currentColor' />
            <Box
                component='rect'
                x='16'
                y='16'
                width='10'
                height='10'
                rx='1.5'
                sx={{ fill: (theme) => theme.palette.primary.main }}
            />
        </Box>
    );
}

/** The mark beside "ChessDojo PuzzleBase", in the site's own heading font. */
export function PuzzlebaseLogo() {
    return (
        <Stack direction='row' sx={{ alignItems: 'center', gap: 1.5 }}>
            <PuzzlebaseMark />
            <Typography variant='h4' component='h1' sx={{ fontWeight: 'bold' }}>
                <Box component='span' sx={{ fontWeight: 400, color: 'text.secondary' }}>
                    ChessDojo{' '}
                </Box>
                PuzzleBase
            </Typography>
        </Stack>
    );
}
