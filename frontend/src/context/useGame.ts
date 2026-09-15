import { Game } from '@/database/game';
import { createContext, RefObject, useContext } from 'react';

export interface GameContextType {
    game?: Game;
    onUpdateGame?: (g: Game) => void;
    isOwner?: boolean;
    unsaved?: boolean;
    hasUnsavedGameChanges?: boolean;
    setHasUnsavedGameChanges?: (hasChanges: boolean) => void;
    /** If defined, the Directories tab calls this instead of router.push when clicking a game. */
    onNavigateToGame?: (cohort: string, id: string) => void;
    /** The time the game was last updated. */
    updatedAtRef?: RefObject<string | undefined>;
}

export const GameContext = createContext<GameContextType>({});

export default function useGame() {
    return useContext(GameContext);
}
