import { useApi } from '@/api/Api';
import { useRequirement } from '@/api/cache/requirements';
import { useAuth } from '@/auth/Auth';
import { ScoreboardDisplay, formatTime } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import ScoreboardProgress from '@/scoreboard/ScoreboardProgress';
import { Edit } from '@mui/icons-material';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { Card, CardContent, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import GameNewsfeedItem from '../../app/[locale]/(scoreboard)/newsfeed/(detail)/[owner]/[id]/GameNewsfeedItem';
import GraduationNewsfeedItem from '../../app/[locale]/(scoreboard)/newsfeed/(detail)/[owner]/[id]/GraduationNewsfeedItem';
import CommentEditor from '../comments/CommentEditor';
import CommentList from '../comments/CommentList';
import NewsfeedItemHeader from './NewsfeedItemHeader';
import ReactionList from './ReactionList';

export const isRestDayEntry = (entry: TimelineEntry) =>
    entry.requirementId === TimelineSpecialRequirementId.RestDay;

interface NewsfeedItemProps {
    entry: TimelineEntry;
    onEdit: (entry: TimelineEntry) => void;
    maxComments?: number;
    onChangeActivity?: (entry: TimelineEntry) => void;
}

const NewsfeedItem: React.FC<NewsfeedItemProps> = ({
    entry,
    onEdit,
    maxComments,
    onChangeActivity,
}) => {
    const t = useTranslations('newsfeed');
    const api = useApi();
    const { user } = useAuth();

    const isCurrentUser = entry.owner === user?.username;

    return (
        <Card
            variant='outlined'
            sx={{
                borderRadius: 3,
                boxShadow: 1,
                transition: 'box-shadow 0.2s ease',
                '&:hover': { boxShadow: 3 },
            }}
        >
            <CardContent>
                <Stack>
                    <NewsfeedItemHeader entry={entry} />
                    <NewsfeedItemBody entry={entry} />

                    <Stack
                        direction='row'
                        sx={{
                            gap: 1,
                            mt: 1,
                            flexWrap: 'wrap',
                        }}
                    >
                        {isCurrentUser && onChangeActivity && (
                            <Tooltip title={t('editActivity')}>
                                <IconButton color='primary' onClick={() => onChangeActivity(entry)}>
                                    <Edit />
                                </IconButton>
                            </Tooltip>
                        )}

                        <ReactionList
                            owner={entry.owner}
                            id={entry.id}
                            reactions={entry.reactions}
                            onEdit={onEdit}
                        />
                    </Stack>

                    <Divider sx={{ width: 1, mt: 1, mb: 2 }} />

                    <CommentList
                        comments={entry.comments}
                        maxComments={maxComments}
                        viewCommentsLink={`/newsfeed/${entry.owner}/${entry.id}`}
                    />
                    <CommentEditor
                        createFunctionProps={{ owner: entry.owner, id: entry.id }}
                        createFunction={api.createNewsfeedComment}
                        onSuccess={onEdit}
                    />
                </Stack>
            </CardContent>
        </Card>
    );
};

/** A compact "before → after" stat pill, e.g. Dojo Points: 45 → 50. */
function StatDelta({
    label,
    from,
    to,
}: {
    label: string;
    from: number | string;
    to: number | string;
}) {
    return (
        <Stack
            direction='row'
            spacing={0.75}
            sx={{
                alignItems: 'center',
                bgcolor: 'action.hover',
                borderRadius: 5,
                py: 0.5,
                px: 1.25,
            }}
        >
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {label}
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {from}
            </Typography>
            <ArrowRightAltIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant='body2' sx={{ fontWeight: 700 }}>
                {to}
            </Typography>
        </Stack>
    );
}

const NewsfeedItemBody: React.FC<Omit<NewsfeedItemProps, 'onEdit'>> = ({ entry }) => {
    const t = useTranslations('newsfeed');
    const tCommon = useTranslations('common');
    const { requirement } = useRequirement(entry.requirementId);
    if (entry.requirementId === TimelineSpecialRequirementId.Graduation) {
        return <GraduationNewsfeedItem entry={entry} />;
    }
    if (entry.requirementId === TimelineSpecialRequirementId.GameSubmission) {
        return <GameNewsfeedItem entry={entry} />;
    }

    const isComplete = entry.newCount >= entry.totalCount;
    const isSlider =
        entry.scoreboardDisplay === ScoreboardDisplay.ProgressBar ||
        entry.scoreboardDisplay === ScoreboardDisplay.Yearly ||
        entry.scoreboardDisplay === ScoreboardDisplay.Minutes ||
        entry.scoreboardDisplay === ScoreboardDisplay.Unspecified;

    return (
        <Stack spacing={0.5}>
            <Typography>
                {t.rich(isComplete ? 'completedRequirement' : 'updatedRequirement', {
                    name: entry.requirementName,
                    strong: (chunks) => <strong>{chunks}</strong>,
                })}
            </Typography>

            {(entry.dojoPoints > 0 || entry.totalDojoPoints > 0 || entry.totalMinutesSpent > 0) && (
                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, pt: 0.5 }}>
                    {(entry.dojoPoints > 0 || entry.totalDojoPoints > 0) && (
                        <StatDelta
                            label={t('dojoPoints')}
                            from={
                                Math.round(100 * (entry.totalDojoPoints - entry.dojoPoints)) / 100
                            }
                            to={Math.round(100 * entry.totalDojoPoints) / 100}
                        />
                    )}

                    {entry.totalMinutesSpent > 0 && entry.minutesSpent > 0 && (
                        <StatDelta
                            label={t('totalTime')}
                            from={formatTime(entry.totalMinutesSpent - entry.minutesSpent, tCommon)}
                            to={formatTime(entry.totalMinutesSpent, tCommon)}
                        />
                    )}
                </Stack>
            )}

            {isSlider && (
                <ScoreboardProgress
                    value={entry.newCount}
                    min={requirement?.startCount || 0}
                    max={entry.totalCount}
                    suffix={entry.progressBarSuffix}
                />
            )}

            {entry.notes && (
                <Typography
                    sx={{
                        py: 2,
                        whiteSpace: 'pre-line',
                    }}
                >
                    {entry.notes}
                </Typography>
            )}
        </Stack>
    );
};

export default NewsfeedItem;
