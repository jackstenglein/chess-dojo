import { describe, expect, it } from 'vitest';
import { sanitizeRedirectUri } from './sanitizeRedirectUri';

describe('sanitizeRedirectUri', () => {
    it('returns fallback for null, undefined, empty string', () => {
        expect(sanitizeRedirectUri(null)).toBe('/profile');
        expect(sanitizeRedirectUri(undefined)).toBe('/profile');
        expect(sanitizeRedirectUri('')).toBe('/profile');
    });

    it('honours a custom fallback', () => {
        expect(sanitizeRedirectUri(null, '/')).toBe('/');
    });

    it('passes through a bare same-origin path', () => {
        expect(sanitizeRedirectUri('/profile/edit')).toBe('/profile/edit');
    });

    it('preserves query string and fragment', () => {
        expect(sanitizeRedirectUri('/games/import?source=lichess')).toBe(
            '/games/import?source=lichess',
        );
        expect(sanitizeRedirectUri('/profile/edit#notifications-email')).toBe(
            '/profile/edit#notifications-email',
        );
    });

    it('decodes percent-encoded input', () => {
        expect(sanitizeRedirectUri('%2Fprofile%2Fedit')).toBe('/profile/edit');
    });

    it('strips a stale locale prefix', () => {
        expect(sanitizeRedirectUri('/en/profile')).toBe('/profile');
        expect(sanitizeRedirectUri('/de/profile')).toBe('/profile');
        expect(sanitizeRedirectUri('/pseudo/profile')).toBe('/profile');
    });

    it('collapses to / when only a locale prefix is present', () => {
        expect(sanitizeRedirectUri('/en')).toBe('/');
        expect(sanitizeRedirectUri('/de')).toBe('/');
    });

    it('rejects absolute http(s) URLs', () => {
        expect(sanitizeRedirectUri('http://evil.com')).toBe('/profile');
        expect(sanitizeRedirectUri('https://evil.com/path')).toBe('/profile');
    });

    it('rejects protocol-relative URLs', () => {
        expect(sanitizeRedirectUri('//evil.com')).toBe('/profile');
        expect(sanitizeRedirectUri('//evil.com/path')).toBe('/profile');
    });

    it('rejects backslash-prefixed bypass attempts', () => {
        expect(sanitizeRedirectUri('/\\evil.com')).toBe('/profile');
        expect(sanitizeRedirectUri('\\evil.com')).toBe('/profile');
        expect(sanitizeRedirectUri('\\\\evil.com')).toBe('/profile');
    });

    it('rejects paths that do not start with /', () => {
        expect(sanitizeRedirectUri('profile')).toBe('/profile');
        expect(sanitizeRedirectUri('javascript:alert(1)')).toBe('/profile');
    });

    it('returns fallback for malformed percent encoding', () => {
        expect(sanitizeRedirectUri('%E0%A4%A')).toBe('/profile');
    });
});
