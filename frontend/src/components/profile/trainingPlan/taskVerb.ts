/** A task's leading verb, when it is one shown as an icon instead of a word. */
export type TaskVerb =
    'read' | 'watch' | 'solve' | 'study' | 'play' | 'spar' | 'annotate' | 'review' | 'guide';

const VERBS: TaskVerb[] = ['read', 'watch', 'solve', 'study', 'play', 'spar', 'annotate', 'review'];

/** Reading that is a Dojo guide or how-to, rather than a book. */
const GUIDE_PATTERN = /\bguide\b|^how to\b/i;

const VERB_PATTERN = new RegExp(`^(${VERBS.join('|')})\\s+(?:(?:a|an|the)\\s+)?(.+)$`, 'i');

/**
 * Splits a task name into its leading verb and the rest, so the verb can be shown
 * as an icon: "Read How to Find a Training Partner" becomes read + "How to Find a
 * Training Partner", and "Annotate a Classical Game" becomes annotate + "Classical
 * Game". Names that don't start with a known verb, including names in other
 * languages, come back unchanged.
 * @param name The task's display name.
 */
export function splitTaskVerb(name: string): { verb?: TaskVerb; rest: string } {
    const match = VERB_PATTERN.exec(name.trim());
    if (!match) {
        return { rest: name };
    }
    const rest = match[2];
    return {
        verb: match[1].toLowerCase() as TaskVerb,
        rest: rest.charAt(0).toUpperCase() + rest.slice(1),
    };
}

/** Verbs that stay in a task's name, alongside their icon: "Review" and "Spar" read oddly without them. */
const VERBS_KEPT_IN_NAME: TaskVerb[] = ['review', 'spar'];

/**
 * Splits a task name for display: its verb, to show as an icon, and the name to
 * show beside it. Review and spar tasks keep their verb in the name, and reading
 * a guide ("Read How to Find a Training Partner") is told apart from a book.
 * @param name The task's display name.
 */
export function splitDisplayName(name: string): { verb?: TaskVerb; rest: string } {
    const { verb, rest } = splitTaskVerb(name);
    if (verb && VERBS_KEPT_IN_NAME.includes(verb)) {
        return { verb, rest: name };
    }
    // Guides get their own icon; other reading is a book.
    if (verb === 'read' && GUIDE_PATTERN.test(rest)) {
        return { verb: 'guide', rest };
    }
    return { verb, rest };
}
