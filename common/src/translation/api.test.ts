import { describe, expect, it } from 'vitest';
import { RequirementTranslationSchema, SetTranslationRequestSchema } from './api';

const base = {
    contentType: 'REQUIREMENT' as const,
    locale: 'de',
    contentKey: 'REQUIREMENT#abc',
    name: 'n',
    shortName: 's',
    dailyName: 'd',
    description: 'desc',
    freeDescription: 'fd',
    progressBarSuffix: 'p',
    updatedAt: '2026-05-24',
    updatedBy: 'admin',
};

describe('RequirementTranslationSchema positions', () => {
    it('parses with a positions array', () => {
        const r = RequirementTranslationSchema.safeParse({ ...base, positions: ['a', 'b'] });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.positions).toEqual(['a', 'b']);
    });

    it('parses when positions is omitted', () => {
        const r = RequirementTranslationSchema.safeParse(base);
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.positions).toBeUndefined();
    });
});

describe('SetTranslationRequestSchema', () => {
    it('accepts a REQUIREMENT with positions and no audit fields', () => {
        const { updatedAt: _updatedAt, updatedBy: _updatedBy, ...noAudit } = base;
        const r = SetTranslationRequestSchema.safeParse({ ...noAudit, positions: ['x'] });
        expect(r.success).toBe(true);
    });
});
