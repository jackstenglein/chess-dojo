'use client';

import {
    formatEval,
    WC_EVAL_MAX,
    WC_EVAL_MIN,
    WC_EVAL_PRESETS,
    WC_SENSEI_COLORS,
    WcRosterRequest,
    WcSensei,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import ArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PaletteIcon from '@mui/icons-material/PaletteOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import PowerIcon from '@mui/icons-material/PowerSettingsNew';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Popover,
    Slider,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

/** Each step moves an eval by this much. */
const STEP = 0.1;
/** An eval saves this long after the last change, so a run of clicks is one save. */
const SAVE_DELAY_MS = 600;

type SaveStatus = 'idle' | 'pending' | 'saving' | 'error';
type SenseiColor = (typeof WC_SENSEI_COLORS)[number];

interface SenseiPanelProps {
    /** The signed-in sensei. */
    me: string;
    roster: WcSensei[];
    /** Each sensei's eval in force at the shown position. */
    values: Record<string, number | undefined>;
    /** The move the shown position comes after, for the heading. */
    positionLabel: string;
    onScore: (senseiId: string, value: number) => Promise<void>;
    onRoster: (request: WcRosterRequest) => Promise<void>;
}

/**
 * Only senseis see this: a card per sensei. A sensei scores themselves and any
 * guest; the other senseis' cards show their score. Anyone on the roster can
 * be switched on or off and recolored, and guests can be added, renamed and
 * removed.
 */
export function SenseiPanel({
    me,
    roster,
    values,
    positionLabel,
    onScore,
    onRoster,
}: SenseiPanelProps) {
    const [adding, setAdding] = useState(false);

    return (
        <Box data-testid='sensei-control'>
            <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
            >
                <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        Sensei evals
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                        After {positionLabel}
                    </Typography>
                </Box>
                <Button
                    variant='contained'
                    size='small'
                    startIcon={<PersonAddIcon />}
                    onClick={() => setAdding(true)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Add Sensei
                </Button>
            </Stack>
            <Stack spacing={1}>
                {roster.map((s) => (
                    <SenseiCard
                        key={s.id}
                        sensei={s}
                        canScore={s.id === me || s.guest}
                        saved={values[s.id]}
                        positionLabel={positionLabel}
                        onScore={onScore}
                        onRoster={onRoster}
                    />
                ))}
            </Stack>
            <AddSenseiDialog
                open={adding}
                roster={roster}
                onClose={() => setAdding(false)}
                onRoster={onRoster}
            />
        </Box>
    );
}

interface SenseiCardProps {
    sensei: WcSensei;
    canScore: boolean;
    saved?: number;
    positionLabel: string;
    onScore: (senseiId: string, value: number) => Promise<void>;
    onRoster: (request: WcRosterRequest) => Promise<void>;
}

function SenseiCard({
    sensei,
    canScore,
    saved,
    positionLabel,
    onScore,
    onRoster,
}: SenseiCardProps) {
    const [value, setValue] = useState(saved ?? 0);
    const [status, setStatus] = useState<SaveStatus>('idle');
    const busy = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(sensei.name);

    // Follow the saved eval when the position changes or a save lands, but not
    // while this card is still being changed.
    useEffect(() => {
        if (!busy.current) {
            setValue(saved ?? 0);
        }
    }, [saved, positionLabel]);

    useEffect(() => () => clearTimeout(timer.current), []);

    const change = (next: number) => {
        const clamped = Math.max(WC_EVAL_MIN, Math.min(WC_EVAL_MAX, Math.round(next * 10) / 10));
        setValue(clamped);
        setStatus('pending');
        busy.current = true;
        clearTimeout(timer.current);
        // The save goes to the position shown at the change.
        const score = onScore;
        timer.current = setTimeout(() => {
            setStatus('saving');
            score(sensei.id, clamped)
                .then(() => setStatus('idle'))
                .catch(() => setStatus('error'))
                .finally(() => {
                    busy.current = false;
                });
        }, SAVE_DELAY_MS);
    };

    const rename = () => {
        setEditing(false);
        const trimmed = name.trim();
        if (trimmed && trimmed !== sensei.name) {
            void onRoster({ action: 'update', id: sensei.id, name: trimmed });
        } else {
            setName(sensei.name);
        }
    };

    const off = !sensei.active;

    return (
        <Box
            data-testid={`sensei-card-${sensei.id}`}
            sx={{
                border: 1,
                borderColor: 'divider',
                borderLeft: `4px solid ${sensei.color}`,
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                px: 1.5,
                py: 1,
            }}
        >
            {/* Power, name, score with steppers, color, remove */}
            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                <Tooltip title={off ? 'Put on the bar' : 'Take off the bar'}>
                    <IconButton
                        size='small'
                        aria-label={`${sensei.name} on the bar`}
                        aria-pressed={!off}
                        onClick={() =>
                            void onRoster({ action: 'update', id: sensei.id, active: off })
                        }
                        sx={{
                            width: 30,
                            height: 30,
                            bgcolor: off ? 'action.hover' : 'rgba(46, 125, 50, 0.25)',
                            color: off ? 'text.disabled' : 'success.light',
                        }}
                    >
                        <PowerIcon fontSize='small' />
                    </IconButton>
                </Tooltip>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {editing ? (
                        <TextField
                            size='small'
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value.slice(0, 20))}
                            onBlur={rename}
                            onKeyDown={(e) => e.key === 'Enter' && rename()}
                            slotProps={{ htmlInput: { 'aria-label': 'Guest name' } }}
                        />
                    ) : (
                        <Typography
                            noWrap
                            onClick={sensei.guest ? () => setEditing(true) : undefined}
                            title={sensei.guest ? 'Click to rename' : undefined}
                            sx={{
                                fontWeight: 700,
                                cursor: sensei.guest ? 'text' : 'default',
                                opacity: off ? 0.5 : 1,
                            }}
                        >
                            {sensei.name}
                        </Typography>
                    )}
                </Box>

                {canScore && (
                    <Stack sx={{ mr: -0.5 }}>
                        <IconButton
                            size='small'
                            aria-label={`Raise ${sensei.name}'s eval by 0.1`}
                            onClick={() => change(value + STEP)}
                            disabled={value >= WC_EVAL_MAX}
                            sx={{ p: 0, height: 15 }}
                        >
                            <ArrowUpIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                            size='small'
                            aria-label={`Lower ${sensei.name}'s eval by 0.1`}
                            onClick={() => change(value - STEP)}
                            disabled={value <= WC_EVAL_MIN}
                            sx={{ p: 0, height: 15 }}
                        >
                            <ArrowDownIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Stack>
                )}
                <Tooltip
                    title={
                        status === 'error'
                            ? 'Not saved. Change it again to retry.'
                            : status === 'idle'
                              ? saved === undefined
                                  ? 'Not set yet'
                                  : ''
                              : 'Saving…'
                    }
                >
                    <Typography
                        data-testid={`sensei-value-${sensei.id}`}
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            minWidth: 52,
                            textAlign: 'right',
                            color:
                                status === 'error'
                                    ? 'error.main'
                                    : saved === undefined && status === 'idle'
                                      ? 'text.disabled'
                                      : 'text.primary',
                        }}
                    >
                        {formatEval(canScore ? value : (saved ?? 0))}
                    </Typography>
                </Tooltip>

                <Tooltip title='Color'>
                    <IconButton
                        size='small'
                        aria-label={`Change ${sensei.name}'s color`}
                        onClick={(e) => setColorAnchor(e.currentTarget)}
                    >
                        <PaletteIcon fontSize='small' />
                    </IconButton>
                </Tooltip>
                {sensei.guest && (
                    <Tooltip title='Remove guest'>
                        <IconButton
                            size='small'
                            aria-label={`Remove ${sensei.name}`}
                            onClick={() => void onRoster({ action: 'remove', id: sensei.id })}
                        >
                            <DeleteIcon fontSize='small' />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>

            {/* Slider and presets, for senseis this sensei may score */}
            {canScore && (
                <>
                    <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', px: 0.5 }}>
                        <Typography variant='caption' color='text.secondary'>
                            -10
                        </Typography>
                        <Slider
                            size='small'
                            aria-label={`${sensei.name}'s eval`}
                            min={WC_EVAL_MIN}
                            max={WC_EVAL_MAX}
                            step={STEP}
                            value={value}
                            onChange={(_, v) => change(v)}
                            onChangeCommitted={() => {
                                if (document.activeElement instanceof HTMLElement) {
                                    document.activeElement.blur();
                                }
                            }}
                            sx={{
                                color: 'text.secondary',
                                '& .MuiSlider-thumb': { color: '#fff' },
                            }}
                        />
                        <Typography variant='caption' sx={{ color: 'success.light' }}>
                            +10
                        </Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                        {WC_EVAL_PRESETS.map((p) => (
                            <Tooltip key={p.symbol} title={`${p.meaning} (${formatEval(p.value)})`}>
                                <Button
                                    size='small'
                                    onClick={() => change(p.value)}
                                    sx={{
                                        minWidth: 0,
                                        py: 0.25,
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        color: 'text.primary',
                                        bgcolor:
                                            value === p.value ? 'action.selected' : 'action.hover',
                                    }}
                                >
                                    {p.symbol}
                                </Button>
                            </Tooltip>
                        ))}
                    </Box>
                </>
            )}

            <Popover
                open={!!colorAnchor}
                anchorEl={colorAnchor}
                onClose={() => setColorAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <ColorGrid
                    selected={sensei.color}
                    onPick={(c) => {
                        setColorAnchor(null);
                        void onRoster({ action: 'update', id: sensei.id, color: c });
                    }}
                />
            </Popover>
        </Box>
    );
}

function ColorGrid({
    selected,
    onPick,
}: {
    selected: string;
    onPick: (color: SenseiColor) => void;
}) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 28px)', gap: 0.75, p: 1.25 }}>
            {WC_SENSEI_COLORS.map((c) => (
                <Box
                    key={c}
                    component='button'
                    type='button'
                    aria-label={`Color ${c}`}
                    onClick={() => onPick(c)}
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: c,
                        cursor: 'pointer',
                        border: '3px solid',
                        borderColor: c === selected ? 'text.primary' : 'transparent',
                    }}
                />
            ))}
        </Box>
    );
}

function AddSenseiDialog({
    open,
    roster,
    onClose,
    onRoster,
}: {
    open: boolean;
    roster: WcSensei[];
    onClose: () => void;
    onRoster: (request: WcRosterRequest) => Promise<void>;
}) {
    // The first color nobody is using, so a new guest stands out.
    const unused =
        WC_SENSEI_COLORS.find((c) => !roster.some((s) => s.color === c)) ?? WC_SENSEI_COLORS[3];
    const [name, setName] = useState('');
    const [color, setColor] = useState<SenseiColor>(unused);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setName('');
            setColor(unused);
            setError('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when it opens.
    }, [open]);

    const add = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            return;
        }
        try {
            await onRoster({
                action: 'add',
                name: trimmed,
                color,
            });
            onClose();
        } catch {
            setError('Could not add the sensei. Try again.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
            <DialogTitle>Add a guest sensei</DialogTitle>
            <DialogContent>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Guests need no account. Any sensei can set their eval.
                </Typography>
                <TextField
                    autoFocus
                    fullWidth
                    label='Name'
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => e.key === 'Enter' && void add()}
                    error={!!error}
                    helperText={error || undefined}
                />
                <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', mt: 2 }}
                >
                    Color
                </Typography>
                <ColorGrid selected={color} onPick={setColor} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={() => void add()} disabled={!name.trim()}>
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
}
