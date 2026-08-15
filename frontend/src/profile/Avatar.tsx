import { Avatar as MuiAvatar, SxProps } from '@mui/material';

import { useCache } from '../api/cache/Cache';
import { getConfig } from '../config';
import { Club } from '../database/club';
import { User } from '../database/user';
import { avatarProps, SxSize } from '../style/style';

const picturesBucket = getConfig().media.picturesBucket;

interface AvatarProps {
    /** The user to display an Avatar for. If provided, it overrides username and displayName. */
    user?: User;

    /** The username to display an Avatar for. */
    username?: string;

    /**
     * The displayName of the Avatar. If provided, the Avatar will fallback to displaying the
     * initials if the image cannot be loaded.
     */
    displayName?: string | null;

    /**
     * The size in px of the image.
     * @default 74
     */
    size?: number | SxSize;

    /**
     * The size of the text if there is no image. Only used if size is of type SxSize.
     */
    fontSize?: SxSize;

    /**
     * If provided, this overrides all other parameters to display this image URL instead.
     */
    url?: string;

    /** The sx parameter to pass to the MUI Avatar component. */
    sx?: SxProps;
}

const Avatar: React.FC<AvatarProps> = ({
    user,
    username,
    displayName,
    size,
    fontSize,
    url,
    sx,
}) => {
    const { imageBypass } = useCache();

    if (user) {
        username = user.username;
        displayName = user.displayName;
    }

    if (url === undefined) {
        url = `${picturesBucket}/profile/${username}`;
        if (imageBypass) {
            url += `?${imageBypass}`;
        }
    }

    return (
        <MuiAvatar
            src={url}
            {...avatarProps(displayName || '', size, fontSize, sx)}
            slotProps={{
                img: { crossOrigin: 'anonymous' },
            }}
        />
    );
};

export default Avatar;

interface ClubAvatarProps extends Pick<AvatarProps, 'size' | 'fontSize' | 'url'> {
    /** The club to display an Avatar for. If provided, it overrides id and name. */
    club?: Club;

    /** The id of the the club to display an Avatar for. */
    id?: string;

    /**
     * The name of the club. If provided, the Avatar will fallback to displaying its
     * initials if the image cannot be loaded.
     */
    name?: string;
}

export const ClubAvatar: React.FC<ClubAvatarProps> = ({ club, id, name, size, fontSize, url }) => {
    const { imageBypass } = useCache();
    if (club) {
        id = club.id;
        name = club.name;
    }

    if (url === undefined) {
        url = `${picturesBucket}/clubs/${id}`;
        if (imageBypass) {
            url += `?${imageBypass}`;
        }
    }
    return (
        <MuiAvatar
            src={url}
            {...avatarProps(name || '', size, fontSize)}
            slotProps={{
                img: { crossOrigin: 'anonymous' },
            }}
        />
    );
};
