import { CommentType, EventType } from '@jackstenglein/chess';
import { MoreHoriz } from '@mui/icons-material';
import {
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    SvgIcon,
    ToggleButton,
    Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useReconcile } from '../../../Board';
import { useInlineComment } from '../../InlineCommentEditor';
import {
    evalNags,
    getNagInSet,
    getNagsInSet,
    moveNags,
    nags,
    positionalNags,
    setNagInSet,
    setNagsInSet,
} from '../../Nag';
import { nagIcons } from '../../NagIcon';
import { useChess } from '../../PgnBoard';
import MoveControls, { getNullMoveStatus } from './MoveControls';
import { UnderboardApi } from './Underboard';

// Two 24px rows, padding, and the gap above the controls.
export const NAG_CONTROLS_HEIGHT = 56;

export default function NagControls({
    underboardRef: _underboardRef,
}: {
    underboardRef: React.RefObject<UnderboardApi | null>;
}) {
    const { chess } = useChess();
    const reconcile = useReconcile();
    const { editing, start: startComment } = useInlineComment();
    const t = useTranslations('analysisBoard.underboard');
    const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
    const [, setForceRender] = useState(0);

    useEffect(() => {
        if (!chess) return;
        const observer = {
            types: [EventType.LegalMove, EventType.NewVariation, EventType.UpdateNags],
            handler: () => setForceRender((value) => value + 1),
        };
        chess.addObserver(observer);
        return () => chess.removeObserver(observer);
    }, [chess]);

    if (!chess) return null;
    const move = chess.currentMove();
    const nullMoveStatus = getNullMoveStatus(chess, t);

    return (
        <Paper
            data-testid='board-nag-controls'
            sx={{
                mt: 0.5,
                p: 0.25,
                display: 'grid',
                gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
                gridAutoRows: '24px',
                '& > span, & > div': { minWidth: 0, display: 'flex' },
                '& .MuiToggleButton-root': {
                    minWidth: 0,
                    boxSizing: 'border-box',
                    px: 0,
                    fontSize: '0.8rem',
                },
                '& .MuiSvgIcon-root': { fontSize: 16 },
            }}
        >
            <div style={{ gridColumn: 'span 3' }}>
                <MoveControls />
            </div>
            {[CommentType.Before, CommentType.After].map((type) => (
                <Tooltip
                    key={type}
                    title={
                        type === CommentType.Before ? 'Add text before move' : 'Add text after move'
                    }
                >
                    <span>
                        <ToggleButton
                            value={type}
                            aria-label={
                                type === CommentType.Before
                                    ? 'Add text before move'
                                    : 'Add text after move'
                            }
                            selected={editing?.move === move && editing?.type === type}
                            onClick={() => startComment(type)}
                            sx={{ width: 1, height: 24, p: 0, borderRadius: 0 }}
                        >
                            <SvgIcon viewBox='0 0 24 24' sx={{ fontSize: 18 }}>
                                <path
                                    d='M8 15l4-11 4 11M9.5 11h5'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                    strokeLinejoin='round'
                                />
                                {type === CommentType.Before ? (
                                    <path
                                        d='M19 20H5m0 0 3-3m-3 3 3 3'
                                        fill='none'
                                        stroke='currentColor'
                                        strokeWidth='1.6'
                                        strokeLinejoin='round'
                                    />
                                ) : (
                                    <path
                                        d='M5 20h14m0 0-3-3m3 3-3 3'
                                        fill='none'
                                        stroke='currentColor'
                                        strokeWidth='1.6'
                                        strokeLinejoin='round'
                                    />
                                )}
                            </SvgIcon>
                        </ToggleButton>
                    </span>
                </Tooltip>
            ))}
            {[
                '$3',
                '$1',
                '$5',
                '$6',
                '$2',
                '$4',
                '$1304',
                '$18',
                '$16',
                '$14',
                '$10',
                '$13',
                '$44',
                '$15',
                '$17',
                '$19',
            ].map((nag) => {
                const nagSet = evalNags.includes(nag)
                    ? evalNags
                    : moveNags.includes(nag)
                      ? moveNags
                      : positionalNags;
                const multi = nagSet === positionalNags;
                const selected = multi
                    ? getNagsInSet(nagSet, move?.nags).includes(nag)
                    : getNagInSet(nagSet, move?.nags) === nag;
                return (
                    <Tooltip key={nag} title={nags[nag].description} disableInteractive>
                        <span>
                            <ToggleButton
                                value={nag}
                                aria-label={nags[nag].description}
                                disabled={!move}
                                selected={selected}
                                onClick={() => {
                                    const current = getNagsInSet(nagSet, move?.nags);
                                    chess.setNags(
                                        multi
                                            ? setNagsInSet(
                                                  selected
                                                      ? current.filter((n) => n !== nag)
                                                      : [...current, nag],
                                                  nagSet,
                                                  move?.nags,
                                              )
                                            : setNagInSet(
                                                  selected ? null : nag,
                                                  nagSet,
                                                  move?.nags,
                                              ),
                                    );
                                    reconcile();
                                }}
                                sx={{
                                    width: 1,
                                    height: 24,
                                    p: 0,
                                    borderRadius: 0,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                }}
                            >
                                {nag === '$44' ? (
                                    <span
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: '7px',
                                            fontSize: 14,
                                        }}
                                        aria-hidden='true'
                                    >
                                        <span>∞</span>
                                        <span>=</span>
                                    </span>
                                ) : nag === '$1304' ? (
                                    <SvgIcon
                                        sx={{
                                            fontSize: 19,
                                            '& circle': { fill: 'background.paper' },
                                        }}
                                        viewBox='0 0 24 24'
                                    >
                                        <rect
                                            x='2'
                                            y='2'
                                            width='20'
                                            height='20'
                                            rx='1'
                                            fill='#ead59a'
                                            stroke='#8b633e'
                                            strokeWidth='1.5'
                                        />
                                        <path d='M2 12h10V2H2zm10 0v10h10V12z' fill='#a77b50' />
                                        <path
                                            d='M8 19v-2l3-4-3 1-2-2 5-6V4l3 2c4 1 4 5 3 8l-1 3v2z'
                                            fill='currentColor'
                                            stroke='#8b633e'
                                            strokeLinejoin='round'
                                        />
                                        <circle cx='12' cy='8.5' r='.8' />
                                    </SvgIcon>
                                ) : (
                                    (nagIcons[nag] ?? nags[nag].label)
                                )}
                            </ToggleButton>
                        </span>
                    </Tooltip>
                );
            })}
            <Tooltip title={t('viewMore')} disableInteractive>
                <span>
                    <ToggleButton
                        value='more'
                        aria-label={t('viewMore')}
                        onClick={(event) => setMoreAnchor(event.currentTarget)}
                        sx={{ width: 1, height: 24, p: 0, borderRadius: 0 }}
                    >
                        <MoreHoriz />
                    </ToggleButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={moreAnchor}
                open={!!moreAnchor}
                onClose={() => setMoreAnchor(null)}
                slotProps={{
                    paper: { sx: { width: 280, maxWidth: 'calc(100vw - 32px)', maxHeight: 360 } },
                    list: {
                        dense: true,
                        sx: {
                            py: 0.5,
                            '& .MuiMenuItem-root': { minHeight: 28, py: 0.25, px: 1.25 },
                            '& .MuiListItemIcon-root': { minWidth: 26, fontSize: 16 },
                            '& .MuiListItemText-primary': {
                                fontSize: '0.8rem',
                                lineHeight: 1.3,
                                whiteSpace: 'normal',
                            },
                        },
                    },
                }}
            >
                {!chess.disableNullMoves && (
                    <MenuItem
                        disabled={nullMoveStatus.disabled}
                        title={nullMoveStatus.tooltip}
                        onClick={() => {
                            chess.move('Z0');
                            reconcile();
                            setMoreAnchor(null);
                        }}
                    >
                        <ListItemIcon>∅</ListItemIcon>
                        <ListItemText>Enter Null Move</ListItemText>
                    </MenuItem>
                )}
                {positionalNags.map((nag) => (
                    <MenuItem
                        key={nag}
                        disabled={!move}
                        selected={getNagsInSet(positionalNags, move?.nags).includes(nag)}
                        onClick={() => {
                            const current = getNagsInSet(positionalNags, move?.nags);
                            chess.setNags(
                                setNagsInSet(
                                    current.includes(nag)
                                        ? current.filter((n) => n !== nag)
                                        : [...current, nag],
                                    positionalNags,
                                    move?.nags,
                                ),
                            );
                            reconcile();
                        }}
                    >
                        <ListItemIcon>{nagIcons[nag] ?? nags[nag].label}</ListItemIcon>
                        <ListItemText>{nags[nag].description}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </Paper>
    );
}
