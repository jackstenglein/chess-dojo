import { toPgnDate } from '@/api/gameApi';
import { useChess } from '@/board/pgn/PgnBoard';
import { SaveGameForm } from '@/components/games/edit/SaveGameDialog';
import { Chess } from '@jackstenglein/chess';
import {
    CreateGameRequest,
    GameImportTypes,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { useState } from 'react';
import useSaveGame from './useSaveGame';

/**
 * A hook that encapsulates functionality for the UnsavedGameBanner and UnsavedGameIcon.
 */
export function useUnsavedGame(chessProp?: Chess) {
    const [showDialog, setShowDialog] = useState(false);
    const [showBanner, setShowBanner] = useState(true);
    const { createGame, stagedGame, setStagedGame, request } = useSaveGame();
    const { chess: chessContext } = useChess();

    const chess = chessProp ?? chessContext;
    const onSubmit = async (form: SaveGameForm) => {
        if (!chess) {
            return;
        }

        chess.setHeader('White', form.white);
        chess.setHeader('Black', form.black);
        chess.setHeader('Result', form.result);
        chess.setHeader('Date', toPgnDate(form.date) ?? '???.??.??');

        const pgnText = chess.pgn.render();
        const req: CreateGameRequest = stagedGame
            ? { ...stagedGame }
            : {
                  pgnText,
                  type: GameImportTypes.manual,
              };

        req.pgnText = pgnText;
        req.publish = form.publish;
        req.orientation = form.orientation;

        if (form.skipFolder) {
            req.directory = undefined;
        }

        await createGame(req).then(() => {
            setShowDialog(false);
        });
    };

    return {
        showDialog,
        setShowDialog,
        showBanner,
        setShowBanner,
        request,
        onSubmit,
        stagedGame,
        setStagedGame,
    };
}
