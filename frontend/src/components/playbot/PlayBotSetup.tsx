'use client';

import { Position } from '@/database/requirement';
import { Chess, FEN } from '@jackstenglein/chess';
import { ExpandLess, ExpandMore, PlayArrow, Timer } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    FormControl,
    InputAdornment,
    MenuItem,
    Select,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { MAIA_RATINGS, MaiaRating } from './maiaengine';
import { RATING_DESCRIPTIONS } from './playbot';
import { SparringPositionPicker } from './SparringPositionPicker';
import { PlayerColor } from './useMaiaGame';

type ColorChoice = PlayerColor | 'random';

export interface TimeControl {
    /** null = unlimited */
    initialMs: number | null;
    incrementMs: number;
}

export interface PlayBotStartOpts {
    playerColor: PlayerColor;
    maiaRating: MaiaRating;
    startFen: string;
    timeControl: TimeControl;
}

interface PlayBotSetupProps {
    onStart: (opts: PlayBotStartOpts) => void;
    initialRating?: MaiaRating;
}

interface TimePreset {
    label: string;
    category: string;
    mins: number;
    inc: number;
}

const TIME_PRESETS: TimePreset[] = [
    { label: '1+0', category: 'Bullet', mins: 1, inc: 0 },
    { label: '2+1', category: 'Bullet', mins: 2, inc: 1 },
    { label: '3+0', category: 'Blitz', mins: 3, inc: 0 },
    { label: '3+2', category: 'Blitz', mins: 3, inc: 2 },
    { label: '5+0', category: 'Blitz', mins: 5, inc: 0 },
    { label: '5+3', category: 'Blitz', mins: 5, inc: 3 },
    { label: '10+0', category: 'Rapid', mins: 10, inc: 0 },
    { label: '10+5', category: 'Rapid', mins: 10, inc: 5 },
    { label: '15+10', category: 'Rapid', mins: 15, inc: 10 },
    { label: '30+0', category: 'Classical', mins: 30, inc: 0 },
    { label: '30+20', category: 'Classical', mins: 30, inc: 20 },
];

const CATEGORY_COLORS: Record<string, string> = {
    Bullet: '#f44336',
    Blitz: '#ff9800',
    Rapid: '#4caf50',
    Classical: '#2196f3',
};

function isValidFen(fen: string): boolean {
    try {
        new Chess({ fen });
        return true;
    } catch {
        return false;
    }
}

export function PlayBotSetup({ onStart, initialRating = 1500 }: PlayBotSetupProps) {
    const [colorChoice, setColorChoice] = useState<ColorChoice>('white');
    const [maiaRating, setMaiaRating] = useState<MaiaRating>(initialRating);

    const [selectedTime, setSelectedTime] = useState<string>('10+0');
    const [customMins, setCustomMins] = useState('10');
    const [customInc, setCustomInc] = useState('0');

    const [showFen, setShowFen] = useState(false);
    const [fenInput, setFenInput] = useState('');
    const [fenError, setFenError] = useState('');

    const handleFenChange = (val: string) => {
        setFenInput(val);
        if (val.trim() && !isValidFen(val.trim())) {
            setFenError('Invalid FEN position');
        } else {
            setFenError('');
        }
    };

    const resolveTimeControl = (): TimeControl => {
        if (selectedTime === 'unlimited') {
            return { initialMs: null, incrementMs: 0 };
        }
        if (selectedTime === 'custom') {
            const mins = Math.max(0, parseFloat(customMins) || 0);
            const inc = Math.max(0, parseFloat(customInc) || 0);
            if (mins <= 0) return { initialMs: null, incrementMs: 0 };
            return { initialMs: mins * 60 * 1000, incrementMs: inc * 1000 };
        }
        const preset = TIME_PRESETS.find((p) => p.label === selectedTime);
        if (!preset) return { initialMs: null, incrementMs: 0 };
        return { initialMs: preset.mins * 60 * 1000, incrementMs: preset.inc * 1000 };
    };

    const handleSparringSelect = (position: Position) => {
        handleFenChange(position.fen.trim());
        setShowFen(true);
        // Pre-fill time control from the position if it has one
        if (position.limitSeconds > 0) {
            const mins = position.limitSeconds / 60;
            const inc = position.incrementSeconds;
            const label = `${mins}+${inc}`;
            const matchedPreset = TIME_PRESETS.find((p) => p.mins === mins && p.inc === inc);
            if (matchedPreset) {
                setSelectedTime(label);
            } else {
                setSelectedTime('custom');
                setCustomMins(String(mins));
                setCustomInc(String(inc));
            }
        }
    };

    const handleStart = () => {
        const playerColor: PlayerColor =
            colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;

        const trimmed = fenInput.trim();
        if (trimmed && !isValidFen(trimmed)) {
            setFenError('Invalid FEN position');
            return;
        }
        const startFen = trimmed || FEN.start;

        onStart({ playerColor, maiaRating, startFen, timeControl: resolveTimeControl() });
    };

    const customMinsNum = parseFloat(customMins) || 0;
    const customValid = selectedTime !== 'custom' || customMinsNum >= 0;

    return (
        <Stack spacing={2.5}>
            {/* Rating */}
            <Stack spacing={0.75}>
                <Typography variant='subtitle2' fontWeight='bold' color='text.secondary'>
                    Sparring Bot Rating
                </Typography>

                <FormControl size='small' fullWidth>
                    <Select
                        value={maiaRating}
                        onChange={(e) => setMaiaRating(e.target.value as MaiaRating)}
                    >
                        {MAIA_RATINGS.map((r) => (
                            <MenuItem key={r} value={r}>
                                <Stack direction='row' alignItems='center' spacing={1.5}>
                                    <Chip
                                        label={r}
                                        size='small'
                                        color='primary'
                                        sx={{ minWidth: 48 }}
                                    />
                                    <Typography variant='body2'>
                                        {RATING_DESCRIPTIONS[r]}
                                    </Typography>
                                </Stack>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant='caption' color='text.secondary'>
                    Powered by Maia3 Neural Net Engine Database
                </Typography>
            </Stack>

            <Divider />

            {/* Time control */}
            <Stack spacing={1}>
                <Stack direction='row' alignItems='center' spacing={0.5}>
                    <Timer sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant='subtitle2' fontWeight='bold' color='text.secondary'>
                        TIME CONTROL
                    </Typography>
                </Stack>

                {/* Preset grid */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {/* Unlimited */}
                    <Chip
                        label='Unlimited'
                        size='small'
                        onClick={() => setSelectedTime('unlimited')}
                        variant={selectedTime === 'unlimited' ? 'filled' : 'outlined'}
                        color={selectedTime === 'unlimited' ? 'primary' : 'default'}
                        sx={{ cursor: 'pointer' }}
                    />
                    {/* Presets grouped by category */}
                    {TIME_PRESETS.map((preset) => (
                        <Tooltip key={preset.label} title={preset.category}>
                            <Chip
                                label={preset.label}
                                size='small'
                                onClick={() => setSelectedTime(preset.label)}
                                variant={selectedTime === preset.label ? 'filled' : 'outlined'}
                                sx={{
                                    cursor: 'pointer',
                                    borderColor: CATEGORY_COLORS[preset.category],
                                    color:
                                        selectedTime === preset.label
                                            ? 'white'
                                            : CATEGORY_COLORS[preset.category],
                                    bgcolor:
                                        selectedTime === preset.label
                                            ? CATEGORY_COLORS[preset.category]
                                            : 'transparent',
                                    '&:hover': {
                                        bgcolor:
                                            selectedTime === preset.label
                                                ? CATEGORY_COLORS[preset.category]
                                                : `${CATEGORY_COLORS[preset.category]}22`,
                                    },
                                }}
                            />
                        </Tooltip>
                    ))}
                    {/* Custom */}
                    <Chip
                        label='Custom'
                        size='small'
                        onClick={() => setSelectedTime('custom')}
                        variant={selectedTime === 'custom' ? 'filled' : 'outlined'}
                        color={selectedTime === 'custom' ? 'secondary' : 'default'}
                        sx={{ cursor: 'pointer' }}
                    />
                </Box>

                {/* Custom inputs */}
                <Collapse in={selectedTime === 'custom'}>
                    <Stack direction='row' spacing={1} mt={1.5}>
                        <TextField
                            size='small'
                            label='Minutes'
                            type='number'
                            value={customMins}
                            onChange={(e) => setCustomMins(e.target.value)}
                            slotProps={{
                                htmlInput: { min: 0, step: 1 },
                                input: {
                                    endAdornment: (
                                        <InputAdornment position='end'>min</InputAdornment>
                                    ),
                                },
                            }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            size='small'
                            label='Increment'
                            type='number'
                            value={customInc}
                            onChange={(e) => setCustomInc(e.target.value)}
                            slotProps={{
                                htmlInput: { min: 0, max: 60, step: 1 },
                                input: {
                                    endAdornment: (
                                        <InputAdornment position='end'>sec</InputAdornment>
                                    ),
                                },
                            }}
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                    {selectedTime === 'custom' && customMinsNum <= 0 && (
                        <Typography
                            variant='caption'
                            color='text.secondary'
                            mt={0.5}
                            display='block'
                        >
                            0 min → Unlimited
                        </Typography>
                    )}
                </Collapse>

                {/* Category legend */}
                <Stack direction='row' flexWrap='wrap' gap={1} mt={0.25}>
                    {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                        <Stack key={cat} direction='row' alignItems='center' spacing={0.4}>
                            <Box
                                sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }}
                            />
                            <Typography variant='caption' color='text.secondary'>
                                {cat}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Stack>

            <Divider />

            {/* Color */}
            <Stack spacing={0.75}>
                <Typography variant='subtitle2' fontWeight='bold' color='text.secondary'>
                    PLAY AS
                </Typography>
                <ToggleButtonGroup
                    value={colorChoice}
                    exclusive
                    onChange={(_, v) => {
                        if (v) setColorChoice(v as ColorChoice);
                    }}
                    size='small'
                    fullWidth
                >
                    <Tooltip title='Play with the White pieces'>
                        <ToggleButton value='white' sx={{ gap: 0.75, flex: 1 }}>
                            <Box
                                sx={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    bgcolor: 'white',
                                    border: '1.5px solid',
                                    borderColor: 'divider',
                                    flexShrink: 0,
                                }}
                            />
                            White
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title='Play with the Black pieces'>
                        <ToggleButton value='black' sx={{ gap: 0.75, flex: 1 }}>
                            <Box
                                sx={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    bgcolor: 'grey.700',
                                    border: '1.5px solid',
                                    borderColor: 'divider',
                                    flexShrink: 0,
                                }}
                            />
                            Black
                        </ToggleButton>
                    </Tooltip>
                    <ToggleButton value='random' sx={{ flex: 1 }}>
                        Random
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <Divider />

            {/* Sparring position picker */}
            <SparringPositionPicker onSelect={handleSparringSelect} />

            <Divider />

            {/* Custom FEN */}
            <Stack spacing={0.75}>
                <Button
                    size='small'
                    variant='text'
                    color='inherit'
                    onClick={() => setShowFen((v) => !v)}
                    endIcon={showFen ? <ExpandLess /> : <ExpandMore />}
                    sx={{
                        alignSelf: 'flex-start',
                        px: 0,
                        color: 'text.secondary',
                        textTransform: 'none',
                    }}
                >
                    <Typography variant='subtitle2' fontWeight='bold'>
                        CUSTOM POSITION (FEN)
                    </Typography>
                </Button>
                <Collapse in={showFen}>
                    <Stack spacing={1}>
                        <TextField
                            size='small'
                            fullWidth
                            placeholder='Paste FEN string…'
                            value={fenInput}
                            onChange={(e) => handleFenChange(e.target.value)}
                            error={!!fenError}
                            helperText={
                                fenError || 'Leave blank to start from the initial position'
                            }
                            slotProps={{
                                htmlInput: {
                                    style: { fontFamily: 'monospace', fontSize: '0.75rem' },
                                },
                            }}
                        />
                        {fenInput.trim() && !fenError && (
                            <Alert severity='success' sx={{ py: 0 }}>
                                Valid position — game will start from this FEN
                            </Alert>
                        )}
                        {fenInput.trim() && (
                            <Button
                                size='small'
                                variant='text'
                                color='inherit'
                                onClick={() => {
                                    setFenInput('');
                                    setFenError('');
                                }}
                                sx={{ alignSelf: 'flex-start', px: 0, color: 'text.secondary' }}
                            >
                                Clear
                            </Button>
                        )}
                    </Stack>
                </Collapse>
            </Stack>

            <Divider />

            <Button
                variant='contained'
                size='large'
                startIcon={<PlayArrow />}
                onClick={handleStart}
                disabled={!!fenError || !customValid}
                fullWidth
            >
                Play vs Maia {maiaRating}
            </Button>
        </Stack>
    );
}
