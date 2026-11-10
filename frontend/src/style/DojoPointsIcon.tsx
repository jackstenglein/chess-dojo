import { Box } from '@mui/material';
import { ChessDojoIcon } from './ChessDojoIcon';

/**
 * A Dojo point as a small gold coin stamped with the Dojo uniform. It is sized like
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
                background: 'radial-gradient(circle at 35% 30%, #ffd24d, #d9960f 75%)',
                boxShadow: 'inset 0 0 0 1px #9a6a00',
                color: '#2b1d00',
            }}
        >
            <ChessDojoIcon sx={{ fontSize: '0.95em', color: 'inherit' }} />
        </Box>
    );
}
