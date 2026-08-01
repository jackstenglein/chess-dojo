import { getConfig } from '@/config';
import { FontAwesomeSvgIcon } from '@/style/Icon';
import { DiscordIcon } from '@/style/SocialMediaIcons';
import { faPatreon, faSpotify, faTwitch } from '@fortawesome/free-brands-svg-icons';
import { FacebookOutlined, Instagram, X, YouTube } from '@mui/icons-material';
import { IconButton, Stack, Tooltip } from '@mui/material';

const config = getConfig();

const icons = [
    <Tooltip key='twitch' title='Twitch'>
        <IconButton href='http://twitch.tv/chessdojo' target='_blank' rel='noopener'>
            <FontAwesomeSvgIcon icon={faTwitch} sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,

    <Tooltip key='youtube' title='YouTube'>
        <IconButton href='https://www.youtube.com/chessdojo' target='_blank' rel='noopener'>
            <YouTube sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,

    <Tooltip key='discord' title='Discord'>
        <IconButton href={config.discord.url} target='_blank' rel='noopener'>
            <DiscordIcon sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,

    <Tooltip key='twitter' title='Twitter'>
        <IconButton href='https://twitter.com/chessdojo' target='_blank' rel='noopener'>
            <X sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,

    <Tooltip key='spotify' title='Spotify'>
        <IconButton
            href='https://open.spotify.com/show/0TcZHYLLx2KMe33YAgtyS6?si=943acce8c5aa4b1a'
            target='_blank'
            rel='noopener'
        >
            <FontAwesomeSvgIcon icon={faSpotify} sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,

    <Tooltip key='patreon' title='Patreon'>
        <IconButton href='https://www.patreon.com/ChessDojo' target='_blank' rel='noopener'>
            <FontAwesomeSvgIcon icon={faPatreon} sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,

    <Tooltip key='instagram' title='Instagram'>
        <IconButton href='https://www.instagram.com/chessdojo/' target='_blank' rel='noopener'>
            <Instagram sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,

    <Tooltip key='facebook' title='Facebook'>
        <IconButton href='http://facebook.com/chessdojo' target='_blank' rel='noopener'>
            <FacebookOutlined sx={{ color: 'white' }} />
        </IconButton>
    </Tooltip>,
];

const SocialIcons = () => {
    return (
        <Stack
            direction='row'
            sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'center',
            }}
        >
            {icons}
        </Stack>
    );
};

export default SocialIcons;
