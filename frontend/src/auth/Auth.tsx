'use client';

import { getConfig } from '@/config';
import { logger } from '@/logging/logger';
import { Amplify } from 'aws-amplify';
import {
    confirmSignUp as amplifyConfirmSignUp,
    getCurrentUser as amplifyGetCurrentUser,
    resendSignUpCode as amplifyResendSignUpCode,
    signIn as amplifySignIn,
    signOut as amplifySignOut,
    signUp as amplifySignUp,
    confirmResetPassword,
    ConfirmSignUpOutput,
    fetchAuthSession,
    ResendSignUpCodeOutput,
    resetPassword,
    ResetPasswordOutput,
    signInWithRedirect,
    SignUpOutput,
} from 'aws-amplify/auth';
import { AxiosResponse } from 'axios';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EventType, setUserProperties as setAnalyticsUser, trackEvent } from '../analytics/events';
import { syncPurchases } from '../api/paymentApi';
import { getUser } from '../api/userApi';
import {
    clearCheckoutSessionIds,
    getAllCheckoutSessionIds,
} from '../app/(scoreboard)/courses/localStorage';
import { CognitoUser, isFree, parseUser, User } from '../database/user';

const config = getConfig();
Amplify.configure(
    {
        Auth: {
            Cognito: {
                userPoolId: config.auth.userPoolId,
                userPoolClientId: config.auth.userPoolWebClientId,
                loginWith: {
                    oauth: {
                        domain: config.auth.oauth.domain,
                        scopes: config.auth.oauth.scope,
                        redirectSignIn: [config.auth.oauth.redirectSignIn],
                        redirectSignOut: [config.auth.oauth.redirectSignOut],
                        responseType: config.auth.oauth.responseType,
                    },
                },
            },
        },
    },
    { ssr: true },
);

export enum AuthStatus {
    Loading = 'Loading',
    Authenticated = 'Authenticated',
    Unauthenticated = 'Unauthenticated',
}

interface AuthContextType {
    user?: User;
    status: AuthStatus;

    getCurrentUser: () => Promise<void>;
    updateUser: (update: Partial<User>) => void;

    socialSignin: (provider: 'Google' | 'Apple', redirectUri: string) => void;
    signin: (email: string, password: string) => Promise<void>;

    signup: (
        name: string,
        email: string,
        password: string,
    ) => Promise<SignUpOutput & { username: string }>;
    confirmSignup: (username: string, code: string) => Promise<ConfirmSignUpOutput>;
    resendSignupCode: (username: string) => Promise<ResendSignUpCodeOutput>;
    forgotPassword: (email: string) => Promise<ResetPasswordOutput>;
    forgotPasswordConfirm: (email: string, code: string, password: string) => Promise<void>;

    signout: () => void;
}

interface RequiredAuthContextType extends AuthContextType {
    user: User;
    status: AuthStatus.Authenticated;
}

const defaultAuthContextFunction = () => {
    throw new Error('Using the default AuthContext is prohibited');
};

const AuthContext = createContext<AuthContextType>({
    status: AuthStatus.Loading,
    getCurrentUser: defaultAuthContextFunction,
    updateUser: defaultAuthContextFunction,
    socialSignin: defaultAuthContextFunction,
    signin: defaultAuthContextFunction,
    signup: defaultAuthContextFunction,
    confirmSignup: defaultAuthContextFunction,
    resendSignupCode: defaultAuthContextFunction,
    forgotPassword: defaultAuthContextFunction,
    forgotPasswordConfirm: defaultAuthContextFunction,
    signout: defaultAuthContextFunction,
});

function socialSignin(provider: 'Google' | 'Apple', redirectUri: string) {
    trackEvent(EventType.Login, { method: provider });
    signInWithRedirect({
        provider,
        customState: redirectUri,
    })
        .then((value) => {
            logger.debug?.('Federated sign in value: ', value);
        })
        .catch((err: unknown) => {
            logger.error?.('Federated sign in error: ', err);
        });
}

async function signup(name: string, email: string, password: string) {
    trackEvent(EventType.Signup);
    const username = uuidv4();
    const resp = await amplifySignUp({
        username,
        password,
        options: {
            userAttributes: {
                email,
                name,
            },
        },
    });
    return { ...resp, username };
}

function confirmSignup(username: string, code: string) {
    trackEvent(EventType.SignupConfirm);
    return amplifyConfirmSignUp({ username, confirmationCode: code });
}

function resendSignupCode(username: string) {
    return amplifyResendSignUpCode({ username });
}

function forgotPassword(email: string) {
    trackEvent(EventType.ForgotPassword);
    return resetPassword({ username: email });
}

function forgotPasswordConfirm(email: string, code: string, password: string) {
    trackEvent(EventType.ForgotPasswordConfirm);
    return confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: password,
    });
}

export function useAuth() {
    return useContext(AuthContext);
}

export function useRequiredAuth(): RequiredAuthContextType {
    const context = useContext(AuthContext);
    if (!context.user || context.status !== AuthStatus.Authenticated) {
        throw new Error(
            'useRequiredAuth should only be called in components that the user is required to be logged in to view.',
        );
    }
    return context as RequiredAuthContextType;
}

export function useFreeTier() {
    return isFree(useAuth().user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User>();
    const [status, setStatus] = useState<AuthStatus>(AuthStatus.Loading);

    const handleCognitoResponse = useCallback(async (cognitoUser: CognitoUser) => {
        const checkoutSessionIds = getAllCheckoutSessionIds();
        let apiResponse: AxiosResponse<User>;

        if (Object.values(checkoutSessionIds).length > 0) {
            apiResponse = await syncPurchases(
                cognitoUser.tokens?.idToken?.toString() ?? '',
                checkoutSessionIds,
            );
            clearCheckoutSessionIds();
        } else {
            apiResponse = await getUser(cognitoUser.tokens?.idToken?.toString() ?? '');
        }

        const user = parseUser(apiResponse.data, cognitoUser);
        setUser(user);
        setStatus(AuthStatus.Authenticated);
        setAnalyticsUser(user);
    }, []);

    const getCurrentUser = useCallback(async () => {
        try {
            const authUser = await amplifyGetCurrentUser();
            const authSession = await fetchAuthSession({ forceRefresh: true });
            await handleCognitoResponse({
                username: authUser.username,
                tokens: authSession.tokens,
            });
        } catch (err) {
            logger.error?.('Failed to get user: ', err);
            setStatus(AuthStatus.Unauthenticated);
        }
    }, [handleCognitoResponse]);

    useEffect(() => {
        void getCurrentUser();
    }, [getCurrentUser]);

    const updateUser = (update: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...update });
        }
    };

    const signin = (email: string, password: string) => {
        return new Promise<void>((resolve, reject) => {
            void (async () => {
                try {
                    logger.debug?.('Signing in');
                    await amplifySignIn({ username: email, password });
                    const authUser = await amplifyGetCurrentUser();
                    const authSession = await fetchAuthSession({ forceRefresh: true });
                    trackEvent(EventType.Login, { method: 'Cognito' });
                    await handleCognitoResponse({
                        username: authUser.username,
                        tokens: authSession.tokens,
                    });
                    resolve();
                } catch (err) {
                    logger.error?.('Failed to sign in: ', err);
                    setStatus(AuthStatus.Unauthenticated);
                    reject(err as Error);
                }
            })();
        });
    };

    const signout = async () => {
        try {
            trackEvent(EventType.Logout);
            await amplifySignOut();
            window.location.href = '/';
        } catch (err) {
            logger.error?.('Error signing out: ', err);
        }
    };

    const value = {
        user,
        status,

        getCurrentUser,
        updateUser,

        socialSignin,
        signin,

        signup,
        confirmSignup,
        resendSignupCode,
        forgotPassword,
        forgotPasswordConfirm,

        signout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
