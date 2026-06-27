'use client';

import { MAIA_RATINGS, MaiaRating } from '@/components/playbot/maiaengine';
import { TimeControl } from '@/components/playbot/PlayBotSetup';
import { PlayerColor } from '@/components/playbot/useMaiaGame';
import { PlayArrow, Stop } from '@mui/icons-material';
import {
    Button,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { getNearestMaiaRating } from './maiaRating';
import { Color, GameFilters } from './PlayerSource';
import { DEFAULT_REPERTOIRE_SPY_MIN_GAMES, useRepertoireSpyPlay } from './RepertoireSpyPlayContext';

export interface RepertoireSpyPlayControlsProps {
    filters: GameFilters;
    performanceRating?: number;
    onStart: (opts: {
        playerColor: PlayerColor;
        maiaRating: MaiaRating;
        minGames: number;
        timeControl: TimeControl;
    }) => void;
}

function getDatabaseColor(filters: GameFilters): PlayerColor {
    if (filters.color === Color.White) {
        return 'white';
    }
    return 'black';
}

function opposite(color: PlayerColor): PlayerColor {
    return color === 'white' ? 'black' : 'white';
}

function parseMaiaRating(value: unknown): MaiaRating {
    const rating = Number(value);
    return MAIA_RATINGS.find((candidate) => candidate === rating) ?? 1500;
}

export function RepertoireSpyPlayControls({
    filters,
    performanceRating,
    onStart,
}: RepertoireSpyPlayControlsProps) {
    const t = useTranslations('analysisBoard.explorer.player');
    const { isPlaying, stopRepertoireSpyGame } = useRepertoireSpyPlay();
    const defaultMaiaRating = useMemo(
        () => getNearestMaiaRating(performanceRating),
        [performanceRating],
    );
    const [maiaRating, setMaiaRating] = useState<MaiaRating>(defaultMaiaRating);
    const [minGames, setMinGames] = useState(DEFAULT_REPERTOIRE_SPY_MIN_GAMES);

    const databaseColor = useMemo(() => getDatabaseColor(filters), [filters]);
    const playerColor = opposite(databaseColor);

    useEffect(() => {
        setMaiaRating(defaultMaiaRating);
    }, [defaultMaiaRating]);

    return (
        <Stack spacing={1.5} mt={2}>
            <Divider />
            <Stack spacing={0.5}>
                <Typography variant='subtitle2' fontWeight='bold'>
                    {t('playModeTitle')}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                    {t('playModeDescription')}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                    {t('databasePlaysLabel', { color: databaseColor })}
                </Typography>
            </Stack>

            <TextField
                type='number'
                size='small'
                label={t('minimumGamesLabel')}
                value={minGames}
                onChange={(event) => setMinGames(Math.max(1, Number(event.target.value) || 1))}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
            />

            <FormControl size='small'>
                <InputLabel>{t('maiaFallbackRatingLabel')}</InputLabel>
                <Select
                    label={t('maiaFallbackRatingLabel')}
                    value={maiaRating}
                    onChange={(event) => setMaiaRating(parseMaiaRating(event.target.value))}
                >
                    {MAIA_RATINGS.map((rating) => (
                        <MenuItem key={rating} value={rating}>
                            {rating}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {isPlaying ? (
                <Button
                    variant='outlined'
                    color='error'
                    startIcon={<Stop />}
                    onClick={stopRepertoireSpyGame}
                >
                    {t('stopPlayModeButton')}
                </Button>
            ) : (
                <Button
                    variant='contained'
                    color='dojoOrange'
                    startIcon={<PlayArrow />}
                    onClick={() =>
                        onStart({
                            playerColor,
                            maiaRating,
                            minGames,
                            timeControl: { initialMs: null, incrementMs: 0 },
                        })
                    }
                >
                    {t('startPlayModeButton')}
                </Button>
            )}
        </Stack>
    );
}
