import { GameInfo, GameResult, PgnHeaders } from '@/database/game';
import { describe, expect, it } from 'vitest';
import { CanonicalItem } from './book';
import { copyHeaders, exportAllowed, findCopies, isWorkingCopy, studyStamp } from './copies';

const base: PgnHeaders = {
    White: 'Keres',
    Black: 'Smyslov',
    Date: '1939.??.??',
    Site: '?',
    Result: GameResult.Incomplete,
};

const item: CanonicalItem = {
    kind: 'canonical',
    key: 'course:STUDY/x/m1/0',
    name: 'Keres vs Smyslov',
    pgn: '',
    orientation: 'white',
    allowExport: false,
};

function gameInfo(id: string, headers: Record<string, string>): GameInfo {
    return { cohort: '1500-1600', id, headers: { ...base, ...headers } } as GameInfo;
}

describe('copies', () => {
    it('recognises a working copy by its StudyItem header', () => {
        expect(isWorkingCopy(undefined)).toBe(false);
        expect(isWorkingCopy(base)).toBe(false);
        expect(isWorkingCopy({ ...base, StudyItem: 'course:STUDY/x/m1/0' })).toBe(true);
    });

    it('forbids export only for the literal StudyExport false', () => {
        expect(exportAllowed(undefined)).toBe(true);
        expect(exportAllowed(base)).toBe(true);
        expect(exportAllowed({ ...base, StudyExport: 'true' })).toBe(true);
        expect(exportAllowed({ ...base, StudyExport: 'false' })).toBe(false);
    });

    it('stamps the copy with twelve hex digits of the username hash', async () => {
        const stamp = await studyStamp('student');
        expect(stamp).toMatch(/^[0-9a-f]{12}$/);
        expect(stamp).toBe(await studyStamp('student'));
        expect(stamp).not.toBe(await studyStamp('other'));
    });

    it('writes the three headers for a copy', () => {
        expect(copyHeaders(item, 'abcdef012345')).toEqual({
            StudyItem: 'course:STUDY/x/m1/0',
            StudyStamp: 'abcdef012345',
            StudyExport: 'false',
        });
        expect(copyHeaders({ ...item, allowExport: true }, 's').StudyExport).toBe('true');
    });

    it('finds copies by their StudyItem header and ignores other games', () => {
        const copies = findCopies([
            gameInfo('plain', {}),
            gameInfo('copy-1', { StudyItem: 'course:STUDY/x/m1/0' }),
            gameInfo('copy-1-dup', { StudyItem: 'course:STUDY/x/m1/0' }),
            gameInfo('copy-2', { StudyItem: 'course:STUDY/x/m2/0' }),
        ]);
        expect(copies.size).toBe(2);
        expect(copies.get('course:STUDY/x/m1/0')).toEqual({ cohort: '1500-1600', id: 'copy-1' });
        expect(copies.get('course:STUDY/x/m2/0')).toEqual({ cohort: '1500-1600', id: 'copy-2' });
    });
});
