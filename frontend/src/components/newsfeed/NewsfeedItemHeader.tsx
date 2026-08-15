import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { dateOlderThanAYear } from '@/components/time/time.ts';
import { RequirementCategory } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { CategoryColors } from '@/style/ThemeProvider';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '../navigation/Link';

interface NewsfeedItemHeaderProps {
    entry: TimelineEntry;
}

const NewsfeedItemHeader: React.FC<NewsfeedItemHeaderProps> = ({ entry }) => {
    const t = useTranslations('newsfeed');
    const { user } = useAuth();

    const timezone = user?.timezoneOverride;
    const timeFormat = user?.timeFormat;

    const createdAt = new Date(entry.date || entry.createdAt);
    const displayYear = dateOlderThanAYear(createdAt) ? createdAt.getFullYear() : '';
    const date = toDojoDateString(createdAt, timezone, 'backward', {
        month: 'long',
        day: 'numeric',
    });
    const time = toDojoTimeString(createdAt, timezone, timeFormat, 'backward', {
        hour: 'numeric',
        minute: '2-digit',
    });

    const category =
        entry.requirementId === TimelineSpecialRequirementId.GameSubmission
            ? RequirementCategory.Games
            : entry.requirementCategory;

    return (
        <Stack
            direction='row'
            sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                rowGap: 1,
            }}
        >
            <Stack
                direction='row'
                spacing={2}
                sx={{
                    alignItems: 'center',
                }}
            >
                <Avatar username={entry.owner} displayName={entry.ownerDisplayName} size={60} />

                <Stack>
                    <Typography>
                        <Link href={`/profile/${entry.owner}`}>{entry.ownerDisplayName}</Link>
                        <CohortIcon
                            cohort={entry.graduationInfo?.newCohort || entry.cohort}
                            size={25}
                            sx={{ marginLeft: '0.6rem', verticalAlign: 'middle' }}
                            tooltip={t('memberOfCohort', {
                                cohort: entry.graduationInfo?.newCohort || entry.cohort,
                            })}
                        />
                    </Typography>

                    <Typography
                        variant='body2'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('dateTime', { date, year: displayYear, time })}
                    </Typography>
                </Stack>
            </Stack>

            {entry.requirementId === 'Graduation' ? (
                <Box sx={{ display: { xs: 'none', sm: 'initial' } }}>
                    <CohortIcon cohort={entry.cohort} size={50} />
                </Box>
            ) : (
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Stack
                        sx={{
                            alignItems: 'end',
                        }}
                    >
                        <Typography sx={{ color: CategoryColors[category] }}>{category}</Typography>
                        {entry.isCustomRequirement && (
                            <Typography
                                variant='body2'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {t('customTask')}
                            </Typography>
                        )}
                        <Typography
                            variant='body2'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            {entry.cohort}
                        </Typography>
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
};

export default NewsfeedItemHeader;
