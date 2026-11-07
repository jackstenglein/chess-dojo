import { CommentType, Event, EventType } from '@jackstenglein/chess';
import { Edit } from '@mui/icons-material';
import { CardContent, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { useChess } from '../../PgnBoard';
import ClockTextField from './clock/ClockTextField';
import { TimeControlDescription } from './clock/TimeControlDescription';
import { TimeControlEditor } from './tags/TimeControlEditor';

interface EditorProps {
    requestedCommentType?: CommentType;
    focusEditor: boolean;
    setFocusEditor: (v: boolean) => void;
}

const Editor: React.FC<EditorProps> = () => {
    const { chess } = useChess();
    const [, setForceRender] = useState(0);
    const [showTimeControlEditor, setShowTimeControlEditor] = useState(false);

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

    if (!chess) {
        return null;
    }

    const move = chess.currentMove();
    const isMainline = chess.isInMainline(move);

    const onUpdateTimeControl = (value: string) => {
        chess.setHeader('TimeControl', value);
        setShowTimeControlEditor(false);
    };

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
            </Stack>
        </CardContent>
    );
};

export default Editor;
