import { describe, expect, it } from 'vitest';
import { routing } from './routing';

describe('routing config', () => {
    it('contains expected locales', () => {
        expect(routing.locales).toEqual(['en', 'pseudo', 'de', 'es', 'pt']);
    });

    it('defaults to en', () => {
        expect(routing.defaultLocale).toBe('en');
    });

    it('uses as-needed prefix mode', () => {
        expect(routing.localePrefix).toBe('as-needed');
    });

    it('enables locale detection', () => {
        expect(routing.localeDetection).toBe(true);
    });
});
