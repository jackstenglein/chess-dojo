'use client';

import {
    evalToWhiteShare,
    formatEval,
    layoutPins,
    senseiInitial,
    WC_EVAL_MAX,
    WC_EVAL_MIN,
    WC_EVAL_PRESETS,
    WC_SENSEI_COLORS,
    WcPin,
    WcRosterRequest,
    WcSensei,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import {
    Box,
    Button,
    Divider,
    IconButton,
    Paper,
    Popover,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------

/** A sensei's initial in their color, as on the bar. */
export function SenseiPin({ sensei, size = 22 }: { sensei: WcSensei; size?: number }) {
    return (
        <Box
            aria-hidden='true'
            sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                bgcolor: sensei.color,
                color: '#fff',
                border: '2px solid #fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                display: 'grid',
                placeItems: 'center',
                fontSize: size * 0.5,
                fontWeight: 900,
                lineHeight: 1,
                flexShrink: 0,
                textShadow: '0 1px 1px rgba(0,0,0,0.4)',
            }}
        >
            {senseiInitial(sensei.name)}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// The bar
// ---------------------------------------------------------------------------

const BELT = '#111';
const BELT_EDGE = '#d4a017';

/** A black belt tied at the 0 point of the bar: the position is equal here. */
function BeltIcon() {
    return (
        <svg viewBox='0 0 32 20' width='100%' aria-hidden='true' style={{ display: 'block' }}>
            <rect
                x='0'
                y='5'
                width='32'
                height='6'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
            <polygon
                points='13,11 8,20 12,20 16,12'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
            <polygon
                points='19,11 24,20 20,20 16,12'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
            <rect
                x='11.5'
                y='3'
                width='9'
                height='10'
                rx='1.5'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
        </svg>
    );
}

/** Ticks on both sides of equal, on the same curve as the fill. */
const TICKS = [1, 2, 3, 5, 10].flatMap((v) => [v, -v]);

/** Distance from the top of the bar, from 0 to 1, for an eval. */
function evalFromTop(value: number, orientation: 'white' | 'black'): number {
    const white = evalToWhiteShare(value);
    return orientation === 'white' ? 1 - white : white;
}

interface EvalBarProps {
    /** The average of the active senseis with an eval, 0 if none. */
    average: number;
    pins: WcPin[];
    orientation: 'white' | 'black';
}

/**
 * A vertical bar beside the board. White fills up from the bottom for plus
 * scores (when White is at the bottom). A belt marks equal, a red line the
 * average, each sensei's initial sits at their own score, and the average is
 * written at the bottom.
 */
export function EvalBar({ average, pins, orientation }: EvalBarProps) {
    const whiteAtBottom = orientation === 'white';
    const fromTop = (value: number) => evalFromTop(value, orientation);
    const boundary = fromTop(average);
    const placed = layoutPins(
        pins.map((p) => ({ ...p, id: p.sensei.id, share: fromTop(p.value) })),
    );

    return (
        <Box
            data-testid='sensei-eval-bar'
            sx={{
                position: 'relative',
                width: { xs: 26, sm: 34 },
                flexShrink: 0,
                alignSelf: 'stretch',
            }}
        >
            {/* Fill, ticks, belt and line, clipped to the bar */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: '#403d39',
                    borderRadius: 0.5,
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        top: `${boundary * 100}%`,
                        bgcolor: '#f5f5f5',
                        transition: 'top 0.6s ease, bottom 0.6s ease',
                        // White at the top: the white fill runs down to the boundary.
                        ...(whiteAtBottom ? {} : { top: 0, bottom: `${(1 - boundary) * 100}%` }),
                    }}
                />
                {TICKS.map((v) => (
                    <Box
                        key={v}
                        sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${fromTop(v) * 100}%`,
                            // In sx a bare 1 means 100%, so this is pixels.
                            height: '1px',
                            bgcolor: 'rgba(128, 128, 128, 0.8)',
                        }}
                    />
                ))}
                <Box
                    data-testid='eval-bar-belt'
                    sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-40%)',
                    }}
                >
                    <BeltIcon />
                </Box>
                <Box
                    data-testid='eval-bar-line'
                    sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${boundary * 100}%`,
                        height: '2px',
                        mt: '-1px',
                        bgcolor: '#e53935',
                        transition: 'top 0.6s ease',
                    }}
                />
            </Box>

            {/* Sensei pins may spill past the bar when they fan out */}
            {placed.map((p) => (
                <Tooltip
                    key={p.id}
                    title={`${p.sensei.name} ${formatEval(p.value)}`}
                    placement='right'
                >
                    <Box
                        data-testid={`eval-pin-${p.sensei.id}`}
                        sx={{
                            position: 'absolute',
                            top: `${p.share * 100}%`,
                            left: `calc(50% + ${(p.column - (p.columns - 1) / 2) * 20}px)`,
                            transform: 'translate(-50%, -50%)',
                            transition: 'top 0.6s ease',
                            zIndex: 2,
                            cursor: 'default',
                        }}
                    >
                        <SenseiPin sensei={p.sensei} size={20} />
                    </Box>
                </Tooltip>
            ))}

            <Box
                data-testid='eval-bar-score'
                sx={{
                    position: 'absolute',
                    left: 2,
                    right: 2,
                    bottom: 3,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    textAlign: 'center',
                    fontSize: { xs: '0.65rem', sm: '0.85rem' },
                    fontWeight: 900,
                    lineHeight: 1.2,
                    fontVariantNumeric: 'tabular-nums',
                    boxShadow: 2,
                    zIndex: 3,
                }}
            >
                {formatEval(average)}
            </Box>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// The strip above the board
// ---------------------------------------------------------------------------

/** Each active sensei above the board, with the eval they have in force. */
export function SenseiStrip({ roster, pins }: { roster: WcSensei[]; pins: WcPin[] }) {
    return (
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            {roster
                .filter((s) => s.active)
                .map((s) => {
                    const pin = pins.find((p) => p.sensei.id === s.id);
                    return (
                        <Stack
                            key={s.id}
                            data-testid={`sensei-chip-${s.id}`}
                            direction='row'
                            spacing={0.75}
                            sx={{
                                alignItems: 'center',
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 5,
                                py: 0.25,
                                pl: 0.5,
                                pr: 1.25,
                            }}
                        >
                            <SenseiPin sensei={s} size={24} />
                            <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
                            <Typography
                                sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
                            >
                                {pin ? formatEval(pin.value) : '–'}
                            </Typography>
                        </Stack>
                    );
                })}
        </Stack>
    );
}

// ---------------------------------------------------------------------------
// The sensei panel
// ---------------------------------------------------------------------------

/** Each + or - moves an eval by this much. */
const STEP = 0.1;
/** An eval saves this long after the last click, so a run of clicks is one save. */
const SAVE_DELAY_MS = 700;

type SaveStatus = 'idle' | 'pending' | 'saving' | 'error';

interface SenseiPanelProps {
    /** The signed-in sensei. */
    me: string;
    roster: WcSensei[];
    /** Each sensei's eval in force at the shown position. */
    values: Record<string, number | undefined>;
    /** The move the shown position comes after, for the label. */
    positionLabel: string;
    onScore: (senseiId: string, value: number) => Promise<void>;
    onRoster: (request: WcRosterRequest) => Promise<void>;
}

/**
 * Only senseis see this. The pad scores the sensei picked below it (themselves
 * by default, or any guest). The list switches senseis on and off, recolors
 * them, and adds, renames and removes guests.
 */
export function SenseiPanel({
    me,
    roster,
    values,
    positionLabel,
    onScore,
    onRoster,
}: SenseiPanelProps) {
    const [targetId, setTargetId] = useState(me);
    const target = roster.find((s) => s.id === targetId) ?? roster.find((s) => s.id === me);
    const saved = target ? values[target.id] : undefined;

    const [value, setValue] = useState(saved ?? 0);
    const [status, setStatus] = useState<SaveStatus>('idle');
    const busy = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Follow the saved eval when the position or the sensei changes, or a save
    // lands, but not while clicks are still coming in.
    useEffect(() => {
        if (!busy.current) {
            setValue(saved ?? 0);
        }
    }, [saved, positionLabel, targetId]);

    useEffect(() => () => clearTimeout(timer.current), []);

    const change = (next: number) => {
        if (!target) {
            return;
        }
        const clamped = Math.max(WC_EVAL_MIN, Math.min(WC_EVAL_MAX, Math.round(next * 10) / 10));
        setValue(clamped);
        setStatus('pending');
        busy.current = true;
        clearTimeout(timer.current);
        // The save goes to the sensei and position shown at the click.
        const id = target.id;
        const score = onScore;
        timer.current = setTimeout(() => {
            setStatus('saving');
            score(id, clamped)
                .then(() => setStatus('idle'))
                .catch(() => setStatus('error'))
                .finally(() => {
                    busy.current = false;
                });
        }, SAVE_DELAY_MS);
    };

    const caption: Record<SaveStatus, string> = {
        idle:
            saved === undefined ? `After ${positionLabel} · not set yet` : `After ${positionLabel}`,
        pending: 'Saving…',
        saving: 'Saving…',
        error: 'Not saved. Click again to retry.',
    };

    const scorable = (s: WcSensei) => s.id === me || s.guest;

    return (
        <Paper variant='outlined' sx={{ p: 2 }} data-testid='sensei-control'>
            <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                    {target && <SenseiPin sensei={target} size={26} />}
                    <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                        {target?.id === me ? 'Your eval' : `${target?.name ?? ''}'s eval`}
                    </Typography>
                </Stack>
                <Typography
                    variant='caption'
                    color={status === 'error' ? 'error' : 'text.secondary'}
                >
                    {caption[status]}
                </Typography>
            </Stack>

            <Stack
                direction='row'
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'center', mt: 1.5 }}
            >
                <Button
                    aria-label='Lower eval by 0.1'
                    variant='contained'
                    onClick={() => change(value - STEP)}
                    disabled={value <= WC_EVAL_MIN}
                    sx={{ minWidth: 56, fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}
                >
                    −
                </Button>
                <Typography
                    data-testid='sensei-eval-value'
                    sx={{
                        fontSize: '2rem',
                        fontWeight: 900,
                        minWidth: 90,
                        textAlign: 'center',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {formatEval(value)}
                </Typography>
                <Button
                    aria-label='Raise eval by 0.1'
                    variant='contained'
                    onClick={() => change(value + STEP)}
                    disabled={value >= WC_EVAL_MAX}
                    sx={{ minWidth: 56, fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}
                >
                    +
                </Button>
            </Stack>

            <Stack
                direction='row'
                sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}
            >
                {WC_EVAL_PRESETS.map((p) => (
                    <Tooltip key={p.symbol} title={`${p.meaning} (${formatEval(p.value)})`}>
                        <Button
                            size='small'
                            variant={value === p.value ? 'contained' : 'outlined'}
                            onClick={() => change(p.value)}
                            sx={{ minWidth: 44, fontWeight: 800, textTransform: 'none' }}
                        >
                            {p.symbol}
                        </Button>
                    </Tooltip>
                ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.5 }}>
                Senseis on the bar
            </Typography>
            <Stack spacing={0.5}>
                {roster.map((s) => (
                    <RosterRow
                        key={s.id}
                        sensei={s}
                        isMe={s.id === me}
                        selected={s.id === target?.id}
                        value={values[s.id]}
                        onSelect={scorable(s) ? () => setTargetId(s.id) : undefined}
                        onRoster={onRoster}
                    />
                ))}
            </Stack>
            <AddGuest roster={roster} onRoster={onRoster} />
        </Paper>
    );
}

function RosterRow({
    sensei,
    isMe,
    selected,
    value,
    onSelect,
    onRoster,
}: {
    sensei: WcSensei;
    isMe: boolean;
    selected: boolean;
    value?: number;
    onSelect?: () => void;
    onRoster: (request: WcRosterRequest) => Promise<void>;
}) {
    const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(sensei.name);

    const rename = () => {
        setEditing(false);
        const trimmed = name.trim();
        if (trimmed && trimmed !== sensei.name) {
            void onRoster({ action: 'update', id: sensei.id, name: trimmed });
        } else {
            setName(sensei.name);
        }
    };

    return (
        <Stack
            direction='row'
            spacing={1}
            data-testid={`roster-row-${sensei.id}`}
            sx={{
                alignItems: 'center',
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: selected ? 'action.selected' : undefined,
                opacity: sensei.active ? 1 : 0.5,
            }}
        >
            <Tooltip title='Change color'>
                <IconButton
                    size='small'
                    sx={{ p: 0.25 }}
                    onClick={(e) => setColorAnchor(e.currentTarget)}
                    aria-label={`Change ${sensei.name}'s color`}
                >
                    <SenseiPin sensei={sensei} size={24} />
                </IconButton>
            </Tooltip>
            <Popover
                open={!!colorAnchor}
                anchorEl={colorAnchor}
                onClose={() => setColorAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 28px)',
                        gap: 0.75,
                        p: 1.25,
                    }}
                >
                    {WC_SENSEI_COLORS.map((c) => (
                        <Box
                            key={c}
                            component='button'
                            aria-label={`Color ${c}`}
                            onClick={() => {
                                setColorAnchor(null);
                                void onRoster({ action: 'update', id: sensei.id, color: c });
                            }}
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: c,
                                cursor: 'pointer',
                                border: c === sensei.color ? '3px solid' : '2px solid',
                                borderColor: c === sensei.color ? 'text.primary' : 'transparent',
                            }}
                        />
                    ))}
                </Box>
            </Popover>

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {editing ? (
                    <TextField
                        size='small'
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, 20))}
                        onBlur={rename}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                rename();
                            }
                        }}
                        slotProps={{ htmlInput: { 'aria-label': 'Guest name' } }}
                    />
                ) : (
                    <Box
                        component={onSelect ? 'button' : 'span'}
                        onClick={onSelect}
                        sx={{
                            all: 'unset',
                            cursor: onSelect ? 'pointer' : 'default',
                            fontWeight: 600,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={onSelect ? `Score ${sensei.name}` : undefined}
                    >
                        {sensei.name}
                        {isMe ? ' (you)' : sensei.guest ? ' · guest' : ''}
                    </Box>
                )}
            </Box>

            <Typography
                sx={{
                    fontWeight: 800,
                    minWidth: 40,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value === undefined ? '–' : formatEval(value)}
            </Typography>

            {sensei.guest && !editing && (
                <Tooltip title='Rename'>
                    <IconButton
                        size='small'
                        onClick={() => setEditing(true)}
                        aria-label={`Rename ${sensei.name}`}
                    >
                        <EditIcon fontSize='small' />
                    </IconButton>
                </Tooltip>
            )}
            {sensei.guest && (
                <Tooltip title='Remove guest'>
                    <IconButton
                        size='small'
                        onClick={() => void onRoster({ action: 'remove', id: sensei.id })}
                        aria-label={`Remove ${sensei.name}`}
                    >
                        <DeleteIcon fontSize='small' />
                    </IconButton>
                </Tooltip>
            )}
            <Tooltip title={sensei.active ? 'On the bar' : 'Off the bar'}>
                <Switch
                    size='small'
                    checked={sensei.active}
                    onChange={(e) =>
                        void onRoster({ action: 'update', id: sensei.id, active: e.target.checked })
                    }
                    slotProps={{ input: { 'aria-label': `${sensei.name} on the bar` } }}
                />
            </Tooltip>
        </Stack>
    );
}

function AddGuest({
    roster,
    onRoster,
}: {
    roster: WcSensei[];
    onRoster: (request: WcRosterRequest) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    // The first color nobody is using, so a new guest stands out.
    const color =
        WC_SENSEI_COLORS.find((c) => !roster.some((s) => s.color === c)) ?? WC_SENSEI_COLORS[3];

    const add = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            return;
        }
        setError('');
        try {
            await onRoster({ action: 'add', name: trimmed, color });
            setName('');
        } catch {
            setError('Could not add the guest. Try again.');
        }
    };

    return (
        <Stack
            component='form'
            direction='row'
            spacing={1}
            sx={{ mt: 1.5, alignItems: 'flex-start' }}
            onSubmit={(e) => {
                e.preventDefault();
                void add();
            }}
        >
            <TextField
                size='small'
                label='Add a guest sensei'
                placeholder='Name'
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                error={!!error}
                helperText={error || undefined}
                sx={{ flexGrow: 1 }}
            />
            <Button type='submit' variant='outlined' disabled={!name.trim()} sx={{ height: 40 }}>
                Add
            </Button>
        </Stack>
    );
}
