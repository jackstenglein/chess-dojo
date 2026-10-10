import { Game } from '@/database/game';
import { renderWithIntl } from '@/i18n/intl.test';
import { Chess } from '@jackstenglein/chess';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareTab } from './ShareTab';

const mocks = vi.hoisted(() => {
    const config: { disableExport?: boolean } = {};
    const game: { game: Game | undefined } = { game: undefined };
    return { chess: { config }, game };
});

vi.mock('@/board/pgn/PgnBoard', () => ({
    useChess: () => ({ chess: new Chess(), config: mocks.chess.config }),
}));
vi.mock('@/context/useGame', () => ({
    default: () => mocks.game,
}));
vi.mock('@/api/Api', () => ({
    useApi: () => ({}),
}));
vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: { username: 'student' } }),
}));
vi.mock('@/components/directories/select/DirectorySelectButton', () => ({
    DirectorySelectButton: () => null,
}));
vi.mock('@/components/profile/directories/DirectoryCache', () => ({
    DirectoryCacheProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('./MergeLineDialog', () => ({
    MergeLineDialog: () => null,
}));

function gameWithHeaders(headers: Record<string, string>): Game {
    return {
        cohort: '1500-1600',
        id: 'copy-1',
        owner: 'student',
        headers: { White: 'Keres', Black: 'Smyslov', Date: '', Site: '', Result: '*', ...headers },
    } as unknown as Game;
}

const exportButtons = [/copy pgn/i, /download pgn/i, /clone game/i];

function expectExportButtons(present: boolean) {
    for (const name of exportButtons) {
        const button = screen.queryByRole('button', { name });
        if (present) {
            expect(button).toBeInTheDocument();
        } else {
            expect(button).not.toBeInTheDocument();
        }
    }
    for (const name of [
        /copy url/i,
        /download pdf/i,
        /copy current line/i,
        /merge current line/i,
    ]) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
}

describe('ShareTab export gating', () => {
    beforeEach(() => {
        mocks.chess.config = {};
        mocks.game.game = undefined;
    });

    afterEach(cleanup);

    it('shows the export buttons by default', () => {
        renderWithIntl(<ShareTab />);
        expectExportButtons(true);
    });

    it('hides them when the board config disables export', () => {
        mocks.chess.config = { disableExport: true };
        renderWithIntl(<ShareTab />);
        expectExportButtons(false);
    });

    it('hides them on a working copy whose course forbids export', () => {
        mocks.game.game = gameWithHeaders({
            StudyItem: 'course:STUDY/x/m1/0',
            StudyExport: 'false',
        });
        renderWithIntl(<ShareTab />);
        expectExportButtons(false);
    });

    it('shows them on a working copy whose course allows export', () => {
        mocks.game.game = gameWithHeaders({
            StudyItem: 'course:STUDY/x/m1/0',
            StudyExport: 'true',
        });
        renderWithIntl(<ShareTab />);
        expectExportButtons(true);
    });

    it('shows them on an ordinary saved game', () => {
        mocks.game.game = gameWithHeaders({});
        renderWithIntl(<ShareTab />);
        expectExportButtons(true);
    });
});
