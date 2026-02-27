'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { logger } from '@/logging/logger';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { AccountCircle } from '@mui/icons-material';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import { LoadingButton } from '@mui/lab';
import { Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';

const googleSigninMessage =
    'Your email is not verified. Note that if you previously signed in with Google, you must continue to use that option. You will not be able to reset your password in that case.';

enum ForgotPasswordStep {
    Start = 'START',
    Confirm = 'CONFIRM',
    Success = 'SUCCESS',
}

export const ForgotPasswordForm = () => {
    const auth = useAuth();

    const [step, setStep] = useState(ForgotPasswordStep.Start);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string>();
    const request = useRequest();

    const onSubmit = () => {
        if (email.length === 0) {
            setEmailError('Email is required');
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
                    setEmailError('Account with this email does not exist');
                    request.onFailure({
                        message: 'Account with this email does not exist',
                    });
                } else if (err.name === 'NotAuthorizedException') {
                    setEmailError('Email is not verified');
                    request.onFailure({
                        message: googleSigninMessage,
                    });
                } else {
                    setEmailError(err.message);
                    request.onFailure(err);
                }
            });
    };

    return (
        <Stack justifyContent='center' alignItems='center'>
            <RequestSnackbar request={request} />

            <ChessDojoIcon
                fontSize='large'
                sx={{
                    mb: 2,
                    width: '80px',
                    height: '80px',
                }}
            />

            <Typography variant='h4' textAlign='center' data-testid='title' mb={4}>
                ChessDojo
            </Typography>

            <Stack
                direction='column'
                justifyContent='center'
                alignItems='center'
                spacing={3}
                paddingTop={1.5}
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
                textAlign='center'
                data-testid='description'
            >
                Enter your email, and we'll send you a code to reset your password.
            </Typography>

            <TextField
                fullWidth
                id='email'
                label='Email'
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

            <LoadingButton
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
                Send Email
            </LoadingButton>

            <Button
                data-testid='cancel-button'
                variant='text'
                sx={{ textTransform: 'none' }}
                component={Link}
                href='/signin'
            >
                Cancel
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

    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState<string>();
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [passwordError, setPasswordError] = useState<string>();

    const request = useRequest();

    const onConfirm = () => {
        let failed = false;

        if (code.length === 0) {
            setCodeError('Recovery code is required');
            failed = true;
        } else {
            setCodeError(undefined);
        }

        if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            failed = true;
        } else if (password !== passwordConfirm) {
            setPasswordError('Passwords do not match');
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
                    setCodeError('Incorrect recovery code');
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
                textAlign='center'
                data-testid='description'
            >
                Email sent! Enter the code to reset your password.
            </Typography>

            <TextField
                fullWidth
                id='code'
                label='Recovery Code'
                variant='outlined'
                value={code}
                onChange={(event) => setCode(event.target.value)}
                error={!!codeError}
                helperText={codeError}
            />

            <TextField
                fullWidth
                id='password'
                label='New Password'
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
                label='Confirm New Password'
                type='password'
                variant='outlined'
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                error={!!passwordError}
                helperText={passwordError}
                onKeyDown={onKeyDown}
            />

            <LoadingButton
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
                Reset Password
            </LoadingButton>

            <Button variant='text' sx={{ textTransform: 'none' }} component={Link} href='/signin'>
                Cancel
            </Button>
        </>
    );
};

const SuccessStep = () => {
    return (
        <>
            <Typography
                variant='subtitle1'
                component='div'
                gutterBottom
                textAlign='center'
                data-testid='description'
            >
                You can now sign in using your new password.
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
                Sign In
            </Button>
        </>
    );
};
