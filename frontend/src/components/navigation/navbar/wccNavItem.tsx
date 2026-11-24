import { EmojiEvents } from '@mui/icons-material';
import { Chip } from '@mui/material';
import type { NavbarItem } from './NavbarMenu';

/** How many header items the WCC link adds, for the menus' width rules. */
export const WCC_EXTRA = 1;

/**
 * The link to the live World Championship page, first in the header while the
 * match is on, with a red LIVE tag. Remove it from both menus after the match.
 */
export function wccNavItem(): NavbarItem {
    return {
        id: 'wcc-live',
        name: (
            <>
                2026 WCC{' '}
                <Chip
                    label='LIVE'
                    size='small'
                    sx={{
                        ml: 1,
                        bgcolor: '#e53935',
                        color: '#fff',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                    }}
                />{' '}
            </>
        ),
        icon: <EmojiEvents />,
        href: '/world-championship/live',
    };
}
