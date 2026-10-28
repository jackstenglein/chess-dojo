import { expect, it } from 'vitest';
import { hasDisallowedReviewLinks } from './courseReviewLinks';

it.each([
    '',
    'Helpful analysis of 1.e4 and 2.Nf3',
    'https://chessdojo.club/courses',
    'https://www.chess.com/analysis',
    'lichess.org/study/abc',
    'www.chessdojo.club',
    'See CHESS.COM and https://study.lichess.org/abc.',
    '[Study](https://lichess.org/study/abc)',
    '(https://chess.com/analysis).',
    '//chessdojo.club/courses',
    'https://chess.com./analysis',
])('allows approved sites and ordinary text: %s', (text) => {
    expect(hasDisallowedReviewLinks(text)).toBe(false);
});
it.each([
    'https://example.com',
    'example.com/path',
    'www.example.com',
    'chess.com.evil.org',
    'fakechess.com',
    'https://chess.com@evil.org',
    'https://evil.org@chess.com',
    '//evil.org',
    'https://chess.com and evil.org',
    '[chess.com](https://evil.org)',
    'https://127.0.0.1',
    '127.0.0.1/review',
    'ftp://chess.com/file',
    'javascript:alert(1)',
    'mailto:test@chess.com',
    'https:chess.com',
    'https://chess.com\\@evil.org',
    'https://chеss.com',
    'evil.рф',
])('blocks other sites and disguised links: %s', (text) => {
    expect(hasDisallowedReviewLinks(text)).toBe(true);
});
