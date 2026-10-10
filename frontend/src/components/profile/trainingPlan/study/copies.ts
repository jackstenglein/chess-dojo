import { PgnHeaders } from '@/database/game';

/** Names the study item a working copy came from. */
export const STUDY_ITEM_HEADER = 'StudyItem';

/** Carries the course's export flag on the copy so the Share tab needs no course fetch. */
export const STUDY_EXPORT_HEADER = 'StudyExport';

export function isWorkingCopy(headers: PgnHeaders | undefined): boolean {
    return !!headers?.[STUDY_ITEM_HEADER];
}

export function exportAllowed(headers: PgnHeaders | undefined): boolean {
    return headers?.[STUDY_EXPORT_HEADER] !== 'false';
}

/** Export is off when the board config disables it or the copy's header says the course did. */
export function exportBlocked(
    config: { disableExport?: boolean } | undefined,
    headers: PgnHeaders | undefined,
): boolean {
    return !!config?.disableExport || (isWorkingCopy(headers) && !exportAllowed(headers));
}
