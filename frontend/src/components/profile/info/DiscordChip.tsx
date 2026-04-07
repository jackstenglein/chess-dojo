import { Link } from '@/components/navigation/Link';
import { FontAwesomeSvgIcon } from '@/style/Icon';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { Chip, SvgIconProps, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';

export function DiscordIcon(props: SvgIconProps) {
    return <FontAwesomeSvgIcon icon={faDiscord} {...props} />;
}

interface DiscordChipProps {
    /** The discord username to display. */
    username?: string;
    /** The discord id associated with the username. */
    id?: string;
}

const DiscordChip: React.FC<DiscordChipProps> = ({ username, id }) => {
    const t = useTranslations('profile.info.chip');

    if (!username) {
        return null;
    }

    return (
        <Tooltip title={id ? t('discordTooltipClickable') : t('discordTooltip')}>
            <Link
                target='_blank'
                rel='noopener'
                href={id ? `https://discord.com/users/${id}` : undefined}
            >
                <Chip
                    icon={<DiscordIcon />}
                    label={username}
                    variant='outlined'
                    color='primary'
                    size='small'
                />
            </Link>
        </Tooltip>
    );
};

export default DiscordChip;
