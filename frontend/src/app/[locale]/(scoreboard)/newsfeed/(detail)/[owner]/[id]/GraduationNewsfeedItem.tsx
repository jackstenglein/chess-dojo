import { formatTime } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

interface GraduationNewsfeedItemProps {
    entry: TimelineEntry;
}

const richTags = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
};

const GraduationNewsfeedItem: React.FC<GraduationNewsfeedItemProps> = ({ entry }) => {
    const t = useTranslations('newsfeed.graduation');
    const tCommon = useTranslations('common');

    if (!entry.graduationInfo) {
        return (
            <Stack>
                <Typography
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {t.rich('graduatedFrom', {
                        ...richTags,
                        cohort: entry.cohort,
                    })}
                </Typography>
            </Stack>
        );
    }

    return (
        <Stack>
            <Typography
                sx={{
                    color: 'text.secondary',
                }}
            >
                {t.rich('graduated', {
                    ...richTags,
                    oldCohort: entry.cohort,
                    newCohort: entry.graduationInfo.newCohort,
                })}
            </Typography>

            <Stack
                sx={{
                    mt: 1,
                    mb: 2,
                }}
            >
                <Typography>
                    <Typography
                        component='span'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('dojoScore')}
                    </Typography>{' '}
                    {Math.round(100 * entry.graduationInfo.dojoScore) / 100}
                </Typography>

                <Typography>
                    <Typography
                        component='span'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('dojoTime')}
                    </Typography>{' '}
                    {formatTime(entry.graduationInfo.dojoMinutes || 0, tCommon)}
                </Typography>
                <Typography>
                    <Typography
                        component='span'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('nonDojoTime')}
                    </Typography>{' '}
                    {formatTime(entry.graduationInfo.nonDojoMinutes || 0, tCommon)}
                </Typography>
                <Typography>
                    <Typography
                        component='span'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('gamesAnnotated')}
                    </Typography>{' '}
                    {entry.graduationInfo.gamesAnnotated ?? 0}
                </Typography>
            </Stack>

            {entry.graduationInfo.comments && (
                <Typography
                    sx={{
                        whiteSpace: 'pre-line',
                    }}
                >
                    {entry.graduationInfo.comments}
                </Typography>
            )}
        </Stack>
    );
};

export default GraduationNewsfeedItem;
