/** Where the current row sits relative to the list's viewport, in pixels. */
export interface RowPlacement {
    /** The row's top edge measured from the viewport's top edge. */
    offset: number;
    rowHeight: number;
    listHeight: number;
}

/**
 * How far the list must scroll to show the current row. A row already in view stays put, so
 * choosing a visible row never moves the list under the pointer. A row just outside comes to
 * the nearest edge, which is how Prev and Next walk the list. A row further away than one
 * viewport comes to the centre. A row taller than the viewport shows its top.
 */
export function scrollDelta({ offset, rowHeight, listHeight }: RowPlacement): number {
    if (rowHeight >= listHeight) {
        return offset;
    }
    const below = offset + rowHeight - listHeight;
    if (offset >= 0 && below <= 0) {
        return 0;
    }
    const centre = offset - (listHeight - rowHeight) / 2;
    if (offset < 0) {
        return -offset < listHeight ? offset : centre;
    }
    return below < listHeight ? below : centre;
}
