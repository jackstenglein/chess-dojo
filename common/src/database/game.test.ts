import { describe, expect, it } from 'vitest';
import { UpdateGameSchema } from './game';

describe('UpdateGameSchema', () => {
    it('parses with missing type', () => {
        const result = UpdateGameSchema.parse({
            cohort: '1900-2000',
            id: 'MjAyNi4wNS4yOF8yYzIwNDkwNS0zYzY1LTQ5ODAtYjVlYy0zZWVhN2EwNmRhZTk=',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
        });
        expect(result).toEqual({
            cohort: '1900-2000',
            id: '2026.05.28_2c204905-3c65-4980-b5ec-3eea7a06dae9',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
        });
    });

    it('parses with undefined type', () => {
        const result = UpdateGameSchema.parse({
            cohort: '1900-2000',
            id: 'MjAyNi4wNS4yOF8yYzIwNDkwNS0zYzY1LTQ5ODAtYjVlYy0zZWVhN2EwNmRhZTk=',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
            type: undefined,
        });
        expect(result).toEqual({
            cohort: '1900-2000',
            id: '2026.05.28_2c204905-3c65-4980-b5ec-3eea7a06dae9',
            orientation: 'white',
            timelineId: '2026-05-28_b9678a3f-77df-41e8-8f00-f05bb84be573',
            unlisted: true,
        });
    });
});
