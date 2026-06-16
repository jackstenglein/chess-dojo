import { describe, expect, it } from 'vitest';
import { routing } from './routing';

describe('routing config', () => {
    it('includes en in locales', () => {
        expect(routing.locales).toContain('en');
    });

    it('includes pseudo in locales on nonprod', () => {
        expect(routing.locales).toContain('pseudo');
    });

    it('includes de in locales', () => {
        expect(routing.locales).toContain('de');
    });

    it('includes es in locales', () => {
        expect(routing.locales).toContain('es');
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
