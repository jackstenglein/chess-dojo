import { Link } from '@/components/navigation/Link';
import { TimelineEntry } from '@/database/timeline';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

interface GameNewsfeedItemProps {
    entry: TimelineEntry;
}

const GameNewsfeedItem: React.FC<GameNewsfeedItemProps> = ({ entry }) => {
    const t = useTranslations('newsfeed.game');
    const gameInfo = entry.gameInfo;
    const headers = gameInfo?.headers;

    const gameUrl = `/games/${entry.cohort.replaceAll('+', '%2B')}/${gameInfo?.id.replaceAll('?', '%3F')}`;

    return (
        <Stack>
            <Typography mt={1}>
                {t.rich('publishedAnalysis', {
                    link: (chunks: ReactNode) => <Link href={gameUrl}>{chunks}</Link>,
                })}
            </Typography>

            <Stack mt={2.5}>
                <Typography>
                    <Typography component='span' color='text.secondary'>
                        {t('players')}
                    </Typography>{' '}
                    {headers?.White} {headers?.WhiteElo ? `(${headers.WhiteElo})` : ''} -{' '}
                    {headers?.Black} {headers?.BlackElo ? `(${headers.BlackElo})` : ''}
                </Typography>
                {headers?.Date && (
                    <Typography>
                        <Typography component='span' color='text.secondary'>
                            {t('date')}
                        </Typography>{' '}
                        {headers.Date}
                    </Typography>
                )}
                <Typography>
                    <Typography component='span' color='text.secondary'>
                        {t('result')}
                    </Typography>{' '}
                    {headers?.Result}
                </Typography>
                {headers?.PlyCount && (
                    <Typography>
                        <Typography component='span' color='text.secondary'>
                            {t('moves')}
                        </Typography>{' '}
                        {Math.ceil(parseInt(headers.PlyCount) / 2)}
                    </Typography>
                )}
            </Stack>
        </Stack>
    );
};

export default GameNewsfeedItem;
