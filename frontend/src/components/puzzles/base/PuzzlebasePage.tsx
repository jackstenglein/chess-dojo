'use client';

import { PuzzlebaseContent } from './PuzzlebaseContent';
import { PuzzlebaseGate } from './PuzzlebaseGate';

/**
 * The Dojo PuzzleBase page. Puzzle Contributors and admins see the puzzles; everyone else sees a
 * page inviting them to apply.
 */
export function PuzzlebasePage() {
    return (
        <PuzzlebaseGate>
            {({ client, status }) => <PuzzlebaseContent client={client} status={status} />}
        </PuzzlebaseGate>
    );
}
