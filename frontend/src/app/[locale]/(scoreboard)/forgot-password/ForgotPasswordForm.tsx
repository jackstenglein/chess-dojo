'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { logger } from '@/logging/logger';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { AccountCircle } from '@mui/icons-material';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import { Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

enum ForgotPasswordStep {
    Start = 'START',
    Confirm = 'CONFIRM',
    Success = 'SUCCESS',
}

export const ForgotPasswordForm = () => {
    const auth = useAuth();
    const t = useTranslations('auth');

    const [step, setStep] = useState(ForgotPasswordStep.Start);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string>();
    const request = useRequest();

    const onSubmit = () => {
        if (email.length === 0) {
            setEmailError(t('forgotPassword.emailRequired'));
            return;
        }
        setEmailError(undefined);

        request.onStart();
        auth.forgotPassword(email)
            .then(() => {
                request.onSuccess();
                setStep(ForgotPasswordStep.Confirm);
            })
            .catch((err: { name?: string; message?: string }) => {
                if (err.name === 'UserNotFoundException') {
                    setEmailError(t('forgotPassword.accountNotFound'));
                    request.onFailure({
                        message: t('forgotPassword.accountNotFound'),
                    });
                } else if (err.name === 'NotAuthorizedException') {
                    setEmailError(t('forgotPassword.emailNotVerified'));
                    request.onFailure({
                        message: t('forgotPassword.googleSigninMessage'),
                    });
                } else {
                    setEmailError(err.message);
                    request.onFailure(err);
                }
            });
    };

    return (
        <Stack
            sx={{
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <RequestSnackbar request={request} />

            <ChessDojoIcon
                fontSize='large'
                sx={{
                    mb: 2,
                    width: '80px',
                    height: '80px',
                }}
            />

            <Typography
                variant='h4'
                data-testid='title'
                sx={{
                    textAlign: 'center',
                    mb: 4,
                }}
            >
                {t('chessDojo')}
            </Typography>

            <Stack
                direction='column'
                spacing={3}
                sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 1.5,
                }}
            >
                {step === ForgotPasswordStep.Start && (
                    <StartStep
                        email={email}
                        setEmail={setEmail}
                        emailError={emailError}
                        onSubmit={onSubmit}
                        loading={request.isLoading()}
                    />
                )}

                {step === ForgotPasswordStep.Confirm && (
                    <ConfirmStep
                        email={email}
                        onSuccess={() => setStep(ForgotPasswordStep.Success)}
                    />
                )}

                {step === ForgotPasswordStep.Success && <SuccessStep />}
            </Stack>
        </Stack>
    );
};

interface StartStepProps {
    email: string;
    setEmail: (email: string) => void;
    emailError?: string;
    onSubmit: () => void;
    loading: boolean;
}

const StartStep: React.FC<StartStepProps> = ({
    email,
    setEmail,
    emailError,
    onSubmit,
    loading,
}) => {
    const t = useTranslations('auth');

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
            onSubmit();
        }
    };

    return (
        <>
            <Typography
                variant='subtitle1'
                component='div'
                gutterBottom
                data-testid='description'
                sx={{
                    textAlign: 'center',
                }}
            >
                {t('forgotPassword.startDescription')}
            </Typography>

            <TextField
                fullWidth
                id='email'
                label={t('forgotPassword.email')}
                variant='outlined'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={!!emailError}
                helperText={emailError}
                onKeyDown={onKeyDown}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position='start'>
                                <AccountCircle color='dojoOrange' />
                            </InputAdornment>
                        ),
                    },
                }}
            />

            <Button
                data-testid='submit-button'
                variant='contained'
                onClick={onSubmit}
                fullWidth
                startIcon={<MarkEmailUnreadIcon />}
                sx={{
                    textTransform: 'none',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    padding: '12px 16px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
                }}
                loading={loading}
            >
                {t('forgotPassword.sendEmail')}
            </Button>

            <Button
                data-testid='cancel-button'
                variant='text'
                sx={{ textTransform: 'none' }}
                component={Link}
                href='/signin'
            >
                {t('forgotPassword.cancel')}
            </Button>
        </>
    );
};

interface ConfirmStepProps {
    email: string;
    onSuccess: () => void;
}

const ConfirmStep: React.FC<ConfirmStepProps> = ({ email, onSuccess }) => {
    const auth = useAuth();
    const t = useTranslations('auth');

    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState<string>();
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [passwordError, setPasswordError] = useState<string>();

    const request = useRequest();

    const onConfirm = () => {
        let failed = false;

        if (code.length === 0) {
            setCodeError(t('forgotPassword.recoveryCodeRequired'));
            failed = true;
        } else {
            setCodeError(undefined);
        }

        if (password.length < 8) {
            setPasswordError(t('forgotPassword.passwordMinLength'));
            failed = true;
        } else if (password !== passwordConfirm) {
            setPasswordError(t('forgotPassword.passwordsMustMatch'));
            failed = true;
        } else {
            setPasswordError(undefined);
        }

        if (failed) return;

        request.onStart();
        auth.forgotPasswordConfirm(email, code, password)
            .then(() => {
                request.onSuccess();
                onSuccess();
            })
            .catch((err: { code?: string; message?: string }) => {
                request.onFailure(err);
                logger.error?.(err);
                if (err.code === 'CodeMismatchException') {
                    setCodeError(t('forgotPassword.incorrectCode'));
                } else {
                    setCodeError(err.message);
                }
            });
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
            onConfirm();
        }
    };

    return (
        <>
            <RequestSnackbar request={request} />

            <Typography
                variant='subtitle1'
                component='div'
                gutterBottom
                data-testid='description'
                sx={{
                    textAlign: 'center',
                }}
            >
                {t('forgotPassword.confirmDescription')}
            </Typography>

            <TextField
                fullWidth
                id='code'
                label={t('forgotPassword.recoveryCode')}
                variant='outlined'
                value={code}
                onChange={(event) => setCode(event.target.value)}
                error={!!codeError}
                helperText={codeError}
            />

            <TextField
                fullWidth
                id='password'
                label={t('forgotPassword.newPassword')}
                type='password'
                variant='outlined'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={!!passwordError}
                helperText={passwordError}
            />

            <TextField
                fullWidth
                id='password-confirm'
                label={t('forgotPassword.confirmNewPassword')}
                type='password'
                variant='outlined'
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                error={!!passwordError}
                helperText={passwordError}
                onKeyDown={onKeyDown}
            />

            <Button
                variant='contained'
                onClick={onConfirm}
                fullWidth
                sx={{
                    textTransform: 'none',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    padding: '12px 16px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
                }}
                loading={request.isLoading()}
                data-testid='submit-button'
            >
                {t('forgotPassword.resetPassword')}
            </Button>

            <Button variant='text' sx={{ textTransform: 'none' }} component={Link} href='/signin'>
                {t('forgotPassword.cancel')}
            </Button>
        </>
    );
};

const SuccessStep = () => {
    const t = useTranslations('auth');

    return (
        <>
            <Typography
                variant='subtitle1'
                component='div'
                gutterBottom
                data-testid='description'
                sx={{
                    textAlign: 'center',
                }}
            >
                {t('forgotPassword.successDescription')}
            </Typography>

            <Button
                variant='contained'
                component={Link}
                href='/signin'
                fullWidth
                sx={{
                    textTransform: 'none',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    padding: '12px 16px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
                }}
                data-testid='signin-button'
            >
                {t('forgotPassword.signIn')}
            </Button>
        </>
    );
};
