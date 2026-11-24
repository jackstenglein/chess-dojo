'use client';

import { Link } from '@/components/navigation/Link';

/** The annotator's display name, linking to their Dojo profile. */
export function AnnotatorLink({
    username,
    displayName,
}: {
    username: string;
    displayName: string;
}) {
    return (
        <Link
            href={`/profile/${username}`}
            color='inherit'
            underline='hover'
            // Keeps a click from also opening the puzzle when the link is inside a table row.
            data-no-nav
            onClick={(e) => e.stopPropagation()}
        >
            {displayName}
        </Link>
    );
}
