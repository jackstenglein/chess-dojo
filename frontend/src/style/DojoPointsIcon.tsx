import { Box } from '@mui/material';
import { ChessDojoIcon } from './ChessDojoIcon';

/**
 * A Dojo point as a small navy coin stamped with the Dojo uniform. It is sized like
 * an icon, by `size` or the surrounding font.
 */
export function DojoPointsIcon({ size = '1em' }: { size?: string }) {
    return (
        <Box
            component='span'
            aria-hidden
            sx={{
                fontSize: size,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: '1.25em',
                height: '1.25em',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #4a6db3, #1f3a7a 55%, #142857)',
                boxShadow: 'inset 0 0 0 1px #5c7cc0',
                color: '#ffffff',
            }}
        >
            <ChessDojoIcon sx={{ fontSize: '0.95em', color: 'inherit' }} />
        </Box>
    );
}
