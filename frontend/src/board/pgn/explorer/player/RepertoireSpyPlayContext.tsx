'use client';

import { BotMoveProvider } from '@/components/playbot/botMoveProvider';
import { MaiaRating } from '@/components/playbot/maiaengine';
import { TimeControl } from '@/components/playbot/PlayBotSetup';
import { PlayerColor } from '@/components/playbot/useMaiaGame';
import { FEN } from '@jackstenglein/chess';
import { createContext, ReactNode, useContext } from 'react';

export interface RepertoireSpyStartOpts {
    playerColor: PlayerColor;
    maiaRating: MaiaRating;
    minGames: number;
    timeControl: TimeControl;
    botMoveProvider: BotMoveProvider;
    startFen?: string;
}

export interface RepertoireSpyPlayContextValue {
    isAvailable: boolean;
    isPlaying: boolean;
    startRepertoireSpyGame: (opts: RepertoireSpyStartOpts) => void;
    stopRepertoireSpyGame: () => void;
}

const defaultValue: RepertoireSpyPlayContextValue = {
    isAvailable: false,
    isPlaying: false,
    startRepertoireSpyGame: () => undefined,
    stopRepertoireSpyGame: () => undefined,
};

const RepertoireSpyPlayContext = createContext<RepertoireSpyPlayContextValue>(defaultValue);

export function RepertoireSpyPlayProvider({
    value,
    children,
}: {
    value: RepertoireSpyPlayContextValue;
    children: ReactNode;
}) {
    return (
        <RepertoireSpyPlayContext.Provider value={value}>
            {children}
        </RepertoireSpyPlayContext.Provider>
    );
}

export function useRepertoireSpyPlay() {
    return useContext(RepertoireSpyPlayContext);
}

export const DEFAULT_REPERTOIRE_SPY_START_FEN = FEN.start;
export const DEFAULT_REPERTOIRE_SPY_MIN_GAMES = 3;
