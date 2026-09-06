import type { User } from '@/database/user';
import { DataGridPro, type GridColDef, type GridSortCellParams } from '@mui/x-data-grid-pro';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScoreboardRow } from './scoreboardData';
import { privateTrainingColumn } from './trainingPrivacy';

const visible = { username: 'visible', displayName: 'Visible', totalDojoScore: 20 } as User;
const hidden = { username: 'hidden', displayName: 'Hidden', canViewTraining: false } as User;
const another = { username: 'another', displayName: 'Another', canViewTraining: false } as User;
const rows = [visible, hidden, another];
const params = (row: User) =>
    ({
        id: row.username,
        api: { getRow: (id: string) => rows.find((r) => r.username === id) },
    }) as GridSortCellParams;

describe('training scoreboard privacy', () => {
    afterEach(cleanup);

    it('renders Private cells and keeps users available for rating sorting in the grid', async () => {
        const scoreColumn = privateTrainingColumn({
            field: 'totalDojoScore',
            headerName: 'Training score',
            width: 160,
        });
        const ratedRows = [
            { ...visible, rating: 1000 },
            { ...hidden, rating: 2000 },
        ];
        render(
            <div style={{ height: 500, width: 700 }}>
                <DataGridPro
                    disableVirtualization
                    rows={ratedRows}
                    getRowId={(row) => row.username}
                    columns={[
                        { field: 'displayName', headerName: 'Name', width: 160 },
                        { field: 'rating', headerName: 'Rating', type: 'number', width: 160 },
                        scoreColumn,
                    ]}
                    initialState={{
                        sorting: { sortModel: [{ field: 'totalDojoScore', sort: 'desc' }] },
                    }}
                />
            </div>,
        );
        const order = () =>
            screen
                .getAllByRole('row')
                .map((row) => row.getAttribute('data-id'))
                .filter(Boolean);
        await waitFor(() => expect(order()).toEqual(['visible', 'hidden']));
        expect(screen.getByText('Private')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('columnheader', { name: /Training score/ }));
        fireEvent.click(screen.getByRole('columnheader', { name: /Training score/ }));
        await waitFor(() => expect(order()).toEqual(['visible', 'hidden']));
        fireEvent.click(screen.getByRole('columnheader', { name: /Rating/ }));
        fireEvent.click(screen.getByRole('columnheader', { name: /Rating/ }));
        await waitFor(() => expect(order()).toEqual(['hidden', 'visible']));
    });
    it.each(['asc', 'desc'] as const)(
        'keeps restricted rows last and alphabetical for %s',
        (direction) => {
            const column = privateTrainingColumn({ field: 'totalDojoScore' });
            const compare = column.getSortComparator?.(direction);
            if (!compare) throw new Error('Missing comparator');
            expect(compare(20, null, params(visible), params(hidden))).toBeLessThan(0);
            expect(compare(null, 20, params(hidden), params(visible))).toBeGreaterThan(0);
            expect(compare(null, null, params(another), params(hidden))).toBeLessThan(0);
        },
    );

    it('does not invoke progress calculations or renderers for a redacted row', () => {
        const getter = vi.fn(() => 20);
        const renderer = vi.fn(() => '20');
        const column = privateTrainingColumn({
            field: 'cohortScore',
            valueGetter: getter,
            renderCell: renderer,
        });
        expect(column.valueGetter?.(undefined as never, hidden, column, {} as never)).toBeNull();
        expect(column.renderCell?.({ row: hidden } as never)).toBe('Private');
        expect(column.valueFormatter?.(null as never, hidden, column, {} as never)).toBe('Private');
        expect(getter).not.toHaveBeenCalled();
        expect(renderer).not.toHaveBeenCalled();
    });

    it('preserves normal values and formatting for authorized viewers', () => {
        const original: GridColDef<ScoreboardRow> = {
            field: 'totalDojoScore',
            valueFormatter: (value) => `${value} points`,
        };
        const column = privateTrainingColumn(original);
        expect(column.valueGetter?.(undefined as never, visible, column, {} as never)).toBe(20);
        expect(column.valueFormatter?.(20 as never, visible, column, {} as never)).toBe(
            '20 points',
        );
    });
});
