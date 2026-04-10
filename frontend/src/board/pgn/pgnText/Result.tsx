import { Event, EventType } from '@jackstenglein/chess';
import { Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useChess } from '../PgnBoard';

const Result = () => {
    const { chess } = useChess();
    const t = useTranslations('analysisBoard.pgnText');
    const [, setForceRender] = useState(0);

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [EventType.UpdateHeader],
                handler: (event: Event) => {
                    if (event.headerName === 'Result') {
                        setForceRender((v) => v + 1);
                    }
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, setForceRender]);

    const result = chess?.pgn.header.tags.Result;
    if (!result) {
        return null;
    }

    let title = result;
    let description = '';
    if (result === '1-0') {
        description = t('whiteWins');
    } else if (result === '1/2-1/2') {
        title = '½-½';
        description = t('draw');
    } else if (result === '0-1') {
        description = t('blackWins');
    }

    if (!description) {
        return null;
    }

    return (
        <Stack alignItems='center'>
            <Divider sx={{ width: 1 }} />
            <Typography fontWeight='bold' mt={1}>
                {title}
            </Typography>
            <Typography mb={1} fontStyle='italic'>
                {description}
            </Typography>
        </Stack>
    );
};

export default Result;
