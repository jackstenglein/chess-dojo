export const reviewLinkMessage =
    'Links are allowed only to chessdojo.club, chess.com, and lichess.org.';

const domains = ['chessdojo.club', 'chess.com', 'lichess.org'];
const reviewLinks =
    /(?:(?:[a-z][a-z0-9+.-]*:\/\/|(?:https?|mailto|javascript|data|tel):|\/\/|www\.)[^\s<>"`]+|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+[\p{L}]{2,}(?![\p{L}\p{N}-])(?::[0-9]+)?(?:[/?#][^\s<>"`]*)?)/giu;

/** Feedback for the editor and local demo; the server enforces this independently. */
export function hasDisallowedReviewLinks(text: string): boolean {
    if (/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/.test(text)) return true;
    for (const match of text.matchAll(reviewLinks)) {
        let candidate = match[0].replace(/[.,!?;:)\]}]+$/, '');
        if (candidate.includes('\\')) return true;
        if (candidate.startsWith('//')) candidate = `https:${candidate}`;
        else if (!candidate.includes('://')) {
            if (/^(?:https?|mailto|javascript|data|tel):/i.test(candidate)) return true;
            candidate = `https://${candidate}`;
        }
        try {
            const url = new URL(candidate);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
                return true;
            const host = url.hostname.toLowerCase().replace(/\.$/, '');
            if (!domains.some((domain) => host === domain || host.endsWith(`.${domain}`)))
                return true;
        } catch {
            return true;
        }
    }
    return false;
}
