import { gridStringOrNumberComparator, type GridApi, type GridColDef } from '@mui/x-data-grid-pro';
import type { ScoreboardRow } from './scoreboardData';

export function isTrainingPrivate(row: ScoreboardRow | null): boolean {
    return row !== null && 'canViewTraining' in row && row.canViewTraining === false;
}

/** Keep redacted rows last in either direction, without comparing their hidden values. */
export function privateTrainingColumn(
    column: GridColDef<ScoreboardRow>,
): GridColDef<ScoreboardRow> {
    return {
        ...column,
        valueGetter: (value, row, col, api): unknown =>
            isTrainingPrivate(row)
                ? null
                : column.valueGetter
                  ? column.valueGetter(value, row, col, api)
                  : row[column.field as keyof ScoreboardRow],
        renderCell: (params) =>
            isTrainingPrivate(params.row)
                ? 'Private'
                : column.renderCell
                  ? column.renderCell(params)
                  : (params.formattedValue as string),
        valueFormatter: (value, row, col, api): unknown =>
            isTrainingPrivate(row)
                ? 'Private'
                : column.valueFormatter
                  ? column.valueFormatter(value, row, col, api)
                  : value,
        getSortComparator: (direction) => {
            return (v1, v2, p1, p2) => {
                const a = (p1.api as GridApi).getRow<ScoreboardRow>(p1.id);
                const b = (p2.api as GridApi).getRow<ScoreboardRow>(p2.id);
                if (!a || !b) return 0;
                const aPrivate = isTrainingPrivate(a);
                const bPrivate = isTrainingPrivate(b);
                if (aPrivate && bPrivate)
                    return (
                        a.displayName.localeCompare(b.displayName) ||
                        a.username.localeCompare(b.username)
                    );
                if (aPrivate !== bPrivate) return aPrivate ? 1 : -1;
                return (
                    (direction === 'desc' ? -1 : 1) * gridStringOrNumberComparator(v1, v2, p1, p2)
                );
            };
        },
    };
}
