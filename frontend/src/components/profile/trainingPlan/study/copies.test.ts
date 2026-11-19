import { GameResult, PgnHeaders } from '@/database/game';
import { describe, expect, it } from 'vitest';
import { exportAllowed, isWorkingCopy } from './copies';

const base: PgnHeaders = {
    White: 'Keres',
    Black: 'Smyslov',
    Date: '1939.??.??',
    Site: '?',
    Result: GameResult.Incomplete,
};

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
});
