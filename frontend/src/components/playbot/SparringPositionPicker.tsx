'use client';

/**
 * SparringPositionPicker
 *
 * Collapsible panel inside PlayBotSetup that lets the user browse and select
 * a position from the ChessDojo sparring library. Selecting a position
 * pre-fills the FEN and (optionally) the time control in the parent setup form.
 */

import { useRequirements } from '@/api/cache/requirements';
import Board from '@/board/Board';
import { Position } from '@/database/requirement';
import { ALL_COHORTS } from '@/database/user';
import { ExpandLess, ExpandMore, FitnessCenterRounded } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

interface SparringPositionPickerProps {
    onSelect: (position: Position) => void;
}

// Categories to show — matches the sectionData selectors in SparringPage
const CATEGORIES = [
    {
        label: 'Middlegame Win Conversions',
        match: (r: { category: string; name: string }) =>
            r.category === 'Middlegames + Strategy' && r.name.startsWith('Win Conversion'),
    },
    {
        label: 'Middlegame Sparring',
        match: (r: { category: string; name: string }) =>
            r.category === 'Middlegames + Strategy' &&
            r.name.startsWith('Spar Middlegame Position'),
    },
    {
        label: 'Endgame Win Conversions',
        match: (r: { category: string; name: string }) =>
            r.category === 'Endgame' && r.name.startsWith('Win Conversion'),
    },
    {
        label: 'Endgame Sparring',
        match: (r: { category: string; name: string }) =>
            r.category === 'Endgame' && r.name.startsWith('Spar Position'),
    },
    {
        label: 'Endgame Algorithms',
        match: (r: { category: string; name: string }) =>
            r.category === 'Endgame' && r.name.startsWith('Complete Algorithm'),
    },
];

function turnLabel(fen: string) {
    return fen.split(' ')[1] === 'b' ? 'Black to play' : 'White to play';
}

export function SparringPositionPicker({ onSelect }: SparringPositionPickerProps) {
    const [open, setOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

    const { requirements, request } = useRequirements(ALL_COHORTS, true);

    // Flatten all positions from matching requirements, grouped by category
    const categoryMap = useMemo(() => {
        const map: Record<string, Position[]> = {};
        for (const cat of CATEGORIES) {
            const positions: Position[] = [];
            for (const req of requirements) {
                if (cat.match(req) && req.positions) {
                    for (const pos of req.positions) {
                        positions.push(pos);
                    }
                }
            }
            if (positions.length > 0) map[cat.label] = positions;
        }
        return map;
    }, [requirements]);

    const categoryLabels = Object.keys(categoryMap);
    const positions = selectedCategory ? (categoryMap[selectedCategory] ?? []) : [];

    const handleConfirm = () => {
        if (selectedPosition) {
            onSelect(selectedPosition);
            setOpen(false);
        }
    };

    return (
        <Box>
            <Button
                size='small'
                variant='text'
                color='inherit'
                onClick={() => setOpen((v) => !v)}
                endIcon={open ? <ExpandLess /> : <ExpandMore />}
                startIcon={<FitnessCenterRounded sx={{ fontSize: '1rem !important' }} />}
                sx={{
                    alignSelf: 'flex-start',
                    px: 0,
                    color: 'text.secondary',
                    textTransform: 'none',
                }}
            >
                <Typography variant='subtitle2' fontWeight='bold'>
                    BROWSE SPARRING POSITIONS
                </Typography>
            </Button>

            <Collapse in={open} timeout='auto' unmountOnExit>
                <Stack spacing={1.5} mt={1}>
                    {request.isLoading() ? (
                        <Stack direction='row' alignItems='center' spacing={1} py={1}>
                            <CircularProgress size={16} />
                            <Typography variant='body2' color='text.secondary'>
                                Loading positions…
                            </Typography>
                        </Stack>
                    ) : (
                        <>
                            {/* Category selector */}
                            <FormControl size='small' fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={selectedCategory}
                                    label='Category'
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setSelectedPosition(null);
                                    }}
                                >
                                    {categoryLabels.map((label) => (
                                        <MenuItem key={label} value={label}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Position grid */}
                            {positions.length > 0 && (
                                <Box
                                    sx={{
                                        maxHeight: 320,
                                        overflowY: 'auto',
                                        pr: 0.5,
                                    }}
                                >
                                    <Grid container spacing={1}>
                                        {positions.map((pos) => {
                                            const isSelected =
                                                selectedPosition?.fen === pos.fen &&
                                                selectedPosition?.title === pos.title;
                                            return (
                                                <Grid
                                                    key={pos.fen + pos.title}
                                                    size={{ xs: 6, sm: 4 }}
                                                >
                                                    <Card
                                                        variant='outlined'
                                                        sx={{
                                                            border: isSelected
                                                                ? '2px solid'
                                                                : '1px solid',
                                                            borderColor: isSelected
                                                                ? 'primary.main'
                                                                : 'divider',
                                                        }}
                                                    >
                                                        <CardActionArea
                                                            onClick={() =>
                                                                setSelectedPosition(
                                                                    isSelected ? null : pos,
                                                                )
                                                            }
                                                        >
                                                            <Box sx={{ aspectRatio: '1/1' }}>
                                                                <Board
                                                                    config={{
                                                                        fen: pos.fen.trim(),
                                                                        viewOnly: true,
                                                                        orientation:
                                                                            pos.fen.split(
                                                                                ' ',
                                                                            )[1] === 'b'
                                                                                ? 'black'
                                                                                : 'white',
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Stack
                                                                spacing={0.25}
                                                                px={0.75}
                                                                py={0.5}
                                                            >
                                                                <Tooltip title={pos.title}>
                                                                    <Typography
                                                                        variant='caption'
                                                                        fontWeight='bold'
                                                                        noWrap
                                                                        display='block'
                                                                    >
                                                                        {pos.title}
                                                                    </Typography>
                                                                </Tooltip>
                                                                <Stack
                                                                    direction='row'
                                                                    spacing={0.5}
                                                                    flexWrap='wrap'
                                                                >
                                                                    <Chip
                                                                        label={turnLabel(pos.fen)}
                                                                        size='small'
                                                                        sx={{
                                                                            fontSize: '0.6rem',
                                                                            height: 16,
                                                                        }}
                                                                    />
                                                                    {pos.limitSeconds > 0 && (
                                                                        <Chip
                                                                            label={`${pos.limitSeconds / 60}+${pos.incrementSeconds}`}
                                                                            size='small'
                                                                            variant='outlined'
                                                                            sx={{
                                                                                fontSize: '0.6rem',
                                                                                height: 16,
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Stack>
                                                            </Stack>
                                                        </CardActionArea>
                                                    </Card>
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                </Box>
                            )}

                            {/* Confirm button */}
                            {selectedPosition && (
                                <>
                                    <Divider />
                                    <Stack
                                        direction='row'
                                        alignItems='center'
                                        justifyContent='space-between'
                                        spacing={1}
                                    >
                                        <Stack spacing={0.25}>
                                            <Typography variant='body2' fontWeight='bold'>
                                                {selectedPosition.title}
                                            </Typography>
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.65rem',
                                                }}
                                            >
                                                {selectedPosition.fen.trim()}
                                            </Typography>
                                        </Stack>
                                        <Button
                                            variant='contained'
                                            size='small'
                                            onClick={handleConfirm}
                                            sx={{ flexShrink: 0 }}
                                        >
                                            Use Position
                                        </Button>
                                    </Stack>
                                </>
                            )}
                        </>
                    )}
                </Stack>
            </Collapse>
        </Box>
    );
}
