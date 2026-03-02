import { formatTime } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { Stack, Typography } from '@mui/material';

interface GraduationNewsfeedItemProps {
    entry: TimelineEntry;
}

const GraduationNewsfeedItem: React.FC<GraduationNewsfeedItemProps> = ({ entry }) => {
    if (!entry.graduationInfo) {
        return (
            <Stack>
                <Typography>
                    <Typography component='span' color='text.secondary'>
                        Graduated from
                    </Typography>{' '}
                    <strong>{entry.cohort}</strong>
                </Typography>
            </Stack>
        );
    }

    return (
        <Stack>
            <Typography>
                <Typography component='span' color='text.secondary'>
                    Graduated from
                </Typography>{' '}
                <strong>{entry.cohort}</strong>{' '}
                <Typography component='span' color='text.secondary'>
                    into
                </Typography>{' '}
                <strong>{entry.graduationInfo.newCohort}</strong>
            </Typography>

            <Stack mt={1} mb={2}>
                <Typography>
                    <Typography component='span' color='text.secondary'>
                        Dojo Score:
                    </Typography>{' '}
                    {Math.round(100 * entry.graduationInfo.dojoScore) / 100}
                </Typography>

                <Typography>
                    <Typography component='span' color='text.secondary'>
                        Dojo Time:
                    </Typography>{' '}
                    {formatTime(entry.graduationInfo.dojoMinutes || 0)}
                </Typography>
                <Typography>
                    <Typography component='span' color='text.secondary'>
                        Non-Dojo Time:
                    </Typography>{' '}
                    {formatTime(entry.graduationInfo.nonDojoMinutes || 0)}
                </Typography>
                <Typography>
                    <Typography component='span' color='text.secondary'>
                        Games Annotated:
                    </Typography>{' '}
                    {entry.graduationInfo.gamesAnnotated ?? 0}
                </Typography>
            </Stack>

            {entry.graduationInfo.comments && (
                <Typography whiteSpace='pre-line'>{entry.graduationInfo.comments}</Typography>
            )}
        </Stack>
    );
};

export default GraduationNewsfeedItem;
