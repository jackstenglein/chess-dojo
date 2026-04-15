import { AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { stripMeta } from './stripMeta';

describe('stripMeta', () => {
    it('returns input content unchanged when _translationMeta is absent', () => {
        const input: AbstractIntlMessages = {
            common: { cancel: 'Cancel' },
            profile: { title: 'Profile' },
        };
        expect(stripMeta(input)).toEqual({
            common: { cancel: 'Cancel' },
            profile: { title: 'Profile' },
        });
    });

    it('strips _translationMeta while preserving all other top-level keys', () => {
        const input = {
            _translationMeta: { skipAutoTranslate: { foo: 'bar' } },
            common: { cancel: 'Cancel' },
            profile: { title: 'Profile' },
        } as unknown as AbstractIntlMessages;
        const result = stripMeta(input) as Record<string, unknown>;
        expect(result).toEqual({
            common: { cancel: 'Cancel' },
            profile: { title: 'Profile' },
        });
        expect('_translationMeta' in result).toBe(false);
    });

    it('preserves nested objects when _translationMeta is present', () => {
        const nested = { deeply: { nested: { value: 'keep' } } };
        const input = {
            _translationMeta: { anything: 'whatever' },
            ...nested,
        } as unknown as AbstractIntlMessages;
        expect(stripMeta(input)).toEqual(nested);
    });

    it('does not mutate the input object', () => {
        const input = {
            _translationMeta: { x: 'y' },
            common: { cancel: 'Cancel' },
        } as unknown as AbstractIntlMessages;
        const snapshot = JSON.stringify(input);
        stripMeta(input);
        expect(JSON.stringify(input)).toBe(snapshot);
        expect('_translationMeta' in input).toBe(true);
    });
});
