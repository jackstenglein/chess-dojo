import { Game } from '@/database/game';
import { createContext, useContext } from 'react';

export interface GameContextType {
    game?: Game;
    onUpdateGame?: (g: Game) => void;
    isOwner?: boolean;
    unsaved?: boolean;
    /** If defined, the Directories tab calls this instead of router.push when clicking a game. */
    onNavigateToGame?: (cohort: string, id: string) => void;
}

export const GameContext = createContext<GameContextType>({});

export default function useGame() {
    return useContext(GameContext);
}
