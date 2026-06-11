import { PositionComment } from '@/database/game';
import Avatar from '@/profile/Avatar';
import { Stack, Tooltip, Typography } from '@mui/material';

interface InlinePositionCommentsProps {
    comments: PositionComment[];
    inline?: boolean;
}

export default function InlinePositionComments({ comments, inline }: InlinePositionCommentsProps) {
    if (comments.length === 0) {
        return null;
    }

    return (
        <Stack spacing={1.5} px={1} py={0.75}>
            {comments.map((comment) => (
                <Stack
                    key={comment.id}
                    data-testid='inline-position-comment'
                    direction='row'
                    alignItems='flex-start'
                    spacing={0.75}
                >
                    <Tooltip title={`Comment by ${comment.owner.displayName}`}>
                        <span>
                            <Avatar
                                username={comment.owner.username}
                                displayName={comment.owner.displayName}
                                size={24}
                            />
                        </span>
                    </Tooltip>
                    <Typography
                        variant={inline ? 'caption' : 'body2'}
                        color='text.secondary'
                        whiteSpace='pre-line'
                        sx={{ minWidth: 0, wordBreak: 'break-word', paddingTop: '2px' }}
                    >
                        {comment.content.trim()}
                    </Typography>
                </Stack>
            ))}
        </Stack>
    );
}
