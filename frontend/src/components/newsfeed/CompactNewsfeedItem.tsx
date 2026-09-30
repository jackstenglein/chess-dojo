import { useRequirement } from '@/api/cache/requirements';
import { useAuth } from '@/auth/Auth';
import { TaskName } from '@/components/profile/trainingPlan/TaskName';
import { getTaskUnit } from '@/components/profile/trainingPlan/taskUnit';
import { TrainingPlanIcon } from '@/components/profile/trainingPlan/TrainingPlanIcon';
import { formatTime, RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { CategoryColors } from '@/style/ThemeProvider';
import { ChatBubbleOutlineOutlined, Check, Edit } from '@mui/icons-material';
import { Box, Button, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import GameNewsfeedItem from '../../app/[locale]/(scoreboard)/newsfeed/(detail)/[owner]/[id]/GameNewsfeedItem';
import GraduationNewsfeedItem from '../../app/[locale]/(scoreboard)/newsfeed/(detail)/[owner]/[id]/GraduationNewsfeedItem';
import CommentList from '../comments/CommentList';
import { Link } from '../navigation/Link';
import { useEntryDateTime } from './NewsfeedItemHeader';
import ReactionList from './ReactionList';

/** The size of the avatar column; the entry's content lines up to its right. */
const AVATAR_SIZE = 36;
const COLUMN_GAP = 1.5;

/** The author's name, cohort badge and the entry's time, stacked. */
function EntryByline({ entry }: { entry: TimelineEntry }) {
    const t = useTranslations('newsfeed');
    const dateTime = useEntryDateTime(entry);
    const cohort = entry.graduationInfo?.newCohort || entry.cohort;
    return (
        <Stack sx={{ minWidth: 0 }}>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
                    <Link href={`/profile/${entry.owner}`} sx={{ color: 'inherit' }}>
                        {entry.ownerDisplayName}
                    </Link>
                </Typography>
                <CohortIcon cohort={cohort} size={16} tooltip={t('memberOfCohort', { cohort })} />
            </Stack>
            <Typography variant='caption' sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
                {dateTime}
            </Typography>
        </Stack>
    );
}

/** An entry's author and time beside their avatar. */
export function CompactEntryHeader({ entry }: { entry: TimelineEntry }) {
    return (
        <Stack direction='row' sx={{ alignItems: 'center', gap: COLUMN_GAP, minWidth: 0 }}>
            <Avatar
                username={entry.owner}
                displayName={entry.ownerDisplayName}
                size={AVATAR_SIZE}
            />
            <EntryByline entry={entry} />
        </Stack>
    );
}

/**
 * A newsfeed entry sized for a narrow column, laid out like a social feed: the
 * avatar on the left, and beside it who, what they worked on, and how far it
 * moved them. Reactions and comments sit quietly underneath.
 */
export function CompactNewsfeedItem({
    entry,
    onEdit,
    maxComments,
    onChangeActivity,
    commentBox,
    simple,
}: {
    entry: TimelineEntry;
    onEdit: (entry: TimelineEntry) => void;
    maxComments?: number;
    /** A box to comment in, shown beside the reactions in place of the link to comment. */
    commentBox?: React.ReactNode;
    /**
     * The pared-down entry for narrow spaces like the profile sidebar: the task on
     * one line, its bar and count, and what changed, without the category label,
     * percentage or points.
     */
    simple?: boolean;
    /** When given, the owner of the entry gets a button to edit it. */
    onChangeActivity?: (entry: TimelineEntry) => void;
}) {
    const t = useTranslations('newsfeed');
    const { user } = useAuth();
    const link = `/newsfeed/${entry.owner}/${entry.id}`;

    const isGraduation = entry.requirementId === TimelineSpecialRequirementId.Graduation;
    const isGame = entry.requirementId === TimelineSpecialRequirementId.GameSubmission;

    return (
        <Stack
            direction='row'
            sx={{ gap: COLUMN_GAP, alignItems: 'flex-start' }}
            data-testid='compact-newsfeed-item'
        >
            <Avatar
                username={entry.owner}
                displayName={entry.ownerDisplayName}
                size={AVATAR_SIZE}
            />

            <Stack sx={{ gap: 1, flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ mb: 0.75 }}>
                    <EntryByline entry={entry} />
                </Box>

                {isGraduation ? (
                    <GraduationNewsfeedItem entry={entry} />
                ) : isGame ? (
                    <GameNewsfeedItem entry={entry} />
                ) : (
                    <ProgressBody entry={entry} simple={simple} />
                )}

                <Stack
                    direction='row'
                    // Pulled left by the buttons' padding, so their icons line up with
                    // the text above.
                    sx={{ alignItems: 'center', gap: 0.5, ml: '-8px' }}
                >
                    <ReactionList
                        owner={entry.owner}
                        id={entry.id}
                        reactions={entry.reactions}
                        onEdit={onEdit}
                    />
                    {commentBox ? (
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{commentBox}</Box>
                    ) : (
                        <Button
                            href={link}
                            size='small'
                            color='inherit'
                            startIcon={
                                <ChatBubbleOutlineOutlined sx={{ fontSize: '1rem !important' }} />
                            }
                            sx={{ color: 'text.secondary', textTransform: 'none', minWidth: 0 }}
                            data-testid='compact-newsfeed-comment'
                        >
                            {entry.comments?.length ? entry.comments.length : t('comment')}
                        </Button>
                    )}
                    {!commentBox && <Box sx={{ flexGrow: 1 }} />}
                    {onChangeActivity && entry.owner === user?.username && (
                        <Tooltip title={t('editActivity')}>
                            <IconButton
                                size='small'
                                aria-label={t('editActivity')}
                                onClick={() => onChangeActivity(entry)}
                                sx={{ color: 'text.secondary' }}
                                data-testid='compact-newsfeed-edit'
                            >
                                <Edit sx={{ fontSize: '1rem' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>

                {Boolean(entry.comments?.length) && (
                    <CommentList
                        comments={entry.comments}
                        maxComments={maxComments}
                        viewCommentsLink={link}
                    />
                )}
            </Stack>
        </Stack>
    );
}

/** The task worked on: its category icon in the category's colour, and its name. */
function TaskLine({ category, name }: { category: RequirementCategory; name: string }) {
    const tCategory = useTranslations('enums.requirementCategory');
    const color = CategoryColors[category];
    return (
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 0.5 }}>
                <TrainingPlanIcon category={category} sx={{ fontSize: '0.95rem', color }} />
                <Typography
                    variant='caption'
                    sx={{
                        color,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                    }}
                >
                    {tCategory.has(category) ? tCategory(category) : category}
                </Typography>
            </Stack>
            <Typography sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.35 }}>
                <TaskName name={name} iconColor='text.secondary' />
            </Typography>
        </Stack>
    );
}

/**
 * What the entry did to its task: the task, a bar showing where it now stands,
 * the change this entry made ("+5 exercises" or "Completed"), and the time logged.
 */
function ProgressBody({ entry, simple }: { entry: TimelineEntry; simple?: boolean }) {
    const t = useTranslations('newsfeed');
    const tCommon = useTranslations('common');
    const { requirement } = useRequirement(entry.requirementId);

    const isTime = entry.scoreboardDisplay === ScoreboardDisplay.Minutes;
    const hasBar =
        entry.scoreboardDisplay === ScoreboardDisplay.ProgressBar ||
        entry.scoreboardDisplay === ScoreboardDisplay.Yearly ||
        entry.scoreboardDisplay === ScoreboardDisplay.Minutes ||
        entry.scoreboardDisplay === ScoreboardDisplay.Unspecified;
    const isComplete = entry.totalCount > 0 && entry.newCount >= entry.totalCount;

    // Counts are shown from the task's start, as on the training plan: a task
    // starting at puzzle #307 reads 0 until puzzle #307 is solved.
    const start = requirement?.startCount || 0;
    const current = Math.max(entry.newCount - start, 0);
    const total = Math.max(entry.totalCount - start, 0);
    // Only counted tasks show a change in units; a checkbox going from 1 to 0 is
    // "marked not done", not "−1".
    const isCounted = hasBar && !isTime;
    const delta = isCounted ? current - Math.max(entry.previousCount - start, 0) : 0;
    const reopened = !isCounted && !isComplete && entry.newCount < entry.previousCount;
    const percent = total > 0 ? Math.min(100, (100 * current) / total) : 0;
    const color = CategoryColors[entry.requirementCategory] ?? undefined;
    const unit = getTaskUnit({
        progressBarSuffix: entry.progressBarSuffix,
        name: entry.requirementName,
    }).toLowerCase();

    const showBar = hasBar && total > 0;
    const countText = isTime
        ? `${formatTime(current, tCommon)} / ${formatTime(total, tCommon)}`
        : `${current} / ${total}`;

    const changes = (
        <>
            {isComplete ? (
                <Typography
                    variant='caption'
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.25,
                        fontWeight: 600,
                        color: 'success.main',
                    }}
                >
                    <Check sx={{ fontSize: '0.9rem' }} />
                    {t('completed')}
                </Typography>
            ) : reopened ? (
                <Typography variant='caption' sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {t('markedNotDone')}
                </Typography>
            ) : (
                delta !== 0 && (
                    <Typography
                        variant='caption'
                        sx={{ fontWeight: 600, color: delta > 0 ? 'success.main' : 'warning.main' }}
                    >
                        {`${delta > 0 ? '+' : '−'}${Math.abs(delta)} ${
                            Math.abs(delta) === 1 ? singularUnit(unit) : unit
                        }`.trim()}
                    </Typography>
                )
            )}
        </>
    );

    if (simple) {
        return (
            <Stack spacing={0.75}>
                {entry.requirementCategory && (
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <TrainingPlanIcon
                            category={entry.requirementCategory}
                            sx={{ fontSize: '1.1rem', color }}
                        />
                        <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.3 }}>
                            <TaskName name={entry.requirementName} iconColor='text.secondary' />
                        </Typography>
                    </Stack>
                )}
                {showBar && (
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                            variant='determinate'
                            value={percent}
                            sx={{
                                flexGrow: 1,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'action.hover',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    backgroundColor: color,
                                },
                            }}
                        />
                        <Typography
                            variant='caption'
                            sx={{
                                fontWeight: 600,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {countText}
                        </Typography>
                    </Stack>
                )}
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', columnGap: 1, flexWrap: 'wrap' }}
                    data-testid='entry-deltas'
                >
                    {changes}
                </Stack>
                {entry.notes && (
                    <Typography
                        variant='body2'
                        sx={{ whiteSpace: 'pre-line', color: 'text.secondary' }}
                    >
                        {entry.notes}
                    </Typography>
                )}
            </Stack>
        );
    }

    return (
        <Stack spacing={1}>
            <Stack
                direction='row'
                sx={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}
            >
                {entry.requirementCategory && (
                    <TaskLine category={entry.requirementCategory} name={entry.requirementName} />
                )}
                {showBar && (
                    <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 600,
                                fontSize: '1rem',
                                lineHeight: 1.35,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {isTime
                                ? `${formatTime(current, tCommon)} / ${formatTime(total, tCommon)}`
                                : `${current} / ${total}`}
                        </Typography>
                    </Stack>
                )}
            </Stack>

            {showBar && (
                <LinearProgress
                    variant='determinate'
                    value={percent}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundColor: color },
                    }}
                />
            )}

            <Stack
                direction='row'
                sx={{ alignItems: 'center', columnGap: 1, flexWrap: 'wrap' }}
                data-testid='entry-deltas'
            >
                {changes}
                {entry.dojoPoints > 0 && <DojoPointsChange entry={entry} />}
                {showBar && (
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                            ml: 'auto',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {percentLabel(percent)}
                    </Typography>
                )}
            </Stack>

            {entry.notes && (
                <Typography
                    variant='body2'
                    sx={{ whiteSpace: 'pre-line', color: 'text.secondary' }}
                >
                    {entry.notes}
                </Typography>
            )}
        </Stack>
    );
}

/**
 * The singular of a task's unit, which the task data gives in the plural:
 * "games" becomes "game", "studies" becomes "study", "matches" becomes "match".
 */
export function singularUnit(unit: string): string {
    if (/ies$/i.test(unit)) {
        return unit.replace(/ies$/i, 'y');
    }
    if (/(ches|shes|sses|xes)$/i.test(unit)) {
        return unit.slice(0, -2);
    }
    if (/[^s]s$/i.test(unit)) {
        return unit.slice(0, -1);
    }
    return unit;
}

/** A share of a task done, with small shares kept visible: "0.3%" rather than "0%". */
function percentLabel(percent: number): string {
    if (percent > 0 && percent < 1) {
        return `${Math.round(percent * 10) / 10}%`;
    }
    return `${Math.round(percent)}%`;
}

/** Rounds points for display: 12.5, 0.05, 3. */
function formatPoints(points: number): string {
    return `${Math.round(100 * points) / 100}`;
}

/** The entry's Dojo points as a before → after change, e.g. "Dojo points 1 → 5". */
function DojoPointsChange({ entry }: { entry: TimelineEntry }) {
    const t = useTranslations('newsfeed');
    const before = entry.totalDojoPoints - entry.dojoPoints;
    return (
        <Stack
            direction='row'
            sx={{ alignItems: 'center', gap: 0.5 }}
            data-testid='entry-dojo-points'
        >
            <ChessDojoIcon sx={{ fontSize: '1rem', color: 'text.primary' }} aria-hidden />
            <Typography variant='caption' sx={{ color: 'text.primary' }}>
                {t('dojoPointsLabel')}
            </Typography>
            <Typography
                variant='caption'
                sx={{ color: 'text.primary', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            >
                {formatPoints(before)} → {formatPoints(entry.totalDojoPoints)}
            </Typography>
        </Stack>
    );
}
