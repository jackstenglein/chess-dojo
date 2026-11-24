import { z } from 'zod';
import { WcAnalysisRequestSchema } from './analysis';
import { WC_EVAL_MAX, WC_EVAL_MIN } from './api';

/**
 * Guest links. A sensei copies a link for a guest on the bar, and whoever
 * opens it acts as that guest without a ChessDojo account: they set their own
 * eval and use the shared analysis board, and nothing else.
 *
 * The link carries a random token. The guest's requests send it in the body
 * (the API only lets browsers send a fixed set of headers, and a body stays
 * out of URLs and logs). A token works while it is the guest's current one
 * and the guest is still on the roster, so making a new link or removing the
 * guest turns the old link off.
 */

/** 18 random bytes as base64url. */
export const guestToken = z.string().regex(/^[A-Za-z0-9_-]{24}$/);

/** The page's address parameter that carries the token. */
export const GUEST_LINK_PARAM = 'guest';

/** The path of the live page; a guest link is this with ?guest=<token>. */
export const LIVE_PAGE_PATH = '/world-championship/live';

export function guestLink(origin: string, token: string): string {
    return `${origin}${LIVE_PAGE_PATH}?${GUEST_LINK_PARAM}=${token}`;
}

const roundId = z.string().regex(/^[A-Za-z0-9]{8}$/);
const senseiId = z.string().regex(/^[A-Za-z0-9_.@+-]{1,64}$/);

/** Who the link belongs to. */
export const WcGuestMeRequestSchema = z.object({ token: guestToken });

/** The guest sets their own eval: there is no senseiId to choose. */
export const WcGuestEvalRequestSchema = z.object({
    token: guestToken,
    roundId,
    ply: z.number().int().min(0).max(600),
    value: z
        .number()
        .min(WC_EVAL_MIN)
        .max(WC_EVAL_MAX)
        .transform((v) => Math.round(v * 10) / 10),
});
export type WcGuestEvalRequest = z.input<typeof WcGuestEvalRequestSchema>;

export const WcGuestAnalysisReadSchema = z.object({ token: guestToken, roundId });

export const WcGuestAnalysisRequestSchema = z.object({
    token: guestToken,
    request: WcAnalysisRequestSchema,
});

/** A sensei makes a new link for a guest; the old one stops working. */
export const WcInviteResetSchema = z.object({ id: senseiId });

/** The guest a link belongs to. */
export interface WcGuestMe {
    id: string;
    name: string;
    color: string;
}

/** For senseis: each guest's current link token, by guest id. */
export interface WcInvites {
    invites: Record<string, string>;
}
