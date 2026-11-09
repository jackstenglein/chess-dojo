import { describe, expect, it } from 'vitest';
import { canonicalPath, isStaticVideoPage } from './staticVideoPages';

describe('isStaticVideoPage', () => {
    it('matches the static video routes and their locale prefixes', () => {
        expect(isStaticVideoPage('/')).toBe(true);
        expect(isStaticVideoPage('/de')).toBe(true);
        expect(isStaticVideoPage('/profile')).toBe(true);
        expect(isStaticVideoPage('/fr/profile/username')).toBe(true);
        expect(isStaticVideoPage('/scoreboard/openings')).toBe(true);
        expect(isStaticVideoPage('/learn/guides')).toBe(true);
        expect(isStaticVideoPage('/learn/live-classes/cohort')).toBe(true);
        expect(isStaticVideoPage('/learn/sparring')).toBe(true);
        expect(isStaticVideoPage('/live-classes')).toBe(true);
        expect(isStaticVideoPage('/admin/courses/OPENING/id')).toBe(true);
        expect(isStaticVideoPage('/blog/dojo-talks/top-10')).toBe(true);
        expect(isStaticVideoPage('/es/admin/blog/id')).toBe(true);
    });

    it('leaves engine routes and course modules to the course index', () => {
        expect(isStaticVideoPage('/games/analysis')).toBe(false);
        expect(isStaticVideoPage('/play-bot')).toBe(false);
        expect(isStaticVideoPage('/courses')).toBe(false);
        expect(isStaticVideoPage('/courses/OPENING/course-id/0/0')).toBe(false);
        expect(isStaticVideoPage('/learn/books')).toBe(false);
        expect(isStaticVideoPage('/blogger')).toBe(false);
    });
});

describe('canonicalPath', () => {
    it('strips the locale, query, and hash', () => {
        expect(canonicalPath('/de/profile/user?tab=1#bio')).toBe('/profile/user');
        expect(canonicalPath('/en/courses/OPENING/id/')).toBe('/courses/OPENING/id');
    });
});
