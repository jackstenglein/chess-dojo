import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { getConfig } from '@/config';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { usePathname } from '@/i18n/navigation';
import { DiscordIcon } from '@/style/SocialMediaIcons';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

const config = getConfig();

function DiscordOAuthButton() {
    const { user, updateUser } = useAuth();
    const api = useApi();
    const request = useRequest<string>();
    const pathname = usePathname();
    const { searchParams, updateSearchParams } = useNextSearchParams();
    const t = useTranslations('profile.discord');
    const mode = user?.discordId ? 'disconnect' : 'connect';
    const code = searchParams.get('code');
    const redirectUri = `${config.baseUrl}${pathname}`;
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.join`;

    useEffect(() => {
        if (mode === 'connect' && code && redirectUri && !request.isSent()) {
            request.onStart();
            api.discordAuth({ mode: 'connect', code, redirectUri })
                .then((resp) => {
                    request.onSuccess(t('connectSuccess'));
                    updateUser(resp.data);
                    updateSearchParams({ code: '' });
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [mode, code, request, api, updateUser, redirectUri, updateSearchParams, t]);

    const handleDisconnect = () => {
        request.onStart();
        api.discordAuth({ mode: 'disconnect' })
            .then(() => {
                request.onSuccess(t('disconnectSuccess'));
                updateUser({ discordUsername: '', discordId: '' });
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            {mode === 'connect' ? (
                <Stack
                    direction='row'
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Button
                        variant='contained'
                        loading={request.isLoading()}
                        startIcon={<DiscordIcon />}
                        href={discordAuthUrl}
                    >
                        {t('connect')}
                    </Button>
                </Stack>
            ) : (
                <Stack
                    direction='row'
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <DiscordIcon />
                    <Typography sx={{ ml: 1, mr: 2 }}>{user?.discordUsername}</Typography>
                    <Button
                        variant='contained'
                        color='error'
                        loading={request.isLoading()}
                        onClick={handleDisconnect}
                    >
                        {t('disconnect')}
                    </Button>
                </Stack>
            )}

            <RequestSnackbar request={request} showSuccess />
        </>
    );
}

export default DiscordOAuthButton;
