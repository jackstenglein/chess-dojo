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
        <Card variant='outlined'>
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

            {(entry.dojoPoints > 0 || entry.totalDojoPoints > 0) && (
                <Stack direction='row' spacing={1}>
                    <Typography
                        component='span'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('dojoPoints')}
                    </Typography>
                    <Typography>
                        {Math.round(100 * (entry.totalDojoPoints - entry.dojoPoints)) / 100}
                    </Typography>
                    <ArrowRightAltIcon sx={{ color: 'text.secondary' }} />
                    <Typography>{Math.round(100 * entry.totalDojoPoints) / 100}</Typography>
                </Stack>
            )}

            {entry.totalMinutesSpent > 0 && entry.minutesSpent > 0 && (
                <Stack direction='row' spacing={1}>
                    <Typography
                        component='span'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('totalTime')}
                    </Typography>
                    <Typography>
                        {formatTime(entry.totalMinutesSpent - entry.minutesSpent, tCommon)}
                    </Typography>
                    <ArrowRightAltIcon sx={{ color: 'text.secondary' }} />
                    <Typography>{formatTime(entry.totalMinutesSpent, tCommon)}</Typography>
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
