import {
    isArgumentElement,
    isDateElement,
    isNumberElement,
    isPluralElement,
    isSelectElement,
    isTagElement,
    isTimeElement,
    type MessageFormatElement,
    parse,
} from '@formatjs/icu-messageformat-parser';

export interface PlaceholderInventory {
    variables: Set<string>;
    tags: Map<string, { open: number; close: number }>;
    templates: Set<string>;
    parseError?: string;
}

const TEMPLATE_RE = /\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/g;
const OPEN_TAG_RE = /<([a-zA-Z][a-zA-Z0-9]*)>/g;
const CLOSE_TAG_RE = /<\/([a-zA-Z][a-zA-Z0-9]*)>/g;

function collectVariables(elements: MessageFormatElement[], out: Set<string>): void {
    for (const el of elements) {
        if (
            isArgumentElement(el) ||
            isNumberElement(el) ||
            isDateElement(el) ||
            isTimeElement(el)
        ) {
            out.add(el.value);
        } else if (isPluralElement(el) || isSelectElement(el)) {
            out.add(el.value);
            for (const opt of Object.values(el.options)) {
                collectVariables(opt.value, out);
            }
        } else if (isTagElement(el)) {
            collectVariables(el.children, out);
        }
    }
}

function extractVariables(s: string): { variables: Set<string>; parseError?: string } {
    const stripped = s.replace(TEMPLATE_RE, '');
    const out = new Set<string>();
    let elements: MessageFormatElement[];
    try {
        elements = parse(stripped);
    } catch (e) {
        return { variables: out, parseError: (e as Error).message };
    }
    collectVariables(elements, out);
    return { variables: out };
}

function extractTags(s: string): Map<string, { open: number; close: number }> {
    const out = new Map<string, { open: number; close: number }>();
    for (const m of s.matchAll(OPEN_TAG_RE)) {
        const name = m[1];
        const cur = out.get(name) ?? { open: 0, close: 0 };
        cur.open += 1;
        out.set(name, cur);
    }
    for (const m of s.matchAll(CLOSE_TAG_RE)) {
        const name = m[1];
        const cur = out.get(name) ?? { open: 0, close: 0 };
        cur.close += 1;
        out.set(name, cur);
    }
    return out;
}

function extractTemplates(s: string): Set<string> {
    return new Set(s.match(TEMPLATE_RE) ?? []);
}

export function extract(s: string): PlaceholderInventory {
    const { variables, parseError } = extractVariables(s);
    return {
        variables,
        tags: extractTags(s),
        templates: extractTemplates(s),
        parseError,
    };
}

export function validate(source: string, target: string): string[] {
    if (target === '') return [];

    const src = extract(source);
    const tgt = extract(target);
    const errors: string[] = [];

    if (src.parseError) {
        errors.push(`source could not be parsed as ICU: ${src.parseError}`);
    }
    if (tgt.parseError) {
        errors.push(`target could not be parsed as ICU: ${tgt.parseError}`);
    }

    if (!src.parseError && !tgt.parseError) {
        for (const v of src.variables) {
            if (!tgt.variables.has(v)) {
                errors.push(`missing variable {${v}} (source uses it; target does not)`);
            }
        }
        for (const v of tgt.variables) {
            if (!src.variables.has(v)) {
                errors.push(`extra variable {${v}} (target uses it; source does not)`);
            }
        }
    }

    for (const [tagName, srcCounts] of src.tags) {
        const tgtCounts = tgt.tags.get(tagName) ?? { open: 0, close: 0 };
        if (tgtCounts.open !== srcCounts.open) {
            errors.push(
                `<${tagName}> opening-tag count mismatch: source=${srcCounts.open} target=${tgtCounts.open}`,
            );
        }
        if (tgtCounts.close !== srcCounts.close) {
            errors.push(
                `</${tagName}> closing-tag count mismatch: source=${srcCounts.close} target=${tgtCounts.close}`,
            );
        }
    }
    for (const tagName of tgt.tags.keys()) {
        if (!src.tags.has(tagName)) {
            errors.push(`extra <${tagName}> tag (target uses it; source does not)`);
        }
    }

    for (const tpl of src.templates) {
        if (!tgt.templates.has(tpl)) {
            errors.push(`missing template ${tpl}`);
        }
    }
    for (const tpl of tgt.templates) {
        if (!src.templates.has(tpl)) {
            errors.push(`extra template ${tpl}`);
        }
    }

    return errors;
}
