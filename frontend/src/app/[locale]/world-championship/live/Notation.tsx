'use client';

import { AnalysisNode } from '@jackstenglein/chess-dojo-common/src/wcLive/analysis';
import PromoteIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import PlayIcon from '@mui/icons-material/PlayArrow';
import { Box, ListItemIcon, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import { formatSpent, LiveMove } from './lichessFeed';

interface NotationProps {
    root: AnalysisNode;
    /** The node on the board. */
    current: AnalysisNode;
    /** The main line from Lichess, for the time each move took. */
    moves: LiveMove[];
    /** The viewer's guesses by ply, to mark the ones they got right. */
    guesses: Record<string, string>;
    onSelect: (node: AnalysisNode) => void;
    /** Shown when the board is not on the live position: takes it back there. */
    onLive?: () => void;
    /** Senseis only: right-click a variation move to promote or delete it. */
    onPromote?: (node: AnalysisNode) => void;
    onDelete?: (node: AnalysisNode) => void;
}

function samePath(a: AnalysisNode, b: AnalysisNode): boolean {
    return a.path.length === b.path.length && a.path.every((m, i) => b.path[i] === m);
}

function moveNumber(node: AnalysisNode): number {
    return Math.ceil(node.ply / 2);
}

/** Children of a node that are not the main line: the variations from it. */
function variationsFrom(node: AnalysisNode): AnalysisNode[] {
    return node.children.filter((c) => !c.mainline);
}

/**
 * The game in the style of ChessBase: the main line in rows of two moves with
 * the time each took, and the senseis' variations as indented lines under
 * the move they branch from, with deeper variations in brackets.
 */
export function Notation({
    root,
    current,
    moves,
    guesses,
    onSelect,
    onLive,
    onPromote,
    onDelete,
}: NotationProps) {
    const [menu, setMenu] = useState<{ node: AnalysisNode; x: number; y: number }>();
    const scroller = useRef<HTMLDivElement>(null);

    // Keep the move on the board in view.
    useEffect(() => {
        const el = scroller.current?.querySelector('[data-current="true"]');
        el?.scrollIntoView({ block: 'nearest' });
    }, [current]);

    const mainline: AnalysisNode[] = [];
    for (let n = root.children.find((c) => c.mainline); n; n = n.children.find((c) => c.mainline)) {
        mainline.push(n);
    }

    const mainCell = (node: AnalysisNode | undefined, placeholder: boolean) => {
        if (!node) {
            return <Box sx={{ px: 1 }}>{placeholder ? '…' : ''}</Box>;
        }
        const spent = moves[node.ply - 1]?.spent;
        const guessedRight = guesses[node.ply] === node.uci;
        const isCurrent = samePath(node, current);
        return (
            <Box
                component='button'
                data-current={isCurrent}
                onClick={() => onSelect(node)}
                sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontSize: '0.9rem',
                    fontWeight: isCurrent ? 800 : 600,
                    bgcolor: isCurrent ? 'action.selected' : undefined,
                    color: guessedRight ? 'success.main' : undefined,
                }}
                title={guessedRight ? 'You guessed this move' : undefined}
            >
                <Stack
                    direction='row'
                    sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
                >
                    <span>
                        {node.san}
                        {guessedRight ? ' ✓' : ''}
                    </span>
                    {spent !== undefined && (
                        <Box
                            component='span'
                            data-testid='move-time'
                            title={`${node.san} took ${formatSpent(spent)}`}
                            sx={{
                                ml: 0.75,
                                fontSize: '0.62rem',
                                fontWeight: 500,
                                color: 'info.main',
                            }}
                        >
                            {formatSpent(spent)}
                        </Box>
                    )}
                </Stack>
            </Box>
        );
    };

    const token = (node: AnalysisNode, withNumber: boolean) => {
        const isCurrent = samePath(node, current);
        const white = node.ply % 2 === 1;
        const prefix = white ? `${moveNumber(node)}.` : withNumber ? `${moveNumber(node)}...` : '';
        return (
            <Box
                key={node.path.join(' ')}
                component='button'
                data-current={isCurrent}
                onClick={() => onSelect(node)}
                onContextMenu={
                    onPromote || onDelete
                        ? (e: React.MouseEvent) => {
                              e.preventDefault();
                              setMenu({ node, x: e.clientX, y: e.clientY });
                          }
                        : undefined
                }
                sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    px: 0.25,
                    borderRadius: 0.5,
                    fontWeight: isCurrent ? 800 : 500,
                    bgcolor: isCurrent ? 'action.selected' : undefined,
                    '&:hover': { textDecoration: 'underline' },
                }}
            >
                {prefix}
                {node.san}
            </Box>
        );
    };

    /** One variation from its first move, with deeper ones in brackets. */
    const line = (first: AnalysisNode): ReactNode[] => {
        const out: ReactNode[] = [];
        let prev: AnalysisNode | undefined;
        let node: AnalysisNode | undefined = first;
        let withNumber = true;
        while (node) {
            if (out.length) {
                out.push(' ');
            }
            out.push(token(node, withNumber));
            withNumber = false;
            if (prev) {
                for (const alt of prev.children.filter((c) => c !== node)) {
                    out.push(
                        ' ',
                        <Fragment key={`(${alt.path.join(' ')}`}>({line(alt)})</Fragment>,
                    );
                    withNumber = true;
                }
            }
            prev = node;
            node = node.children[0];
        }
        return out;
    };

    const variationBlock = (from: AnalysisNode) => {
        const variations = variationsFrom(from);
        if (variations.length === 0) {
            return null;
        }
        return (
            <Box
                key={`v-${from.path.join(' ')}`}
                data-testid='variation-block'
                sx={{
                    gridColumn: '1 / -1',
                    pl: 2,
                    pr: 0.5,
                    py: 0.5,
                    borderLeft: 2,
                    borderColor: 'divider',
                }}
            >
                {variations.map((v) => (
                    <Typography
                        key={v.path.join(' ')}
                        component='div'
                        variant='body2'
                        sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.82rem' }}
                    >
                        {line(v)}
                    </Typography>
                ))}
            </Box>
        );
    };

    // Rows of two main line moves, split where a variation comes in between.
    const rows: ReactNode[] = [];
    let i = 0;
    let parent: AnalysisNode = root;
    while (i < mainline.length) {
        const white = mainline[i];
        const number = moveNumber(white);
        const isWhite = white.ply % 2 === 1;
        if (!isWhite) {
            // A row that starts with Black, after a variation split White's move off.
            rows.push(
                <Fragment key={`r-${white.ply}`}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 0.25 }}>
                        {number}.
                    </Typography>
                    {mainCell(undefined, true)}
                    {mainCell(white, false)}
                </Fragment>,
                variationBlock(parent),
            );
            parent = white;
            i++;
            continue;
        }
        const whiteVariations = variationBlock(parent);
        const black = whiteVariations ? undefined : mainline[i + 1];
        rows.push(
            <Fragment key={`r-${white.ply}`}>
                <Typography variant='body2' color='text.secondary' sx={{ py: 0.25 }}>
                    {number}.
                </Typography>
                {mainCell(white, false)}
                {mainCell(black, !!whiteVariations && i + 1 < mainline.length)}
            </Fragment>,
            whiteVariations,
        );
        if (black) {
            rows.push(variationBlock(white));
            parent = black;
            i += 2;
        } else {
            parent = white;
            i += 1;
        }
    }
    // Variations from the live position: what the senseis expect next.
    rows.push(variationBlock(mainline[mainline.length - 1] ?? root));

    return (
        <Paper variant='outlined' sx={{ p: 1.5, pb: onLive ? 0 : 1.5, overflow: 'hidden' }}>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 0.5,
                    minHeight: 30,
                }}
            >
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                    Moves
                </Typography>
            </Stack>
            {mainline.length === 0 && variationsFrom(root).length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                    No moves yet.
                </Typography>
            ) : (
                <Box
                    ref={scroller}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '36px 1fr 1fr',
                        rowGap: 0.25,
                        maxHeight: { xs: 240, md: 460, lg: 320 },
                        overflowY: 'auto',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {rows}
                </Box>
            )}
            {onLive && (
                // Across the bottom of the notation, as on Lichess.
                <Box
                    component='button'
                    type='button'
                    data-testid='back-to-live'
                    onClick={onLive}
                    sx={{
                        all: 'unset',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        mx: -1.5,
                        mt: 1,
                        width: 'calc(100% + 24px)',
                        py: 1,
                        bgcolor: '#d35400',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        '&:hover': { bgcolor: '#e8650c' },
                        '&:focus-visible': { outline: '2px solid #fff', outlineOffset: -4 },
                    }}
                >
                    <PlayIcon fontSize='small' />
                    Back to live move
                </Box>
            )}
            <Menu
                open={!!menu}
                onClose={() => setMenu(undefined)}
                anchorReference='anchorPosition'
                anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
            >
                {onPromote && (
                    <MenuItem
                        onClick={() => {
                            if (menu) {
                                onPromote(menu.node);
                            }
                            setMenu(undefined);
                        }}
                    >
                        <ListItemIcon>
                            <PromoteIcon fontSize='small' />
                        </ListItemIcon>
                        Promote variation
                    </MenuItem>
                )}
                {onDelete && (
                    <MenuItem
                        onClick={() => {
                            if (menu) {
                                onDelete(menu.node);
                            }
                            setMenu(undefined);
                        }}
                        sx={{ color: 'error.main' }}
                    >
                        <ListItemIcon>
                            <DeleteIcon fontSize='small' color='error' />
                        </ListItemIcon>
                        Delete variation
                    </MenuItem>
                )}
            </Menu>
        </Paper>
    );
}
