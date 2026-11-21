// Based off of https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

import { logger } from '@/logging/logger';
import { ContentCopy } from '@mui/icons-material';
import { Button, Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { Component, ErrorInfo } from 'react';
import { EventType, trackEvent } from '../../analytics/events';
import { useAuth } from '../../auth/Auth';
import { Game } from '../../database/game';
import DeleteGameButton from './DeleteGameButton';

interface PgnErrorBoundaryProps {
    pgn?: string;
    getCurrentPgn?: () => string | undefined;
    game?: Game;
}

interface PgnErrorBoundaryNavigatorProps extends PgnErrorBoundaryProps {
    username: string;
    t: ReturnType<typeof useTranslations<'games.view.pgnErrorBoundary'>>;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    info?: ErrorInfo;
}

class PgnErrorBoundary extends Component<
    React.PropsWithChildren<PgnErrorBoundaryNavigatorProps>,
    ErrorBoundaryState
> {
    constructor(props: PgnErrorBoundaryNavigatorProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        logger.error?.('Error: ', error);
        logger.error?.('Info: ', info);
        this.setState({ hasError: true, error, info });
        trackEvent(EventType.PgnErrorBoundary, {
            location: window.location.href,
            error: error?.toString() || '',
        });
    }

    getPgn() {
        try {
            return this.props.getCurrentPgn?.() ?? this.props.pgn ?? '';
        } catch {
            return this.props.pgn ?? '';
        }
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const { t } = this.props;
        const pgn = this.getPgn();
        return (
            <Container maxWidth='md' sx={{ pt: 6, pb: 4, gridArea: 'pgn' }}>
                <Stack spacing={4}>
                    <Typography variant='h5'>{t('invalidPgn')}</Typography>
                    <Typography variant='body1'>{t('invalidPgnDescription')}</Typography>

                    <Button
                        variant='contained'
                        startIcon={<ContentCopy />}
                        onClick={() => void navigator.clipboard.writeText(pgn)}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        {t('copyPgn')}
                    </Button>

                    {this.props.game?.owner === this.props.username && (
                        <Stack direction='row' spacing={2}>
                            <Button variant='contained' href={window.location.href + '/edit'}>
                                {t('resubmitPgn')}
                            </Button>

                            <DeleteGameButton
                                games={[
                                    {
                                        cohort: this.props.game.cohort,
                                        id: this.props.game.id,
                                    },
                                ]}
                                variant='contained'
                            />
                        </Stack>
                    )}

                    <Typography
                        variant='body1'
                        color='error'
                        sx={{
                            whiteSpace: 'pre-line',
                        }}
                    >
                        {this.state.error ? this.state.error.toString() : t('nullError')}
                        {this.state.info ? this.state.info.componentStack : t('noComponentStack')}
                    </Typography>

                    <Typography
                        variant='body1'
                        sx={{
                            whiteSpace: 'pre-line',
                        }}
                    >
                        {`${t('rawPgnLabel')}

                        ${pgn}`}
                    </Typography>
                </Stack>
            </Container>
        );
    }
}

const PgnErrorBoundaryNavigator: React.FC<React.PropsWithChildren<PgnErrorBoundaryProps>> = (
    props,
) => {
    const t = useTranslations('games.view.pgnErrorBoundary');
    const username = useAuth().user?.username || '';

    return <PgnErrorBoundary username={username} t={t} {...props} />;
};

export default PgnErrorBoundaryNavigator;
