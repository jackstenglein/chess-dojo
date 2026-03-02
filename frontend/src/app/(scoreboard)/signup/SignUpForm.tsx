'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { useRouter } from '@/hooks/useRouter';
import { logger } from '@/logging/logger';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { AccountCircle, Email as EmailIcon, Lock as LockIcon } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import GoogleButton from 'react-google-button';
import { VerifyEmailForm } from './VerifyEmailForm';

enum SignUpStep {
    SignUp = 'SIGN_UP',
    Verify = 'VERIFY',
}

export const SignUpForm = () => {
    const auth = useAuth();
    const router = useRouter();
    const { searchParams } = useNextSearchParams();
    const redirectUri = searchParams.get('redirectUri');

    const [step, setStep] = useState(SignUpStep.SignUp);
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const request = useRequest();

    if (auth.status === AuthStatus.Authenticated) {
        router.push('/profile');
        return;
    }

    const onSignup = () => {
        const errors: Record<string, string> = {};
        if (name.trim().length === 0) {
            errors.name = 'Name is required';
        }
        if (email.trim().length === 0) {
            errors.email = 'Email is required';
        }
        if (password.length === 0) {
            errors.password = 'Password is required';
        }

        setErrors(errors);
        if (Object.values(errors).length > 0) {
            return;
        }

        request.onStart();
        auth.signup(name.trim(), email.trim(), password)
            .then((result) => {
                setUsername(result.username);
                setName(name.trim());
                setEmail(email.trim());
                setStep(SignUpStep.Verify);
            })
            .catch((err) => {
                logger.error?.(err);
                request.onFailure(err);
            });
    };

    const onGoogleSignIn = () => {
        auth.socialSignin('Google', redirectUri ? decodeURIComponent(redirectUri) : '');
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
            onSignup();
        }
    };

    if (step === SignUpStep.Verify) {
        return <VerifyEmailForm username={username} email={email} password={password} />;
    }

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

            <Stack width={{ xs: 1, sm: 0.85 }} rowGap={3} alignItems='center'>
                <TextField
                    fullWidth
                    id='name'
                    label='Name'
                    variant='outlined'
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    error={!!errors.name}
                    helperText={errors.name}
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
                <TextField
                    fullWidth
                    id='email'
                    label='Email'
                    variant='outlined'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
                    onKeyDown={onKeyDown}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <EmailIcon color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                <TextField
                    fullWidth
                    id='password'
                    label='Password'
                    type='password'
                    variant='outlined'
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    error={!!errors.password}
                    helperText={errors.password}
                    onKeyDown={onKeyDown}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <LockIcon color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                <LoadingButton
                    data-testid='submit-button'
                    variant='contained'
                    fullWidth
                    sx={{
                        textTransform: 'none',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        padding: '12px 16px',
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
                        mb: 2,
                    }}
                    onClick={onSignup}
                    loading={request.isLoading()}
                >
                    Create Account
                </LoadingButton>

                <GoogleButton
                    onClick={onGoogleSignIn}
                    label='Sign up with Google'
                    style={{
                        transform: 'scale(1.1)',
                        transformOrigin: 'center',
                    }}
                />
                <Typography variant='body2' component='div' gutterBottom>
                    Already have an account?{' '}
                    <Link href='/signin' data-testid='signin-button'>
                        Sign In
                    </Link>
                </Typography>
            </Stack>
        </Stack>
    );
};
