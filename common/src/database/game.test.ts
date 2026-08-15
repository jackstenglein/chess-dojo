import { describe, expect, it } from 'vitest';
import { UpdateGameSchema } from './game';

describe('UpdateGameSchema', () => {
    it('parses with missing type', () => {
        const result = UpdateGameSchema.parse({
            cohort: '1900-2000',
            id: 'MjAyNi4wNS4yOF8yYzIwNDkwNS0zYzY1LTQ5ODAtYjVlYy0zZWVhN2EwNmRhZTk=',
            updatedAt: '2026-05-28T12:00:00.000Z',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
        });
        expect(result).toEqual({
            cohort: '1900-2000',
            id: '2026.05.28_2c204905-3c65-4980-b5ec-3eea7a06dae9',
            updatedAt: '2026-05-28T12:00:00.000Z',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
        });
    });

    it('parses with undefined type', () => {
        const result = UpdateGameSchema.parse({
            cohort: '1900-2000',
            id: 'MjAyNi4wNS4yOF8yYzIwNDkwNS0zYzY1LTQ5ODAtYjVlYy0zZWVhN2EwNmRhZTk=',
            updatedAt: '2026-05-28T12:00:00.000Z',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
            type: undefined,
        });
        expect(result).toEqual({
            cohort: '1900-2000',
            id: '2026.05.28_2c204905-3c65-4980-b5ec-3eea7a06dae9',
            updatedAt: '2026-05-28T12:00:00.000Z',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
        });
    });

    it('requires updatedAt for optimistic concurrency', () => {
        expect(() =>
            UpdateGameSchema.parse({
                cohort: '1900-2000',
                id: 'MjAyNi4wNS4yOF8yYzIwNDkwNS0zYzY1LTQ5ODAtYjVlYy0zZWVhN2EwNmRhZTk=',
                orientation: 'white',
                type: 'manual',
                pgnText: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O Nf6 5. d3 Bb4+ 6. c3 d5 7. cxd5',
            }),
        ).toThrow();
    });

    it('allows forceUpdate to bypass updatedAt for optimistic concurrency', () => {
        const result = UpdateGameSchema.parse({
            cohort: '1900-2000',
            id: 'MjAyNi4wNS4yOF8yYzIwNDkwNS0zYzY1LTQ5ODAtYjVlYy0zZWVhN2EwNmRhZTk=',
            orientation: 'white',
            type: 'manual',
            pgnText: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O Nf6 5. d3 Bb4+ 6. c3 d5 7. cxd5',
            forceUpdate: true,
        });
        expect(result).toEqual({
            cohort: '1900-2000',
            id: '2026.05.28_2c204905-3c65-4980-b5ec-3eea7a06dae9',
            orientation: 'white',
            forceUpdate: true,
            type: 'manual',
            pgnText: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O Nf6 5. d3 Bb4+ 6. c3 d5 7. cxd5',
        });
    });
});
