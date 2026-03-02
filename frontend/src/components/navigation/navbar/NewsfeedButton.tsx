import { Feed } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { Link } from '../Link';

export function NewsfeedButton() {
    return (
        <Tooltip key='newsfeed' title='Newsfeed'>
            <IconButton
                data-cy='newsfeed-button'
                component={Link}
                href='/newsfeed'
                sx={{ color: 'white' }}
            >
                <Feed />
            </IconButton>
        </Tooltip>
    );
}
