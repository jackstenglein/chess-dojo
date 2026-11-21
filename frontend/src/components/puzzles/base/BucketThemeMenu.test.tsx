import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BucketThemeMenu } from './BucketThemeMenu';

afterEach(cleanup);

const taxonomy: PuzzlebaseTaxonomy = {
    buckets: {
        Tactics: ['Pin', 'Attack on the king'],
        Endgame: ['Passed pawn', 'Attack on the king'],
    },
};

function setup() {
    const onToggleTheme = vi.fn();
    render(
        <BucketThemeMenu
            taxonomy={taxonomy}
            selectedBuckets={[]}
            selectedThemes={[]}
            counts={{ buckets: {}, themes: { 'Attack on the king': 3 } }}
            onToggleBucket={vi.fn()}
            onToggleTheme={onToggleTheme}
            renderTrigger={({ onClick }) => <button onClick={onClick}>open</button>}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    return { onToggleTheme };
}

describe('BucketThemeMenu with a theme listed under several buckets', () => {
    it('shows the theme under each bucket that lists it, with the same count', () => {
        setup();
        fireEvent.mouseEnter(screen.getByRole('button', { name: /^Tactics/ }));
        expect(screen.getByRole('button', { name: /Attack on the king/ }).textContent).toContain(
            '3',
        );
        fireEvent.mouseEnter(screen.getByRole('button', { name: /^Endgame/ }));
        expect(screen.getByRole('button', { name: /Attack on the king/ }).textContent).toContain(
            '3',
        );
    });

    it('says which bucket the theme was picked under', () => {
        const { onToggleTheme } = setup();
        fireEvent.mouseEnter(screen.getByRole('button', { name: /^Endgame/ }));
        fireEvent.click(screen.getByRole('button', { name: /Attack on the king/ }));
        expect(onToggleTheme).toHaveBeenCalledWith('Attack on the king', 'Endgame');

        fireEvent.mouseEnter(screen.getByRole('button', { name: /^Tactics/ }));
        fireEvent.click(screen.getByRole('button', { name: /Attack on the king/ }));
        expect(onToggleTheme).toHaveBeenLastCalledWith('Attack on the king', 'Tactics');
    });
});
