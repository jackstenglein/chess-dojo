import { Alert, Snackbar } from '@mui/material';
import { AxiosError } from 'axios';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { isObject } from '../database/scoreboard';

/**
 * RequestStatus defines the different status types that an API request can have.
 */
export enum RequestStatus {
    NotSent = 'NOT_SENT',
    Loading = 'LOADING',
    Success = 'SUCCESS',
    Failure = 'FAILURE',
}

/**
 * Request defines the overall state of an API request, as well as functions to update that state.
 */
export interface Request<T = undefined> {
    status: RequestStatus;
    data?: T;
    error?: unknown;
    onStart: () => void;
    onSuccess: (data?: T) => void;
    onFailure: (error?: unknown) => void;
    reset: () => void;
    isLoading: () => boolean;
    isSent: () => boolean;
    isFailure: () => boolean;
}

/**
 * useRequest returns a Request object that can be used to track the lifecycle of an API request.
 */
export function useRequest<T = undefined>(): Request<T> {
    const [status, setStatus] = useState<RequestStatus>(RequestStatus.NotSent);
    const [data, setData] = useState<T>();
    const [error, setError] = useState<unknown>();

    const onStart = useCallback(() => {
        setStatus(RequestStatus.Loading);
        setData(undefined);
        setError(undefined);
    }, [setStatus, setData, setError]);

    const onSuccess = useCallback(
        (data?: T) => {
            setData(data);
            setStatus(RequestStatus.Success);
        },
        [setData, setStatus],
    );

    const onFailure = useCallback(
        (error?: unknown) => {
            setError(error);
            setStatus(RequestStatus.Failure);
        },
        [setError, setStatus],
    );

    const reset = useCallback(() => {
        setStatus(RequestStatus.NotSent);
        setData(undefined);
        setError(undefined);
    }, [setStatus, setData, setError]);

    const isLoading = useCallback(() => {
        return status === RequestStatus.Loading;
    }, [status]);

    const isSent = useCallback(() => {
        return status !== RequestStatus.NotSent;
    }, [status]);

    const isFailure = useCallback(() => {
        return status === RequestStatus.Failure;
    }, [status]);

    return useMemo(
        () => ({
            status,
            data,
            error,
            onStart,
            onSuccess,
            onFailure,
            reset,
            isLoading,
            isSent,
            isFailure,
        }),
        [status, data, error, onStart, onSuccess, onFailure, reset, isLoading, isSent, isFailure],
    );
}

function isReactNode(node: unknown): node is ReactNode {
    if (node === null || node === undefined) {
        return true;
    }
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        return true;
    }
    return false;
}

interface RequestSnackbarProps<T> {
    request: Request<T>;
    showError?: boolean;
    showSuccess?: boolean;
    defaultErrorMessage?: string;
    defaultSuccessMessage?: string;
}

export function RequestSnackbar<T>({
    request,
    showError,
    showSuccess,
    defaultErrorMessage,
    defaultSuccessMessage,
}: RequestSnackbarProps<T>) {
    const displayError =
        (showError === undefined || showError) &&
        request.status === RequestStatus.Failure &&
        request.error !== undefined;

    const displaySuccess = showSuccess && request.data !== undefined;

    let errorMessage =
        defaultErrorMessage ||
        'Something went wrong. Please try again later or contact support if the problem persists';

    if (
        request.error instanceof AxiosError &&
        isObject(request.error.response?.data) &&
        'message' in request.error.response.data &&
        typeof request.error.response.data.message === 'string'
    ) {
        errorMessage = request.error.response.data.message;
    } else if (
        isObject(request.error) &&
        'message' in request.error &&
        typeof request.error.message === 'string'
    ) {
        errorMessage = request.error.message;
    }

    if (errorMessage === 'Unauthorized') {
        errorMessage = 'Login expired. Please refresh and try again.';
    }

    const successMessage = isReactNode(request.data)
        ? request.data
        : defaultSuccessMessage || 'Request succeeded';

    return (
        <>
            {displayError && (
                <Snackbar
                    data-testid='error-snackbar'
                    open={displayError}
                    autoHideDuration={6000}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert variant='filled' severity='error' sx={{ width: '100%' }}>
                        {errorMessage}
                    </Alert>
                </Snackbar>
            )}

            <Snackbar
                data-testid='success-snackbar'
                open={displaySuccess}
                autoHideDuration={6000}
                onClose={request.reset}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={successMessage}
            />
        </>
    );
}
