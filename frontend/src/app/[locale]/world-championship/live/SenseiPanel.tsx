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
import LinkIcon from '@mui/icons-material/Link';
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
    ListItemText,
    Menu,
    MenuItem,
    Popover,
    Snackbar,
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
    roster: WcSensei[];
    /** Each sensei's eval in force at the shown position. */
    values: Record<string, number | undefined>;
    /** The move the shown position comes after, for the heading. */
    positionLabel: string;
    /** The signed-in sensei. Their own card also gets the chess symbol buttons. */
    me?: string;
    /**
     * Senseis manage the bar: anyone's eval, guests, colors, on and off. A
     * guest from a guest link only changes their own eval. Defaults to true.
     */
    canManage?: boolean;
    onScore: (senseiId: string, value: number) => Promise<void>;
    onRoster: (request: WcRosterRequest) => Promise<void>;
    /** Senseis only: a guest's link, and a new one that turns the old one off. */
    guestLinks?: GuestLinks;
}

export interface GuestLinks {
    get: (guestId: string) => Promise<string>;
    renew: (guestId: string) => Promise<string>;
}

/**
 * Only senseis see this: a card per sensei. Any sensei can set anyone's eval,
 * switch anyone on or off and recolor them; guests can also be added, renamed
 * and removed.
 */
export function SenseiPanel({
    roster,
    values,
    positionLabel,
    me,
    canManage = true,
    onScore,
    onRoster,
    guestLinks,
}: SenseiPanelProps) {
    const [adding, setAdding] = useState(false);

    return (
        <Box data-testid='sensei-control'>
            <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
            >
                <Typography variant='subtitle1' sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    Sensei evals
                </Typography>
                {canManage && (
                    <Button
                        variant='contained'
                        size='small'
                        startIcon={<PersonAddIcon />}
                        onClick={() => setAdding(true)}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Add Sensei
                    </Button>
                )}
            </Stack>
            <Stack spacing={1}>
                {roster.map((s) => (
                    <SenseiCard
                        key={s.id}
                        sensei={s}
                        canScore={canManage || s.id === me}
                        canManage={canManage}
                        mine={s.id === me}
                        guestLinks={canManage && s.guest ? guestLinks : undefined}
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
    canManage: boolean;
    /** The signed-in sensei's own card, which also gets the symbol buttons. */
    mine?: boolean;
    guestLinks?: GuestLinks;
    saved?: number;
    positionLabel: string;
    onScore: (senseiId: string, value: number) => Promise<void>;
    onRoster: (request: WcRosterRequest) => Promise<void>;
}

function SenseiCard({
    sensei,
    canScore,
    canManage,
    mine,
    guestLinks,
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
                {canManage && (
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
                )}

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
                            onClick={sensei.guest && canManage ? () => setEditing(true) : undefined}
                            title={sensei.guest && canManage ? 'Click to rename' : undefined}
                            sx={{
                                fontWeight: 700,
                                cursor: sensei.guest && canManage ? 'text' : 'default',
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

                {guestLinks && <GuestLinkButton guest={sensei} links={guestLinks} />}
                {canManage && (
                    <Tooltip title='Color'>
                        <IconButton
                            size='small'
                            aria-label={`Change ${sensei.name}'s color`}
                            onClick={(e) => setColorAnchor(e.currentTarget)}
                        >
                            <PaletteIcon fontSize='small' />
                        </IconButton>
                    </Tooltip>
                )}
                {canManage && sensei.guest && (
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

            {/* Your own card: one tap to the usual chess symbols */}
            {canScore && mine && (
                <Box
                    data-testid='sensei-presets'
                    sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mt: 1 }}
                >
                    {WC_EVAL_PRESETS.map((p) => (
                        <Tooltip key={p.symbol} title={`${p.meaning} (${formatEval(p.value)})`}>
                            <Button
                                size='small'
                                aria-label={`${p.meaning}, ${formatEval(p.value)}`}
                                onClick={() => change(p.value)}
                                sx={{
                                    minWidth: 0,
                                    py: 0.25,
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: 'text.primary',
                                    bgcolor: value === p.value ? 'action.selected' : 'action.hover',
                                }}
                            >
                                {p.symbol}
                            </Button>
                        </Tooltip>
                    ))}
                </Box>
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

/**
 * For senseis, on a guest's card: copy the guest's link, or make a new one
 * that turns the old one off.
 */
function GuestLinkButton({ guest, links }: { guest: WcSensei; links: GuestLinks }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [message, setMessage] = useState('');
    /** Shown to copy by hand when the browser refuses the clipboard. */
    const [manual, setManual] = useState<string>();
    /**
     * The current link, fetched as the menu opens so "Copy" writes it at once:
     * browsers only allow the clipboard right after a click.
     */
    const [current, setCurrent] = useState<Promise<string>>();

    const open = (el: HTMLElement) => {
        setAnchor(el);
        const fetching = links.get(guest.id);
        fetching.catch(() => undefined);
        setCurrent(fetching);
    };

    const copy = async (make: () => Promise<string>, done: string) => {
        setAnchor(null);
        let link: string;
        try {
            link = await make();
        } catch {
            setMessage('Could not get the link. Try again.');
            return;
        }
        try {
            await navigator.clipboard.writeText(link);
            setMessage(done);
        } catch {
            setManual(link);
        }
    };

    return (
        <>
            <Dialog open={!!manual} onClose={() => setManual(undefined)} fullWidth maxWidth='sm'>
                <DialogTitle>{guest.name}&apos;s guest link</DialogTitle>
                <DialogContent>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
                        Copy this link and send it to {guest.name}. Anyone with it can set{' '}
                        {guest.name}&apos;s eval and use the analysis board.
                    </Typography>
                    <TextField
                        fullWidth
                        size='small'
                        value={manual ?? ''}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'Guest link' } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setManual(undefined)}>Done</Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={!!message}
                message={message}
                autoHideDuration={3000}
                onClose={() => setMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                data-testid='guest-link-copied'
            />
            <Tooltip title={`${guest.name}'s guest link`}>
                <IconButton
                    size='small'
                    aria-label={`${guest.name}'s guest link`}
                    onClick={(e) => open(e.currentTarget)}
                >
                    <LinkIcon fontSize='small' />
                </IconButton>
            </Tooltip>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                <MenuItem
                    onClick={() => void copy(() => current ?? links.get(guest.id), 'Link copied')}
                >
                    <ListItemText
                        primary='Copy guest link'
                        secondary={`Opens the page as ${guest.name}: their eval and the analysis board`}
                    />
                </MenuItem>
                <MenuItem
                    onClick={() =>
                        void copy(
                            () => links.renew(guest.id),
                            'New link copied. The old one no longer works.',
                        )
                    }
                >
                    <ListItemText
                        primary='Make a new link'
                        secondary='The old link stops working'
                    />
                </MenuItem>
            </Menu>
        </>
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
