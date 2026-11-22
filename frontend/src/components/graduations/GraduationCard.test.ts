import { Graduation } from '@/database/graduation';
import { describe, expect, it } from 'vitest';
import { getHoursSpent } from './GraduationCard';

describe('getHoursSpent', () => {
    it('skips tasks without minutesSpent', () => {
        const progress = {
            RestDay: { requirementId: 'RestDay', counts: null, minutesSpent: null, updatedAt: '' },
            task: { requirementId: 'task', minutesSpent: { '1700-1800': 90 }, updatedAt: '' },
        } as unknown as Graduation['progress'];

        expect(getHoursSpent(progress)).toBe(1.5);
    });
});
