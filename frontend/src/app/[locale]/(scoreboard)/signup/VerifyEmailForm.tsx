import { metaCompleteRegistration } from '@/analytics/meta';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { useRouter } from '@/i18n/navigation';
import { logger } from '@/logging/logger';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { Lock } from '@mui/icons-material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import { Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export const VerifyEmailForm = ({
    username,
    email,
    password,
}: {
    username: string;
    email: string;
    password: string;
}) => {
    const auth = useAuth();
    const router = useRouter();
    const redirectUri = useSearchParams().get('redirectUri');
    const t = useTranslations('auth');

    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState<string>();

    const submitRequest = useRequest();
    const codeRequest = useRequest<string>();

    if (auth.status === AuthStatus.Authenticated) {
        router.push(`/profile${redirectUri ? `?redirectUri=${redirectUri}` : ''}`);
        return;
    }

    const onSubmit = () => {
        if (code.length === 0) {
            setCodeError(t('verify.verificationCodeRequired'));
            return;
        }
        setCodeError(undefined);

        submitRequest.onStart();

        auth.confirmSignup(username, code)
            .then(() => {
                metaCompleteRegistration();
                return auth.signin(email, password);
            })
            .catch((err: { message?: string; name?: string }) => {
                logger.error?.('confirmSignup ', err);
                if (err.message) {
                    setCodeError(err.message);
                }
                if (err.name === 'AliasExistsException') {
                    submitRequest.onFailure({
                        message: t('verify.aliasExists'),
                    });
                } else {
                    submitRequest.onFailure(err);
                }
            });
    };

    const onResendCode = () => {
        codeRequest.onStart();

        auth.resendSignupCode(username)
            .then(() => {
                codeRequest.onSuccess(t('verify.newCodeSent'));
            })
            .catch((err: { message?: string }) => {
                logger.error?.('resendSignupCode: ', err);
                if (err.message) {
                    codeRequest.onFailure(err.message);
                } else {
                    codeRequest.onFailure(err);
                }
            });
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
            onSubmit();
        }
    };

    return (
        <Stack justifyContent='center' alignItems='center'>
            <RequestSnackbar request={submitRequest} />
            <RequestSnackbar request={codeRequest} showSuccess />

            <ChessDojoIcon
                fontSize='large'
                sx={{
                    mb: 2,
                    width: '80px',
                    height: '80px',
                }}
            />

            <Typography variant='h4' textAlign='center' data-testid='title' mb={4}>
                {t('chessDojo')}
            </Typography>

            <Stack width={{ xs: 1, sm: 0.85 }} spacing={4} alignItems='center'>
                <Typography
                    variant='body1'
                    component='div'
                    gutterBottom
                    textAlign='center'
                    data-testid='description'
                >
                    {t('verify.description', { email })}
                </Typography>

                <TextField
                    fullWidth
                    id='code'
                    label={t('verify.verificationCode')}
                    variant='outlined'
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    onKeyDown={onKeyDown}
                    error={!!codeError}
                    helperText={codeError}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <Lock color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <Button
                    variant='contained'
                    loading={submitRequest.isLoading()}
                    fullWidth
                    startIcon={<MarkEmailReadIcon />}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        padding: '12px 16px',
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
                    }}
                    onClick={onSubmit}
                    data-testid='verify-button'
                >
                    {t('verify.verifyEmail')}
                </Button>

                <Button
                    variant='text'
                    sx={{
                        textTransform: 'none',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        padding: '12px 16px',
                    }}
                    startIcon={<MarkEmailUnreadIcon />}
                    onClick={onResendCode}
                    loading={codeRequest.isLoading()}
                    data-testid='resend-button'
                >
                    {t('verify.sendNewCode')}
                </Button>
            </Stack>
        </Stack>
    );
};
