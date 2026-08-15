import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Reaction, TimelineEntry } from '@/database/timeline';
import { User } from '@/database/user';
import AddReactionIcon from '@mui/icons-material/AddReaction';
import {
    Button,
    IconButton,
    Menu,
    Paper,
    Stack,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { CSSProperties, useMemo, useState } from 'react';

const ReactionTypes = [
    ':WhiteLogoText:',
    ':DojoHeart:',
    ':JessePOG1:',
    ':YodaKraai:',
    ':LevelUp:',
    ':LetsGo:',
    ':SlowDown:',
    ':Exclam:',
    ':DoubleExclam:',
    ':Mate:',
    '♟️', // Pawn
    '🦖',
    '📈',
    '🥥',
    '💪',
    '🦀',
    '🍉',
    '⚔️', // crossed swords
    '🛠️',
    '\u2764\uFE0F', // heart
    '😃',
    '👍',
    '🤯',
    '🎉',
    '📕',
];

const ReactionTypesToImage = {
    ':LetsGo:':
        'https://cdn.discordapp.com/emojis/1024465432763191447.webp?size=96&quality=lossless',
    ':JessePOG1:':
        'https://cdn.discordapp.com/emojis/998387680826097735.webp?size=96&quality=lossless',
    ':DojoHeart:':
        'https://cdn.discordapp.com/emojis/998387887966007326.webp?size=96&quality=lossless',
    ':WhiteLogoText:':
        'https://cdn.discordapp.com/emojis/1113470918006689863.webp?size=64&quality=lossless',
    ':DoubleExclam:':
        'https://cdn.discordapp.com/emojis/1010005248540168243.webp?size=240&quality=lossless',
    ':Exclam:':
        'https://cdn.discordapp.com/emojis/1010005249450328065.webp?size=240&quality=lossless',
    ':SlowDown:':
        'https://cdn.discordapp.com/emojis/998387885667524689.webp?size=240&quality=lossless',
    ':LevelUp:':
        'https://cdn.discordapp.com/emojis/986602661535170610.webp?size=240&quality=lossless',
    ':YodaKraai:':
        'https://cdn.discordapp.com/emojis/1105292629329055845.webp?size=96&quality=lossless',
    ':Mate:': 'https://cdn.discordapp.com/emojis/1014865134054809651.webp?size=96&quality=lossless',
};

function isReactor(
    user: User | undefined,
    reactions: Record<string, Reaction> | null,
    type: string,
): boolean {
    if (!user || !reactions) {
        return false;
    }
    if (!reactions[user.username]) {
        return false;
    }
    return reactions[user.username].types?.includes(type) || false;
}

function getNewTypes(
    user: User,
    reactions: Record<string, Reaction> | null,
    type: string,
): string[] {
    if (!reactions) {
        return [type];
    }
    if (!reactions[user.username]) {
        return [type];
    }

    const types = reactions[user.username].types?.filter((t) => t !== type) || [];
    if (types.length === (reactions[user.username].types?.length || 0)) {
        return types.concat(type);
    }
    return types;
}

const ReactionEmoji: React.FC<{ type: string; icon?: boolean }> = ({ type, icon }) => {
    const theme = useTheme();

    switch (type) {
        case ':LetsGo:':
        case ':JessePOG1:':
        case ':DojoHeart:':
        case ':WhiteLogoText:':
        case ':DoubleExclam:':
        case ':Exclam:':
        case ':SlowDown:':
        case ':LevelUp:':
        case ':YodaKraai:':
        case ':Mate:': {
            const styles: CSSProperties = {
                objectFit: 'contain',
            };

            if (theme.palette.mode === 'light' && type === ':WhiteLogoText:') {
                styles.filter = 'invert(1)';
            }

            return (
                <img
                    alt={type}
                    width={icon ? '100%' : '20.1833px'}
                    height={icon ? '100%' : '30px'}
                    style={styles}
                    src={ReactionTypesToImage[type]}
                    crossOrigin='anonymous'
                />
            );
        }
    }

    if (icon) return <>{type}</>;

    return (
        <Typography
            sx={{
                fontSize: '1.25rem',
            }}
        >
            {type}
        </Typography>
    );
};

interface ReactionListProps {
    owner: string;
    id: string;
    reactions: Record<string, Reaction> | null;
    onEdit: (entry: TimelineEntry) => void;
}

const ReactionList: React.FC<ReactionListProps> = ({ owner, id, reactions, onEdit }) => {
    const t = useTranslations('newsfeed');
    const { user } = useAuth();
    const api = useApi();
    const request = useRequest();

    const reactionMap = useMemo(() => {
        const reactionMap: Record<string, string[]> = {};
        for (const reaction of Object.values(reactions || {})) {
            for (const type of reaction.types || []) {
                if (reactionMap[type]) {
                    reactionMap[type].push(reaction.displayName);
                } else {
                    reactionMap[type] = [reaction.displayName];
                }
            }
        }
        return reactionMap;
    }, [reactions]);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const onReact = (type: string) => {
        if (!user) {
            return;
        }

        const types = getNewTypes(user, reactions, type);
        request.onStart();
        api.setNewsfeedReaction(owner, id, types)
            .then((resp) => {
                onEdit(resp.data);
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
        handleClose();
    };

    return (
        <>
            <RequestSnackbar request={request} />

            <Tooltip title={t('addReaction')}>
                <IconButton color='primary' onClick={handleClick}>
                    <AddReactionIcon />
                </IconButton>
            </Tooltip>

            {Object.entries(reactionMap).map(([type, reactors]) => (
                <Tooltip key={type} title={t('reactedBy', { names: reactors.join(', ') })}>
                    <Button
                        variant={isReactor(user, reactions, type) ? 'contained' : 'outlined'}
                        onClick={() => onReact(type)}
                    >
                        <Paper
                            elevation={2}
                            sx={{
                                px: 0.75,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ReactionEmoji type={type} />
                        </Paper>

                        <Typography
                            sx={{
                                ml: '0.375rem',
                                fontWeight: '600',
                            }}
                        >
                            {reactors.length}
                        </Typography>
                    </Button>
                </Tooltip>
            ))}

            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                <Stack
                    direction='row'
                    sx={{
                        px: 1,
                        columnGap: 0.5,
                        flexWrap: 'wrap',
                        maxWidth: 'calc(6 * 2.96875rem)',
                    }}
                >
                    {ReactionTypes.map((type) => (
                        <IconButton
                            key={type}
                            sx={{ width: '2.96875rem' }}
                            onClick={() => onReact(type)}
                        >
                            <ReactionEmoji type={type} icon />
                        </IconButton>
                    ))}
                </Stack>
            </Menu>
        </>
    );
};

export default ReactionList;
