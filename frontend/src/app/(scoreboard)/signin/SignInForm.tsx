'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { logger } from '@/logging/logger';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { AccountCircle, Lock } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import GoogleButton from 'react-google-button';

export const SignInForm = () => {
    const auth = useAuth();
    const redirectUri = useSearchParams().get('redirectUri');
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const request = useRequest();

    const onSignin = () => {
        const errors: Record<string, string> = {};
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
        auth.signin(email.trim(), password)
            .then(() => router.push(redirectUri ? decodeURIComponent(redirectUri) : '/profile'))
            .catch((err: { name?: string }) => {
                logger.error?.(err);
                if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
                    setErrors({ password: 'Incorrect email or password' });
                    request.onFailure({ message: 'Incorrect email or password' });
                } else {
                    request.onFailure(err);
                }
            });
    };

    const onGoogleSignIn = () => {
        auth.socialSignin('Google', redirectUri ? decodeURIComponent(redirectUri) : '');
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            onSignin();
        }
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

            <Stack width={{ xs: 1, sm: 0.85 }} rowGap={3} alignItems='center'>
                <TextField
                    fullWidth
                    id='email'
                    label='Email'
                    variant='outlined'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
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
                    id='password'
                    label='Password'
                    type='password'
                    variant='outlined'
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={onKeyDown}
                    error={!!errors.password}
                    helperText={errors.password}
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
                <LoadingButton
                    data-testid='signin-button'
                    variant='contained'
                    fullWidth
                    sx={{
                        textTransform: 'none',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        padding: '12px 16px',
                    }}
                    onClick={onSignin}
                    loading={request.isLoading()}
                >
                    Sign In
                </LoadingButton>

                <Stack direction='row' justifyContent='space-between' sx={{ width: 1, mt: -2 }}>
                    <Button
                        data-testid='signup-button'
                        variant='text'
                        sx={{ textTransform: 'none' }}
                        component={Link}
                        href='/signup'
                    >
                        Sign Up
                    </Button>
                    <Button
                        data-testid='forgot-password-button'
                        variant='text'
                        sx={{ textTransform: 'none', alignSelf: 'end' }}
                        component={Link}
                        href='/forgot-password'
                    >
                        Reset Password
                    </Button>
                </Stack>

                <GoogleButton
                    onClick={onGoogleSignIn}
                    style={{
                        transform: 'scale(1.1)',
                        transformOrigin: 'center',
                        margin: '20px',
                    }}
                />
            </Stack>
        </Stack>
    );
};
