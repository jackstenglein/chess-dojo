import { Chess, CommentType, Event, EventType, Move } from '@jackstenglein/chess';
import { Backspace, Edit, MoreHoriz } from '@mui/icons-material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckIcon from '@mui/icons-material/Check';
import {
    Button,
    CardContent,
    FormControlLabel,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    ToggleButtonProps,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import { useReconcile } from '../../../Board';
import {
    Nag,
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
import { BlockBoardKeyboardShortcuts, useChess } from '../../PgnBoard';
import ClockTextField from './clock/ClockTextField';
import { TimeControlDescription } from './clock/TimeControlDescription';
import { DeletePrompt, useDeletePrompt } from './DeletePrompt';
import { TimeControlEditor } from './tags/TimeControlEditor';

interface NagButtonProps extends ToggleButtonProps {
    text: string;
    description: string;
}

const NagButton: React.FC<NagButtonProps> = ({ text, description, ...props }) => {
    return (
        <Tooltip title={description} disableInteractive>
            <span style={{ width: `${100 / 8}%` }}>
                <ToggleButton
                    {...props}
                    sx={{
                        ...props.sx,
                        width: 1,
                    }}
                >
                    <Stack
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography
                            sx={{
                                whiteSpace: 'nowrap',
                                fontSize: '1.3rem',
                                fontWeight: '600',
                            }}
                        >
                            {text}
                        </Typography>
                    </Stack>
                </ToggleButton>
            </span>
        </Tooltip>
    );
};

interface EditorProps {
    focusEditor: boolean;
    setFocusEditor: (v: boolean) => void;
}

type EditorT = ReturnType<typeof useTranslations<'analysisBoard.underboard'>>;

const Editor: React.FC<EditorProps> = ({ focusEditor, setFocusEditor }) => {
    const { chess, config } = useChess();
    const reconcile = useReconcile();
    const [, setForceRender] = useState(0);
    const textFieldRef = useRef<HTMLTextAreaElement>(undefined);
    const [showTimeControlEditor, setShowTimeControlEditor] = useState(false);
    const [commentType, setCommentType] = useState(CommentType.After);
    const { onDelete, deleteAction, onClose: onCloseDelete } = useDeletePrompt(chess);
    const [moreNagAnchorEl, setMoreNagAnchorEl] = useState<HTMLElement>();

    const t = useTranslations('analysisBoard.underboard');

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [
                    EventType.LegalMove,
                    EventType.NewVariation,
                    EventType.UpdateCommand,
                    EventType.UpdateComment,
                    EventType.UpdateNags,
                    EventType.UpdateHeader,
                ],
                handler: (event: Event) => {
                    if (event.type === EventType.UpdateCommand && event.commandName !== 'clk') {
                        return;
                    }
                    if (
                        event.type === EventType.UpdateHeader &&
                        event.headerName !== 'TimeControl'
                    ) {
                        return;
                    }
                    setForceRender((v) => v + 1);
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, setForceRender]);

    useEffect(() => {
        if (focusEditor && textFieldRef.current) {
            textFieldRef.current.focus();
            textFieldRef.current.selectionStart = textFieldRef.current.value.length;
            textFieldRef.current.selectionEnd = textFieldRef.current.selectionStart;
            setFocusEditor(false);
        }
    }, [focusEditor, setFocusEditor]);

    if (!chess) {
        return null;
    }

    const move = chess.currentMove();
    const isMainline = chess.isInMainline(move);

    let comment = '';
    if (!move) {
        comment = chess.pgn.gameComment.comment ?? '';
    } else if (!isMainline && commentType === CommentType.Before) {
        comment = move.commentMove ?? '';
    } else {
        comment = move.commentAfter ?? '';
    }

    const handleExclusiveNag = (nagSet: Nag[]) => (_event: unknown, newNag: string | null) => {
        const newNags = setNagInSet(newNag, nagSet, move?.nags);
        chess.setNags(newNags);
        reconcile();
    };

    const handleMultiNags = (nagSet: Nag[]) => (_event: unknown, newNags: string[]) => {
        chess.setNags(setNagsInSet(newNags, nagSet, move?.nags));
        reconcile();
    };

    const onMoreNags = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setMoreNagAnchorEl(e.currentTarget);
    };

    const onClickMenuNag = (nag: string) => {
        const currentNags = getNagsInSet(positionalNags, move?.nags);
        const index = currentNags.indexOf(nag);
        if (index < 0) {
            currentNags.push(nag);
        } else {
            currentNags.splice(index, 1);
        }
        handleMultiNags(positionalNags)(undefined, currentNags);
    };

    const onNullMove = () => {
        chess.move('Z0');
        reconcile();
    };

    const onUpdateTimeControl = (value: string) => {
        chess.setHeader('TimeControl', value);
        setShowTimeControlEditor(false);
    };

    const takebacksDisabled =
        config?.disableTakebacks === 'both' ||
        (Boolean(move) && config?.disableTakebacks?.[0] === move?.color);

    const nullMoveStatus = getNullMoveStatus(chess, t);

    return (
        <CardContent sx={{ height: { md: 1 } }}>
            <Stack
                spacing={3}
                sx={{
                    mt: move ? 2 : undefined,
                    pb: 2,
                    height: { md: 1 },
                }}
            >
                {move && isMainline ? (
                    <ClockTextField move={move} />
                ) : (
                    !move && (
                        <Stack>
                            <Stack
                                direction='row'
                                spacing={0.5}
                                sx={{
                                    alignItems: 'center',
                                }}
                            >
                                <Typography variant='subtitle1'>{t('timeControl')}</Typography>

                                <Tooltip title={t('editTimeControl')}>
                                    <IconButton
                                        size='small'
                                        sx={{ position: 'relative', top: '-2px' }}
                                        onClick={() => setShowTimeControlEditor(true)}
                                    >
                                        <Edit fontSize='inherit' />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                            <TimeControlDescription
                                timeControls={chess.header().tags.TimeControl?.items || []}
                            />
                        </Stack>
                    )
                )}

                {showTimeControlEditor && (
                    <TimeControlEditor
                        open={showTimeControlEditor}
                        initialItems={chess.header().tags.TimeControl?.items}
                        onCancel={() => setShowTimeControlEditor(false)}
                        onSuccess={onUpdateTimeControl}
                    />
                )}

                <Stack
                    sx={{
                        flexGrow: { md: 1 },
                    }}
                >
                    <TextField
                        inputRef={textFieldRef}
                        label={t('editorComments')}
                        id={BlockBoardKeyboardShortcuts}
                        multiline
                        minRows={isMainline ? 3 : 7}
                        value={comment}
                        spellCheck={true}
                        onChange={(event) =>
                            chess.setComment(
                                event.target.value,
                                isMainline ? CommentType.After : commentType,
                            )
                        }
                        fullWidth
                        sx={{
                            flexGrow: { md: 1 },
                            '& .MuiInputBase-root': {
                                md: {
                                    height: '100%',
                                    '& .MuiInputBase-input': {
                                        height: '100% !important',
                                    },
                                },
                            },
                        }}
                    />

                    {!isMainline && (
                        <RadioGroup
                            row
                            value={commentType}
                            onChange={(e) => setCommentType(e.target.value as CommentType)}
                        >
                            <FormControlLabel
                                value={CommentType.Before}
                                control={<Radio size='small' />}
                                label={t('commentBefore')}
                            />
                            <FormControlLabel
                                value={CommentType.After}
                                control={<Radio size='small' />}
                                label={t('commentAfter')}
                            />
                        </RadioGroup>
                    )}
                </Stack>

                <Stack>
                    <ToggleButtonGroup
                        disabled={!move}
                        exclusive
                        value={getNagInSet(evalNags, chess.currentMove()?.nags)}
                        onChange={handleExclusiveNag(evalNags)}
                        size='small'
                    >
                        {evalNags.map((nag) => (
                            <NagButton
                                key={nag}
                                value={nag}
                                text={nags[nag].label}
                                description={nags[nag].description}
                                sx={{
                                    borderBottomLeftRadius: 0,
                                    borderBottomRightRadius: 0,
                                    borderBottom: 0,
                                }}
                            />
                        ))}
                    </ToggleButtonGroup>

                    <ToggleButtonGroup
                        disabled={!move}
                        exclusive
                        value={getNagInSet(moveNags, chess.currentMove()?.nags)}
                        onChange={handleExclusiveNag(moveNags)}
                        size='small'
                    >
                        {moveNags.map((nag) => (
                            <NagButton
                                key={nag}
                                value={nag}
                                text={nags[nag].label}
                                description={nags[nag].description}
                                sx={{
                                    borderTopLeftRadius: 0,
                                    borderTopRightRadius: 0,
                                }}
                            />
                        ))}

                        <Tooltip title={t('viewMore')} disableInteractive>
                            <span style={{ width: `${100 / 8}%` }}>
                                <ToggleButton
                                    value='more'
                                    sx={{ width: 1, height: 1, borderTopRightRadius: 0 }}
                                    onClick={onMoreNags}
                                >
                                    <MoreHoriz />
                                </ToggleButton>
                            </span>
                        </Tooltip>
                    </ToggleButtonGroup>

                    <Menu
                        anchorEl={moreNagAnchorEl}
                        open={!!moreNagAnchorEl}
                        onClose={() => setMoreNagAnchorEl(undefined)}
                    >
                        {positionalNags.map((nag) => (
                            <MenuItem
                                key={nag}
                                onClick={() => onClickMenuNag(nag)}
                                selected={move?.nags?.includes(nag)}
                            >
                                <ListItemIcon>
                                    {nagIcons[nag] ? nagIcons[nag] : nags[nag].label}
                                </ListItemIcon>
                                <ListItemText>{nags[nag].description}</ListItemText>
                            </MenuItem>
                        ))}
                    </Menu>
                </Stack>

                <Stack
                    direction='row'
                    sx={{
                        gap: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    {!chess.disableNullMoves && (
                        <Tooltip title={nullMoveStatus.tooltip}>
                            <span>
                                <Button
                                    disabled={nullMoveStatus.disabled}
                                    onClick={onNullMove}
                                    color='primary'
                                    variant='outlined'
                                >
                                    {t('nullMove')}
                                </Button>
                            </span>
                        </Tooltip>
                    )}

                    <Tooltip title={t('makeMainLine')}>
                        <span>
                            <Button
                                disabled={chess.isInMainline(move) || takebacksDisabled}
                                onClick={() => chess.promoteVariation(move, true)}
                                color='primary'
                                variant='outlined'
                            >
                                <CheckIcon />
                            </Button>
                        </span>
                    </Tooltip>

                    <Tooltip title={t('moveVariationUp')}>
                        <span>
                            <Button
                                disabled={!chess.canPromoteVariation(move) || takebacksDisabled}
                                onClick={() => chess.promoteVariation(move)}
                                color='primary'
                                variant='outlined'
                            >
                                <ArrowUpwardIcon />
                            </Button>
                        </span>
                    </Tooltip>

                    <Tooltip title={t('deleteMovesAfter')}>
                        <span>
                            <Button
                                onClick={() => onDelete(move, 'after')}
                                disabled={!config?.allowMoveDeletion || takebacksDisabled || !move}
                                color='error'
                                variant='outlined'
                            >
                                <Backspace sx={{ transform: 'rotateY(180deg)' }} />
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip
                        title={getDeleteBeforeTooltip(
                            {
                                allowDeleteBefore: config?.allowDeleteBefore,
                                takebacksDisabled,
                                isMainline,
                                move,
                            },
                            t,
                        )}
                    >
                        <span>
                            <Button
                                onClick={() => onDelete(move, 'before')}
                                disabled={
                                    !config?.allowDeleteBefore ||
                                    takebacksDisabled ||
                                    !isMainline ||
                                    !move?.previous
                                }
                                color='error'
                                variant='outlined'
                            >
                                <Backspace />
                            </Button>
                        </span>
                    </Tooltip>
                </Stack>

                {deleteAction && (
                    <DeletePrompt deleteAction={deleteAction} onClose={onCloseDelete} />
                )}
            </Stack>
        </CardContent>
    );
};

export default Editor;

function getNullMoveStatus(chess: Chess, t: EditorT): { disabled: boolean; tooltip: string } {
    if (chess.isCheck()) {
        return {
            disabled: true,
            tooltip: t('nullMoveCheckWarning'),
        };
    }
    if (chess.isGameOver()) {
        return {
            disabled: true,
            tooltip: t('nullMoveGameOverWarning'),
        };
    }
    if (chess.currentMove()?.san === 'Z0') {
        return {
            disabled: true,
            tooltip: t('nullMoveMultipleWarning'),
        };
    }
    return {
        disabled: false,
        tooltip: t('nullMoveDefault'),
    };
}

function getDeleteBeforeTooltip(
    {
        allowDeleteBefore,
        takebacksDisabled,
        isMainline,
        move,
    }: {
        allowDeleteBefore?: boolean;
        takebacksDisabled?: boolean;
        isMainline?: boolean;
        move?: Move | null;
    },
    t: EditorT,
) {
    if (!allowDeleteBefore || takebacksDisabled) {
        return t('deleteBeforeNotAllowed');
    }
    if (!isMainline) {
        return t('deleteBeforeNotMainline');
    }
    if (!move?.previous) {
        return t('deleteBeforeNoFirstMove');
    }
    return t('deleteBefore');
}
