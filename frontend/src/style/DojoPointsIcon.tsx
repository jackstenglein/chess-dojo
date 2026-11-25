import { Box } from '@mui/material';
import { ChessDojoIcon } from './ChessDojoIcon';

/**
 * A Dojo point as a small blue coin stamped with the Dojo uniform. It is sized like
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
                background: 'radial-gradient(circle at 35% 30%, #8cc4ff, #3d8ee8 55%, #1f63c2)',
                boxShadow: 'inset 0 0 0 1px #174f9c',
                color: '#ffffff',
            }}
        >
            <ChessDojoIcon sx={{ fontSize: '0.95em', color: 'inherit' }} />
        </Box>
    );
}
