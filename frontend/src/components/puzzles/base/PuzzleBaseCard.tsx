'use client';

import { ExamCard } from '@/components/exams/ExamCard';
import { Extension } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { getPuzzlebaseClient } from './puzzlebaseClient';

/** Keeps the card as tall as the others when it has nothing to say under its name. */
const NO_DESCRIPTION = ' ';

/**
 * The PuzzleBase card for the Learn page. Only Puzzle Contributors and admins see it; it is hidden
 * for everyone else, and until we know who is looking.
 */
export function PuzzleBaseCard() {
    const [canContribute, setCanContribute] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getPuzzlebaseClient()
            .getStatus()
            .then((status) => {
                if (!cancelled) setCanContribute(status.canContribute);
            })
            .catch(() => {
                // Not signed in, or the server is unreachable: leave the card out.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!canContribute) {
        return null;
    }
    return (
        <ExamCard
            name='Dojo PuzzleBase'
            description={NO_DESCRIPTION}
            href='/puzzles/base'
            icon={Extension}
        />
    );
}
