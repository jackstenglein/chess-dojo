// Based off of https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

import { Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Component, ErrorInfo, ReactNode } from 'react';
import { EventType, trackEvent } from './analytics/events';
import { logger } from './logging/logger';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    info?: ErrorInfo;
}

const ErrorDisplay = ({ error, info }: { error?: Error; info?: ErrorInfo }) => {
    const t = useTranslations('errors');
    return (
        <Container maxWidth='md' sx={{ pt: 6, pb: 4 }}>
            <Stack spacing={4}>
                <Typography variant='h5'>{t('unknownError')}</Typography>
                <Typography variant='h6'>{t('errorDescription')}</Typography>

                <Typography variant='body1' color='error' whiteSpace='pre-line'>
                    {error ? error.toString() : t('nullError')}
                    {info ? info.componentStack : t('noComponentStack')}
                </Typography>
            </Stack>
        </Container>
    );
};

class ErrorBoundary extends Component<React.PropsWithChildren, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        logger.error?.('Error: ', error, info);
        this.setState({ hasError: true, error, info });
        trackEvent(EventType.ErrorBoundary, {
            location: window.location.href,
            error: error?.toString() || '',
        });
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return <ErrorDisplay error={this.state.error} info={this.state.info} />;
    }
}

export default ErrorBoundary;
