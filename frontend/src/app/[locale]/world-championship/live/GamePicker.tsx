'use client';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Chip, Divider, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { useState } from 'react';
import { MatchRound } from './lichessFeed';
import { GAME_PICKER_HEIGHT, TABLET_UPRIGHT } from './liveLayout';

interface GamePickerProps {
    rounds: MatchRound[];
    /** The game on the page. */
    roundId?: string;
    onSelect: (id: string) => void;
    /** Admins only: the Admin view, as the last entry of the list. */
    admin?: { open: boolean; onOpen: () => void };
    /** Senseis only: removes a game they added. */
    onRemove?: (id: string) => void;
    /** How the finished games ended, by round id, as the page writes it: ½–½, 1–0 or 0–1. */
    results?: Record<string, string>;
}

/**
 * Shows beside a game's name that it is being played, or how it ended. In the
 * list a live game has a tag. Beside the name on the page a tag would be louder
 * than the name, so there it is a dot.
 */
function RoundState({
    round,
    result,
    quiet,
}: {
    round: MatchRound;
    result?: string;
    quiet?: boolean;
}) {
    if (round.ongoing && quiet) {
        return (
            <Box
                component='span'
                role='img'
                aria-label='live'
                sx={{
                    width: 8,
                    height: 8,
                    flexShrink: 0,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                }}
            />
        );
    }
    if (round.ongoing) {
        return (
            <Chip
                label='LIVE'
                color='error'
                size='small'
                sx={{
                    height: 18,
                    // The tag is rounder than the results under it, so it goes a
                    // little further right to look level with them.
                    mr: -0.75,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    '& .MuiChip-label': { px: 0.75 },
                }}
            />
        );
    }
    if (!result) {
        return null;
    }
    return (
        <Box
            component='span'
            sx={{ color: 'text.secondary', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}
        >
            {result}
        </Box>
    );
}

/**
 * On a phone and on a tablet held upright this stands in place of the tabs.
 * The 14 games need three and a half screens of swiping there on a phone, and
 * two on a tablet. It shows the game on the page, with an arrow to the game
 * before it and one to the game after it. The name opens the list of all games.
 */
export function GamePicker({
    rounds,
    roundId,
    onSelect,
    admin,
    onRemove,
    results = {},
}: GamePickerProps) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const index = rounds.findIndex((r) => r.id === roundId);
    const current = index >= 0 ? rounds[index] : undefined;
    const previous = index > 0 ? rounds[index - 1] : undefined;
    const next = index >= 0 ? rounds[index + 1] : undefined;

    const arrow = { width: 44, height: GAME_PICKER_HEIGHT, borderRadius: 1 };
    return (
        <Stack
            direction='row'
            data-testid='game-picker'
            sx={{
                alignItems: 'center',
                flexGrow: 1,
                minWidth: 0,
                height: GAME_PICKER_HEIGHT,
                // Where the picker has more room than it needs, the arrows stay near the
                // name and do not go to the edges of the screen.
                [TABLET_UPRIGHT]: { maxWidth: 420, mx: 'auto' },
            }}
        >
            <IconButton
                aria-label='Previous game'
                disabled={!previous}
                onClick={() => previous && onSelect(previous.id)}
                sx={arrow}
            >
                <ChevronLeftIcon />
            </IconButton>
            <Button
                endIcon={<ArrowDropDownIcon />}
                aria-label='Choose a game'
                aria-haspopup='menu'
                aria-expanded={!!anchor}
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    height: GAME_PICKER_HEIGHT,
                    gap: 1,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1rem',
                }}
            >
                <Box
                    component='span'
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                    {admin?.open ? 'Admin' : (current?.name ?? 'Choose a game')}
                </Box>
                {!admin?.open && current && (
                    <RoundState round={current} result={results[current.id]} quiet />
                )}
            </Button>
            <IconButton
                aria-label='Next game'
                disabled={!next}
                onClick={() => next && onSelect(next.id)}
                sx={arrow}
            >
                <ChevronRightIcon />
            </IconButton>
            <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                slotProps={{ paper: { sx: { minWidth: 220, maxHeight: '70dvh' } } }}
            >
                {rounds.map((r) => (
                    <MenuItem
                        key={r.id}
                        dense
                        selected={!admin?.open && r.id === roundId}
                        onClick={() => {
                            setAnchor(null);
                            onSelect(r.id);
                        }}
                    >
                        <Box component='span' sx={{ flexGrow: 1, mr: 2 }}>
                            {r.name}
                        </Box>
                        <RoundState round={r} result={results[r.id]} />
                        {onRemove && r.pgnUrl && (
                            <IconButton
                                size='small'
                                edge='end'
                                aria-label={`Remove ${r.name}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(r.id);
                                }}
                                sx={{ ml: 1 }}
                            >
                                <CloseIcon fontSize='small' />
                            </IconButton>
                        )}
                    </MenuItem>
                ))}
                {admin && <Divider />}
                {admin && (
                    <MenuItem
                        dense
                        selected={admin.open}
                        onClick={() => {
                            setAnchor(null);
                            admin.onOpen();
                        }}
                    >
                        Admin
                    </MenuItem>
                )}
            </Menu>
        </Stack>
    );
}
