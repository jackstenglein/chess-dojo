import { Chess } from '@jackstenglein/chess';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '~/messages/en.json';
import ClockUsage, { Datum } from './ClockUsage';

const mocks = vi.hoisted(() => ({ chess: undefined as Chess | undefined }));

vi.mock('@/board/pgn/PgnBoard', () => ({
    useChess: () => ({ chess: mocks.chess }),
}));
vi.mock('@/board/Board', () => ({ useReconcile: () => vi.fn() }));
vi.mock('@/style/useLightMode', () => ({ useLightMode: () => false }));
vi.mock('./ClockEditor', () => ({ default: () => null }));
vi.mock('../tags/TimeControlEditor', () => ({ TimeControlEditor: () => null }));
vi.mock('usehooks-ts', () => ({
    useLocalStorage: (key: string, initialValue: boolean) => [
        key === 'showIdealClockUsage' ? true : initialValue,
        vi.fn(),
    ],
}));
vi.mock('react-charts', () => ({
    Chart: ({ options }: { options: { data: { label: string; data: Datum[] }[] } }) => (
        <pre data-testid='clock-chart'>
            {JSON.stringify(
                options.data.map(({ label, data }) => ({
                    label,
                    data: data.map(({ moveNumber, seconds }) => ({ moveNumber, seconds })),
                })),
            )}
        </pre>
    ),
}));

function renderClock(timeControl: string, moveCount = 95) {
    const moves = Array.from(
        { length: moveCount },
        (_, index) => `${index + 1}. ${index % 2 === 0 ? 'Nf3 Nf6' : 'Ng1 Ng8'}`,
    ).join(' ');
    mocks.chess = new Chess({ pgn: `[TimeControl "${timeControl}"]\n\n${moves} *` });
    render(
        <NextIntlClientProvider
            locale='en'
            messages={{
                analysisBoard: { underboard: { clock: messages.analysisBoard.underboard.clock } },
            }}
        >
            <ClockUsage />
        </NextIntlClientProvider>,
    );

    const series = JSON.parse(screen.getAllByTestId('clock-chart')[0].textContent ?? '[]') as {
        label: string;
        data: { moveNumber: number; seconds: number }[];
    }[];
    const ideal = series.find((item) => item.label === 'Ideal');
    expect(ideal).toBeDefined();
    return ideal?.data ?? [];
}

describe('ClockUsage ideal line', () => {
    afterEach(cleanup);

    it('draws a declining second-stage curve through move 90', () => {
        const ideal = renderClock('40/5400+30:1800+30');
        expect(ideal[0]).toEqual({ moveNumber: 5, seconds: 5400 });
        expect(ideal.find((datum) => datum.moveNumber === 40)).toEqual({
            moveNumber: 40,
            seconds: 2181,
        });
        expect(ideal.find((datum) => datum.moveNumber === 65)).toEqual({
            moveNumber: 65,
            seconds: 635,
        });
        expect(ideal.at(-1)).toEqual({ moveNumber: 90, seconds: 120 });
        expect(ideal).toHaveLength(86);
    });

    it('preserves the single-control cutoff at move 50', () => {
        const ideal = renderClock('5400+30');
        expect(ideal.at(-1)).toEqual({ moveNumber: 50, seconds: 120 });
        expect(ideal).toHaveLength(46);
    });

    it('only draws the second stage up to the moves actually played', () => {
        const ideal = renderClock('40/5400+30:1800+30', 41);
        expect(ideal.at(-1)?.moveNumber).toBe(41);
        expect(ideal).toHaveLength(37);
    });
});
