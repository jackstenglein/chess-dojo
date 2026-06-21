import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetProgressButton } from './ResetProgressButton';

vi.mock('@/api/Api', () => ({ useApi: vi.fn() }));
vi.mock('@/analytics/events', () => ({
    EventType: { ResetProgress: 'reset_progress' },
    trackEvent: vi.fn(),
}));

describe('ResetProgressButton', () => {
    const resetUserProgress = vi.fn();

    beforeEach(() => {
        resetUserProgress.mockResolvedValue({ data: { username: 'dojo-user', progress: {} } });
        vi.mocked(useApi).mockReturnValue({
            resetUserProgress,
        } as unknown as ReturnType<typeof useApi>);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('requires typing confirm before enabling reset', () => {
        render(<ResetProgressButton />);

        fireEvent.click(screen.getByTestId('reset-progress-open-button'));
        expect(screen.getByTestId('reset-progress-confirm-button')).toBeDisabled();

        fireEvent.change(screen.getByLabelText('Type "confirm" to confirm'), {
            target: { value: 'delete' },
        });
        expect(screen.getByTestId('reset-progress-confirm-button')).toBeDisabled();

        fireEvent.change(screen.getByLabelText('Type "confirm" to confirm'), {
            target: { value: 'confirm' },
        });
        expect(screen.getByTestId('reset-progress-confirm-button')).toBeEnabled();
    });

    it('calls the reset api and tracks the reset event', async () => {
        render(<ResetProgressButton />);

        fireEvent.click(screen.getByTestId('reset-progress-open-button'));
        fireEvent.change(screen.getByLabelText('Type "confirm" to confirm'), {
            target: { value: 'confirm' },
        });
        fireEvent.click(screen.getByTestId('reset-progress-confirm-button'));

        await waitFor(() => {
            expect(resetUserProgress).toHaveBeenCalledWith('confirm');
        });
        expect(trackEvent).toHaveBeenCalledWith(EventType.ResetProgress);
    });
});
