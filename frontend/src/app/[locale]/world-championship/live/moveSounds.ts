'use client';

import { PieceSounds } from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { useBoardSound } from '@/board/sounds/useBoardSound';
import { Move } from '@jackstenglein/chess';
import { useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';

/**
 * The site's move, capture and check sounds, played from a move in SAN. They
 * follow the same piece sound setting as every other board on the site.
 */
export function useMoveSounds() {
    const [enabled, setEnabled] = useLocalStorage<boolean>(PieceSounds.key, PieceSounds.default);
    const { playSound } = useBoardSound(enabled);

    const playSan = useCallback(
        (san: string) => {
            // playSound only looks at whether the move captured, and at the check.
            const move = { captured: san.includes('x') ? 'p' : undefined } as unknown as Move;
            playSound(move, /[+#]/.test(san));
        },
        [playSound],
    );

    return { enabled, setEnabled, playSan };
}
