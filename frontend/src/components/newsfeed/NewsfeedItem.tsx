import { useApi } from '@/api/Api';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import { Card, CardContent } from '@mui/material';
import CommentEditor from '../comments/CommentEditor';
import { CompactNewsfeedItem } from './CompactNewsfeedItem';

export const isRestDayEntry = (entry: TimelineEntry) =>
    entry.requirementId === TimelineSpecialRequirementId.RestDay;

/**
 * Whether an entry only took progress away (a task marked not done, a lower count,
 * or time removed). These are corrections, not news, so the newsfeed leaves them out.
 */
export const isNegativeEntry = (entry: TimelineEntry) =>
    entry.newCount <= entry.previousCount &&
    entry.minutesSpent <= 0 &&
    (entry.newCount < entry.previousCount || entry.minutesSpent < 0);

interface NewsfeedItemProps {
    entry: TimelineEntry;
    onEdit: (entry: TimelineEntry) => void;
    maxComments?: number;
    onChangeActivity?: (entry: TimelineEntry) => void;
}

/**
 * A newsfeed entry on the newsfeed page: the same entry as the profile's feed,
 * in its own card, with a box to comment on it beside the reactions.
 */
const NewsfeedItem: React.FC<NewsfeedItemProps> = ({
    entry,
    onEdit,
    maxComments,
    onChangeActivity,
}) => {
    const api = useApi();

    return (
        <Card variant='outlined'>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 1.5 } }}>
                <CompactNewsfeedItem
                    entry={entry}
                    onEdit={onEdit}
                    maxComments={maxComments}
                    onChangeActivity={onChangeActivity}
                    commentBox={
                        <CommentEditor
                            createFunctionProps={{ owner: entry.owner, id: entry.id }}
                            createFunction={api.createNewsfeedComment}
                            onSuccess={onEdit}
                            compact
                        />
                    }
                />
            </CardContent>
        </Card>
    );
};

export default NewsfeedItem;
