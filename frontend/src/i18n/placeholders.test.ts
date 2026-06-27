import { describe, expect, it } from 'vitest';
import { extract, validate } from './placeholders';

describe('extract', () => {
    it('returns empty inventory for plain text', () => {
        const inv = extract('Hello world');
        expect(inv.variables).toEqual(new Set());
        expect(inv.tags).toEqual(new Map());
        expect(inv.templates).toEqual(new Set());
        expect(inv.parseError).toBeUndefined();
    });

    it('extracts simple ICU variables', () => {
        const inv = extract('Hello {name}, you have {count} games');
        expect(inv.variables).toEqual(new Set(['name', 'count']));
    });

    it('extracts the variable from an ICU plural', () => {
        const inv = extract(
            '{count, plural, =1 {Show # completed task} other {Show # completed tasks}}',
        );
        expect(inv.variables).toEqual(new Set(['count']));
    });

    it('extracts variables from nested ICU plural branches', () => {
        const inv = extract(
            '{count, plural, one {Hello {name}} other {Hi {name}, you have # tasks}}',
        );
        expect(inv.variables).toEqual(new Set(['count', 'name']));
    });

    it('extracts variables from ICU select', () => {
        const inv = extract('{gender, select, male {He} female {She} other {They}} won.');
        expect(inv.variables).toEqual(new Set(['gender']));
    });

    it('extracts variables from number/date/time formatted args', () => {
        expect(extract('{count, number}').variables).toEqual(new Set(['count']));
        expect(extract('{count, number, percent}').variables).toEqual(new Set(['count']));
        expect(extract('Updated {date, date, short}').variables).toEqual(new Set(['date']));
        expect(extract('At {time, time}').variables).toEqual(new Set(['time']));
    });

    it('counts opening and closing tags', () => {
        const inv = extract('Click <link>here</link> or <strong>here</strong>');
        expect(inv.tags.get('link')).toEqual({ open: 1, close: 1 });
        expect(inv.tags.get('strong')).toEqual({ open: 1, close: 1 });
    });

    it('counts repeated tags', () => {
        const inv = extract('See <link>one</link> and <link>two</link>');
        expect(inv.tags.get('link')).toEqual({ open: 2, close: 2 });
    });

    it('counts a tag nested inside a plural branch', () => {
        const inv = extract('{count, plural, one {<link>one</link>} other {<link>many</link>}}');
        expect(inv.tags.get('link')).toEqual({ open: 2, close: 2 });
    });

    it('extracts template placeholders', () => {
        const inv = extract('Reach {{count}} games');
        expect(inv.templates).toEqual(new Set(['{{count}}']));
        expect(inv.variables).toEqual(new Set());
    });

    it('handles a real chess-dojo string with all three placeholder types', () => {
        const s =
            'For the {cohort} cohort, <strong>we recommend a minimum of {minTimeControl}</strong>. Reach {{count}} games.';
        const inv = extract(s);
        expect(inv.variables).toEqual(new Set(['cohort', 'minTimeControl']));
        expect(inv.variables.has('count')).toBe(false);
        expect(inv.tags.get('strong')).toEqual({ open: 1, close: 1 });
        expect(inv.templates).toEqual(new Set(['{{count}}']));
        expect(inv.parseError).toBeUndefined();
    });

    it('records a parseError on malformed ICU and does not throw', () => {
        const inv = extract('Hello {name, world');
        expect(inv.parseError).toBeDefined();
        expect(inv.variables).toEqual(new Set());
    });
});

describe('validate', () => {
    it('returns no errors when target preserves everything', () => {
        const errors = validate(
            'Hello {name}, you have {count} games',
            'Hallo {name}, Sie haben {count} Spiele',
        );
        expect(errors).toEqual([]);
    });

    it('flags a missing variable', () => {
        const errors = validate('You have {count} games', 'Du hast Spiele');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatch(/missing variable.*count/i);
    });

    it('flags a missing tag pair', () => {
        const errors = validate(
            'Click <link>here</link> to continue',
            'Klicken Sie hier, um fortzufahren',
        );
        expect(errors.length).toBeGreaterThanOrEqual(2);
        expect(errors.join('\n')).toMatch(/<link>/);
        expect(errors.join('\n')).toMatch(/<\/link>/);
    });

    it('flags an unbalanced tag (open without close)', () => {
        const errors = validate(
            'Click <link>here</link>',
            'Klicken Sie <link>hier um fortzufahren',
        );
        expect(errors.length).toBeGreaterThanOrEqual(1);
        expect(errors.join('\n')).toMatch(/<\/link>/);
    });

    it('flags a missing template placeholder', () => {
        const errors = validate('Reach {{count}} games', 'Spiele erreichen');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatch(/\{\{count\}\}/);
    });

    it('flags a tag added in target that is absent from source', () => {
        const errors = validate('Click here', 'Klicken Sie <link>hier</link>');
        expect(errors.some((e) => e.includes('extra <link>'))).toBe(true);
    });

    it('flags a variable added in target that is absent from source', () => {
        const errors = validate('Hello world', 'Hallo {name}');
        expect(errors.some((e) => e.includes('extra variable {name}'))).toBe(true);
    });

    it('flags a template added in target that is absent from source', () => {
        const errors = validate('Reach games', 'Erreiche {{count}} Spiele');
        expect(errors.some((e) => e.includes('extra template {{count}}'))).toBe(true);
    });

    it('accepts different ICU plural selectors as long as the variable is preserved', () => {
        const errors = validate(
            '{count, plural, =1 {1 task} other {# tasks}}',
            '{count, plural, one {1 Aufgabe} other {# Aufgaben}}',
        );
        expect(errors).toEqual([]);
    });

    it('returns multiple errors for multiple drops', () => {
        const errors = validate('Hi {name}, click <link>here</link>', 'Hallo, klicken Sie');
        expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it('treats empty target as valid (caller decides)', () => {
        expect(validate('Hi {name}', '')).toEqual([]);
    });

    it('flags a malformed source as a parse error', () => {
        const errors = validate('Hello {name, world', 'Hallo Welt');
        expect(errors.some((e) => /source could not be parsed/i.test(e))).toBe(true);
    });

    it('flags a malformed target as a parse error and skips the placeholder comparison', () => {
        const errors = validate('Hello {name}', 'Hallo {name, world');
        expect(errors.some((e) => /target could not be parsed/i.test(e))).toBe(true);
        expect(errors.some((e) => e.includes('extra variable'))).toBe(false);
        expect(errors.some((e) => e.includes('missing variable'))).toBe(false);
    });
});
