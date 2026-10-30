import { User } from '@/database/user';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeatmapCard, MIN_BLOCK_SIZE, getBlockSize } from './HeatmapCard';
import { blockId, makeUser, renderHeatmap } from './heatmapTestUtils';

const auth = vi.hoisted(() => ({
    user: undefined as User | undefined,
}));

const timeline = vi.hoisted(() => ({
    owner: 'owner',
    entries: [] as unknown[],
    onEditEntries: vi.fn(),
    onDeleteEntries: vi.fn(),
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: auth.user }),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => ({ updateUserTimeline: vi.fn() }),
}));

vi.mock('@/style/useLightMode', () => ({
    useLightMode: () => true,
}));

vi.mock('@/components/profile/activity/useTimeline', () => ({
    useTimelineContext: () => timeline,
}));

function mockViewport(width: number) {
    vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue({
        width,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: width,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    });
}

describe('getBlockSize', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('stays at the minimum until the viewport can fit larger squares', () => {
        mockViewport(0);
        expect(getBlockSize()).toBe(MIN_BLOCK_SIZE);

        mockViewport(400);
        expect(getBlockSize()).toBe(MIN_BLOCK_SIZE);
    });

    it('grows squares so a year of columns fits the viewport', () => {
        mockViewport(1446);
        expect(getBlockSize()).toBe(20);
    });
});

describe('HeatmapCard', () => {
    beforeEach(() => {
        localStorage.clear();
        auth.user = makeUser();
        timeline.owner = 'owner';
        timeline.entries = [];
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
        vi.restoreAllMocks();
    });

    function heatmapTitles() {
        return screen.getAllByText('Heatmap');
    }

    it('expands from the card background and leaves days, buttons, and popups alone', async () => {
        const user = userEvent.setup();

        renderHeatmap(<HeatmapCard workGoalHistory={[]} />);
        const today = new Date().toISOString().split('T')[0];

        await user.hover(screen.getByTestId(blockId(today)));
        await waitFor(() =>
            expect(screen.getByText('Nothing logged this day')).toBeInTheDocument(),
        );

        // The day popup is modal and hides the card from the accessibility tree.
        fireEvent.click(screen.getByTestId('heatmap-settings-button'));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Single Color Mode' }));
        expect(heatmapTitles()).toHaveLength(1);

        fireEvent.click(screen.getByTestId('heatmap-legend-button'));
        expect(heatmapTitles()).toHaveLength(1);

        fireEvent.click(screen.getByText('Week'));
        expect(heatmapTitles()).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'close' }));
        await waitFor(() => {
            expect(heatmapTitles()).toHaveLength(1);
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sizes the expanded heatmap from the viewport', async () => {
        mockViewport(1446);
        renderHeatmap(<HeatmapCard workGoalHistory={[]} />);
        const today = new Date().toISOString().split('T')[0];

        fireEvent.click(screen.getByText('Week'));

        const dialog = screen.getByRole('dialog');
        await waitFor(() => {
            expect(within(dialog).getByTestId(blockId(today))).toHaveAttribute('width', '20');
        });
        const cardBlock = screen
            .getAllByTestId(blockId(today))
            .find((block) => !dialog.contains(block));
        expect(cardBlock).toHaveAttribute('width', '12');
    });
});
