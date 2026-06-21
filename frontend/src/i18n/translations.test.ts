import type { AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { validate } from './placeholders';
import { stripMeta } from './stripMeta';

const localeModules = import.meta.glob('../../messages/*.json', {
    eager: true,
    import: 'default',
});

function localeOf(path: string): string {
    const m = /([a-zA-Z][a-zA-Z0-9-]*)\.json$/.exec(path);
    if (!m) throw new Error(`could not extract locale from path: ${path}`);
    return m[1];
}

function flatten(obj: unknown, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            const key = prefix ? `${prefix}.${k}` : k;
            Object.assign(out, flatten(v, key));
        }
    } else if (Array.isArray(obj)) {
        obj.forEach((v, i) => Object.assign(out, flatten(v, `${prefix}.${i}`)));
    } else if (typeof obj === 'string') {
        out[prefix] = obj;
    }
    return out;
}

const localeFlat: Record<string, Record<string, string>> = {};
for (const [path, content] of Object.entries(localeModules)) {
    localeFlat[localeOf(path)] = flatten(stripMeta(content as AbstractIntlMessages));
}

const SOURCE_LOCALE = 'en';
const enFlat = localeFlat[SOURCE_LOCALE];
const otherLocales = Object.keys(localeFlat).filter((l) => l !== SOURCE_LOCALE);

describe('translation files', () => {
    it('discovers at least en.json', () => {
        expect(enFlat, 'en.json must be discoverable via import.meta.glob').toBeDefined();
        expect(Object.keys(enFlat).length).toBeGreaterThan(0);
    });

    it('discovers at least one non-English locale', () => {
        expect(otherLocales.length).toBeGreaterThan(0);
    });

    describe.each(otherLocales)('%s.json', (locale) => {
        const flat = localeFlat[locale];

        it('has the same key shape as en.json', () => {
            const enKeys = new Set(Object.keys(enFlat));
            const localeKeys = new Set(Object.keys(flat));
            const missing = [...enKeys].filter((k) => !localeKeys.has(k));
            const extra = [...localeKeys].filter((k) => !enKeys.has(k));
            expect(missing, `${locale}.json is missing keys`).toEqual([]);
            expect(extra, `${locale}.json has extra keys`).toEqual([]);
        });

        it('preserves placeholders from en.json', () => {
            const failures: string[] = [];
            for (const [key, en] of Object.entries(enFlat)) {
                const loc = flat[key];
                if (!loc) continue;
                const errs = validate(en, loc);
                for (const err of errs) {
                    failures.push(`${key}: ${err}`);
                }
            }
            expect(failures).toEqual([]);
        });
    });
});
