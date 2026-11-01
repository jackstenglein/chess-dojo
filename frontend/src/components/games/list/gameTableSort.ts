import { GridComparatorFn, GridSortDirection } from '@mui/x-data-grid-pro';

/**
 * Returns the local storage key of the sort model of the GameTable with the given namespace.
 * @param namespace The namespace of the GameTable.
 */
export function getGameTableSortModelKey(namespace: string): string {
    return `/GameTable/${namespace}/sortModel`;
}

/**
 * Returns the comparator of the GameTable Played column. Dates are compared like
 * DynamoDB sort keys, and undated games come last in both directions, matching the
 * order the masters games list is paged in.
 * @param sortDirection The direction of the sort.
 */
export function getPlayedDateSortComparator(
    sortDirection: GridSortDirection,
): GridComparatorFn<string | undefined> {
    const sign = sortDirection === 'desc' ? -1 : 1;
    return (a = '', b = '') => {
        const aUndated = !a || a >= '?';
        const bUndated = !b || b >= '?';
        if (aUndated || bUndated) {
            return Number(aUndated) - Number(bUndated);
        }
        if (a === b) {
            return 0;
        }
        return a < b ? -sign : sign;
    };
}
