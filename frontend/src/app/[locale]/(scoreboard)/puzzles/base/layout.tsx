import { getConfig } from '@/config';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

/** PuzzleBase is only on the beta site for now; elsewhere these pages don't exist. */
export default function PuzzlebaseBetaLayout({ children }: { children: ReactNode }) {
    if (!getConfig().isBeta) {
        notFound();
    }
    return children;
}
