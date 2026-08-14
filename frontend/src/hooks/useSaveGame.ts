'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { EditGameResponse, isGame } from '@/api/gameApi';
import { Request, useRequest } from '@/api/Request';
import useGame from '@/context/useGame';
import { Game } from '@/database/game';
import { useRouter } from '@/hooks/useRouter';
import {
    CreateGameRequest,
    UpdateGameRequest,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useSessionStorage } from 'usehooks-ts';

const STAGED_CREATE_GAME_KEY = 'useSaveGame:stageCreateGame';

export interface UseSaveGameFields {
    createGame: (req: CreateGameRequest, onNavigate?: () => void) => Promise<void>;
    updateGame: (req: UpdateGameRequest) => Promise<void>;
    setStagedGame: (req: CreateGameRequest) => void;
    stagedGame: CreateGameRequest | null;
    request: Request<string>;
}

export default function useSaveGame(): UseSaveGameFields {
    const api = useApi();
    const request = useRequest<string>();
    const [stagedGame, setStagedGame] = useSessionStorage<CreateGameRequest | null>(
        STAGED_CREATE_GAME_KEY,
        null,
    );
    const { game } = useGame();
    const router = useRouter();

    const createGame = async (createReq: CreateGameRequest, onNavigate?: () => void) => {
        request.onStart();
        try {
            const response = await api.createGame(createReq);
            onCreateGame(createReq, response.data, router, onNavigate);

            if (isGame(response.data)) {
                request.onSuccess();
            } else {
                request.onSuccess(`Created ${response.data.count} games`);
            }
            setStagedGame(null);
        } catch (err) {
            request.onFailure(err);
        }
    };

    const updateGame = async (updateReq: UpdateGameRequest) => {
        if (!game) {
            return;
        }

        request.onStart();
        try {
            await api.updateGame(game.cohort, game.id, updateReq);
            request.onSuccess();
        } catch (err) {
            request.onFailure(err);
        }
    };

    return {
        setStagedGame,
        stagedGame,
        createGame,
        updateGame,
        request,
    };
}

function onCreateGame(
    req: CreateGameRequest,
    data: Game | EditGameResponse,
    router: AppRouterInstance,
    onNavigate?: () => void,
) {
    if (isGame(data)) {
        const game = data;
        trackEvent(EventType.SubmitGame, {
            count: 1,
            method: req.type,
        });

        if (onNavigate) {
            onNavigate();
            return;
        }

        const urlSafeId = game.id.replaceAll('?', '%3F');
        let newUrl = `/games/${game.cohort.replaceAll('+', '%2B')}/${urlSafeId}`;

        if (req.directory) {
            newUrl += `?directory=${req.directory.id}&directoryOwner=${req.directory.owner}`;
        }

        router.push(newUrl);
    } else {
        const count = data.count;
        trackEvent(EventType.SubmitGame, {
            count: count,
            method: req.type,
        });
        setTimeout(() => router.push('/profile?view=games'), 1500);
    }
}
