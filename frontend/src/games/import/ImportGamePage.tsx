'use client';

import { RequestSnackbar } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import useSaveGame from '@/hooks/useSaveGame';
import { useRouter } from '@/i18n/navigation';
import { logger } from '@/logging/logger';
import { Chess } from '@jackstenglein/chess';
import { MY_GAMES_DIRECTORY_ID } from '@jackstenglein/chess-dojo-common/src/database/directory';
import { CreateGameRequest } from '@jackstenglein/chess-dojo-common/src/database/game';
import { cleanupPgn, splitPgns } from '@jackstenglein/chess-dojo-common/src/pgn/pgn';
import { Container } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import ImportWizard from './ImportWizard';

const ImportGamePage = () => {
    const t = useTranslations('games.import.page');
    const searchParams = useSearchParams();
    const { setStagedGame, createGame, request } = useSaveGame();
    const router = useRouter();
    const { user } = useAuth();

    const onCreate = async (req: CreateGameRequest) => {
        if (searchParams.has('directory') && searchParams.has('directoryOwner')) {
            req.directory = {
                owner: searchParams.get('directoryOwner') || '',
                id: searchParams.get('directory') || '',
            };
        }

        if (
            req.type === 'startingPosition' ||
            (req.pgnText && splitPgns(req.pgnText).length === 1)
        ) {
            try {
                if (!req.directory) {
                    req.directory = {
                        owner: user?.username || '',
                        id: MY_GAMES_DIRECTORY_ID,
                    };
                }
                req.pgnText = cleanupPgn(req.pgnText ?? '');
                new Chess({ pgn: req.pgnText });
                setStagedGame(req);
                router.push('/games/analysis');
            } catch (err) {
                logger.error?.('setStagedGame: ', err);
                request.onFailure({ message: t('invalidPgn') });
            }
        } else {
            await createGame(req);
        }
    };

    return (
        <Container maxWidth='lg' sx={{ py: 5 }}>
            <ImportWizard onSubmit={onCreate} loading={request.isLoading()} />
            <RequestSnackbar request={request} showSuccess />
        </Container>
    );
};

export default ImportGamePage;
