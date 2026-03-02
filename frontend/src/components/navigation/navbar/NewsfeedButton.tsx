import { Feed } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

export function NewsfeedButton() {
    return (
        <Tooltip key='newsfeed' title='Newsfeed'>
            <IconButton data-cy='newsfeed-button' sx={{ color: 'white' }} href='/newsfeed'>
                <Feed />
            </IconButton>
        </Tooltip>
    );
}
