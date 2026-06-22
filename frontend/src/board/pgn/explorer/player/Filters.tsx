import {
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    Radio,
    RadioGroup,
    Slider,
    Stack,
} from '@mui/material';
import { DateRangePicker, SingleInputDateRangeField } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import {
    Color,
    GameFilters,
    MAX_DOWNLOAD_LIMIT,
    MAX_PLY_COUNT,
    MIN_DOWNLOAD_LIMIT,
    MIN_PLY_COUNT,
    PlayerSource,
} from './PlayerSource';

export interface EditableGameFilters {
    color: Color;
    setColor: (color: Color) => void;
    win: boolean;
    setWin: (value: boolean) => void;
    draw: boolean;
    setDraw: (value: boolean) => void;
    loss: boolean;
    setLoss: (value: boolean) => void;
    rated: boolean;
    setRated: (rated: boolean) => void;
    casual: boolean;
    setCasual: (casual: boolean) => void;
    bullet: boolean;
    setBullet: (bullet: boolean) => void;
    blitz: boolean;
    setBlitz: (blitz: boolean) => void;
    rapid: boolean;
    setRapid: (rapid: boolean) => void;
    classical: boolean;
    setClassical: (classical: boolean) => void;
    daily: boolean;
    setDaily: (daily: boolean) => void;
    opponentRating: [number, number];
    setOpponentRating: (opponentRating: [number, number]) => void;
    downloadLimit: number;
    setDownloadLimit: (downloadLimit: number) => void;
    dateRange: [DateTime | null, DateTime | null];
    setDateRange: (dateRange: [DateTime | null, DateTime | null]) => void;
    plyCount: [number, number];
    setPlyCount: (plyCount: [number, number]) => void;
}

const openingTreeFilters = {
    color: {
        key: 'openingTreeFilters.color',
        default: Color.White,
    },
    win: {
        key: 'openingTreeFilters.win',
        default: true,
    },
    draw: {
        key: 'openingTreeFilters.draw',
        default: true,
    },
    loss: {
        key: 'openingTreeFilters.loss',
        default: true,
    },
    rated: {
        key: 'openingTreeFilters.rated',
        default: true,
    },
    casual: {
        key: 'openingTreeFilters.casual',
        default: true,
    },
    bullet: {
        key: 'openingTreeFilters.bullet',
        default: true,
    },
    blitz: {
        key: 'openingTreeFilters.blitz',
        default: true,
    },
    rapid: {
        key: 'openingTreeFilters.rapid',
        default: true,
    },
    classical: {
        key: 'openingTreeFilters.classical',
        default: true,
    },
    daily: {
        key: 'openingTreeFilters.daily',
        default: true,
    },
    opponentRating: {
        key: 'openingTreeFilters.opponentRating',
        default: [0, 3500] as [number, number],
    },
    downloadLimit: {
        key: 'openingTreeFilters.downloadLimit',
        default: MAX_DOWNLOAD_LIMIT,
    },
    dateRange: {
        key: 'openingTreeFilters.dateRange',
        default: [null, null] as [DateTime | null, DateTime | null],
    },
    plyCount: {
        key: 'openingTreeFilters.plyCount',
        default: [MIN_PLY_COUNT, MAX_PLY_COUNT] as [number, number],
    },
} as const;

export function useGameFilters(sources: PlayerSource[]): [EditableGameFilters, GameFilters] {
    const [color, setColor] = useLocalStorage<Color>(
        openingTreeFilters.color.key,
        openingTreeFilters.color.default,
    );
    const [win, setWin] = useLocalStorage<boolean>(
        openingTreeFilters.win.key,
        openingTreeFilters.win.default,
    );
    const [draw, setDraw] = useLocalStorage<boolean>(
        openingTreeFilters.draw.key,
        openingTreeFilters.draw.default,
    );
    const [loss, setLoss] = useLocalStorage<boolean>(
        openingTreeFilters.loss.key,
        openingTreeFilters.loss.default,
    );
    const [rated, setRated] = useLocalStorage<boolean>(
        openingTreeFilters.rated.key,
        openingTreeFilters.rated.default,
    );
    const [casual, setCasual] = useLocalStorage<boolean>(
        openingTreeFilters.casual.key,
        openingTreeFilters.casual.default,
    );
    const [bullet, setBullet] = useLocalStorage<boolean>(
        openingTreeFilters.bullet.key,
        openingTreeFilters.bullet.default,
    );
    const [blitz, setBlitz] = useLocalStorage<boolean>(
        openingTreeFilters.blitz.key,
        openingTreeFilters.blitz.default,
    );
    const [rapid, setRapid] = useLocalStorage<boolean>(
        openingTreeFilters.rapid.key,
        openingTreeFilters.rapid.default,
    );
    const [classical, setClassical] = useLocalStorage<boolean>(
        openingTreeFilters.classical.key,
        openingTreeFilters.classical.default,
    );
    const [daily, setDaily] = useLocalStorage<boolean>(
        openingTreeFilters.daily.key,
        openingTreeFilters.daily.default,
    );
    const [opponentRating, setOpponentRating] = useLocalStorage<[number, number]>(
        openingTreeFilters.opponentRating.key,
        openingTreeFilters.opponentRating.default,
    );
    const [downloadLimit, setDownloadLimit] = useLocalStorage<number>(
        openingTreeFilters.downloadLimit.key,
        openingTreeFilters.downloadLimit.default,
    );
    const [dateRange, setDateRange] = useLocalStorage<[DateTime | null, DateTime | null]>(
        openingTreeFilters.dateRange.key,
        openingTreeFilters.dateRange.default,
        {
            serializer(values) {
                return JSON.stringify(values.map((v) => v?.toISO() ?? null));
            },
            deserializer(value) {
                return (JSON.parse(value) as [string | null, string | null]).map(
                    (v: string | null) => (v ? DateTime.fromISO(v) : null),
                ) as [DateTime | null, DateTime | null];
            },
        },
    );
    const [plyCount, setPlyCount] = useLocalStorage<[number, number]>(
        openingTreeFilters.plyCount.key,
        openingTreeFilters.plyCount.default,
    );

    const readonlyFilters: GameFilters = useMemo(() => {
        return {
            color,
            win,
            draw,
            loss,
            rated,
            casual,
            bullet,
            blitz,
            rapid,
            classical,
            daily,
            opponentRating,
            downloadLimit,
            dateRange: [
                dateRange[0]?.toISO()?.replaceAll('-', '.').slice(0, '2025.12.31'.length) ?? '',
                dateRange[1]?.toISO()?.replaceAll('-', '.').slice(0, '2025.12.31'.length) ?? '',
            ],
            plyCount,
            hiddenSources: sources
                .filter((s) => s.hidden)
                .map((s) => ({ ...s, username: s.username.trim().toLowerCase() })),
        };
    }, [
        color,
        win,
        draw,
        loss,
        rated,
        casual,
        bullet,
        blitz,
        rapid,
        classical,
        daily,
        opponentRating,
        downloadLimit,
        dateRange,
        plyCount,
        sources,
    ]);

    return [
        {
            color,
            setColor,
            win,
            setWin,
            draw,
            setDraw,
            loss,
            setLoss,
            rated,
            setRated,
            casual,
            setCasual,
            bullet,
            setBullet,
            blitz,
            setBlitz,
            rapid,
            setRapid,
            classical,
            setClassical,
            daily,
            setDaily,
            opponentRating,
            setOpponentRating,
            downloadLimit,
            setDownloadLimit,
            dateRange,
            setDateRange,
            plyCount,
            setPlyCount,
        },
        readonlyFilters,
    ];
}

export function Filters({ filters }: { filters: EditableGameFilters }) {
    const t = useTranslations('analysisBoard.explorer.player');
    const range = `${filters.plyCount[0] / 2}${filters.plyCount[1] === MAX_PLY_COUNT ? '+' : ` - ${filters.plyCount[1] / 2}`}`;
    return (
        <Stack spacing={2} mt={2}>
            <FormControl>
                <FormLabel>{t('colorLabel')}</FormLabel>
                <RadioGroup
                    row
                    value={filters.color}
                    onChange={(e) => filters.setColor(e.target.value as Color)}
                >
                    <FormControlLabel
                        control={<Radio />}
                        label={t('whiteLabel')}
                        value={Color.White}
                    />
                    <FormControlLabel
                        control={<Radio />}
                        label={t('blackLabel')}
                        value={Color.Black}
                    />
                    <FormControlLabel
                        control={<Radio />}
                        label={t('bothLabel')}
                        value={Color.Both}
                    />
                </RadioGroup>
            </FormControl>

            <FormControl>
                <FormLabel>{t('resultLabel')}</FormLabel>
                <FormGroup row>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.win}
                                onChange={(e) => filters.setWin(e.target.checked)}
                            />
                        }
                        label={t('winLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.draw}
                                onChange={(e) => filters.setDraw(e.target.checked)}
                            />
                        }
                        label={t('drawLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.loss}
                                onChange={(e) => filters.setLoss(e.target.checked)}
                            />
                        }
                        label={t('lossLabel')}
                    />
                </FormGroup>
            </FormControl>

            <FormControl>
                <FormLabel>{t('modeLabel')}</FormLabel>
                <FormGroup row>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.rated}
                                onChange={(e) => filters.setRated(e.target.checked)}
                            />
                        }
                        label={t('ratedLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.casual}
                                onChange={(e) => filters.setCasual(e.target.checked)}
                            />
                        }
                        label={t('casualLabel')}
                    />
                </FormGroup>
            </FormControl>

            <FormControl>
                <FormLabel>{t('timeControlLabel')}</FormLabel>
                <FormGroup row>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.bullet}
                                onChange={(e) => filters.setBullet(e.target.checked)}
                            />
                        }
                        label={t('bulletLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.blitz}
                                onChange={(e) => filters.setBlitz(e.target.checked)}
                            />
                        }
                        label={t('blitzLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.rapid}
                                onChange={(e) => filters.setRapid(e.target.checked)}
                            />
                        }
                        label={t('rapidLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.classical}
                                onChange={(e) => filters.setClassical(e.target.checked)}
                            />
                        }
                        label={t('classicalLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filters.daily}
                                onChange={(e) => filters.setDaily(e.target.checked)}
                            />
                        }
                        label={t('dailyLabel')}
                    />
                </FormGroup>
            </FormControl>

            <DateRangePicker
                defaultValue={filters.dateRange}
                onChange={filters.setDateRange}
                localeText={{ start: t('dateRangeStart'), end: t('dateRangeEnd') }}
                calendars={1}
                slots={{ field: SingleInputDateRangeField }}
                slotProps={{
                    textField: { size: 'small' },
                }}
                disableFuture
                label={t('dateRangeLabel')}
                minDate={DateTime.fromISO('2007-01-01')}
            />

            <FormControl sx={{ pt: 1, px: 1 }}>
                <FormLabel>
                    {t('opponentRatingLabel', {
                        min: filters.opponentRating[0],
                        max: filters.opponentRating[1],
                    })}
                </FormLabel>
                <Slider
                    value={filters.opponentRating}
                    onChange={(_, v) => filters.setOpponentRating(v as [number, number])}
                    valueLabelDisplay='auto'
                    min={0}
                    max={3500}
                    step={100}
                    shiftStep={100}
                />
            </FormControl>

            <FormControl sx={{ pt: 1, px: 1 }}>
                <FormLabel>{t('numberOfMovesLabel', { range })}</FormLabel>
                <Slider
                    value={filters.plyCount}
                    onChange={(_, v) => filters.setPlyCount(v as [number, number])}
                    valueLabelDisplay='auto'
                    valueLabelFormat={(value) => (value === MAX_PLY_COUNT ? 'All' : value / 2)}
                    min={MIN_PLY_COUNT}
                    max={MAX_PLY_COUNT}
                    step={2}
                    shiftStep={2}
                />
            </FormControl>

            <FormControl sx={{ px: 1 }}>
                <FormLabel>
                    {filters.downloadLimit === MAX_DOWNLOAD_LIMIT
                        ? t('allGamesLabel')
                        : t('recentGamesLabel', { count: filters.downloadLimit })}
                </FormLabel>
                <Slider
                    value={filters.downloadLimit}
                    onChange={(_, v) => filters.setDownloadLimit(v)}
                    min={MIN_DOWNLOAD_LIMIT}
                    max={MAX_DOWNLOAD_LIMIT}
                    step={100}
                    shiftStep={100}
                    valueLabelDisplay='auto'
                    valueLabelFormat={(value) => (value === MAX_DOWNLOAD_LIMIT ? 'All' : value)}
                />
            </FormControl>
        </Stack>
    );
}
