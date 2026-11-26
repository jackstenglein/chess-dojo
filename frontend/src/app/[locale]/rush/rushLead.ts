import { axiosService } from '@/api/axiosService';
import { LeadType, RegisterLeadRequest } from '@jackstenglein/chess-dojo-common/src/lead/api';
import { z } from 'zod';

/** What the unlock screen collects when a visitor asks for their code by email. */
export const rushLeadSchema = z.object({
    email: z.email().max(254),
    consent: z.literal(true),
    /** The visitor's best score across their runs. */
    bestScore: z.number().int().min(0).max(500),
    /** The score of each finished run, oldest first. */
    scores: z.array(z.number().int().min(0).max(500)).max(10).optional(),
    attribution: z.record(z.string(), z.string().max(200)).optional(),
    /** Honeypot field. Hidden from people, so only bots fill it in. */
    website: z.string().max(0).optional(),
});

export type RushLead = z.infer<typeof rushLeadSchema>;

/**
 * Sends the lead to the lead service, which saves it and emails the code. Resolves
 * to true only when the service took it, so the page never tells a visitor a code
 * is coming when nothing was stored or sent.
 */
export async function submitRushLead(lead: RushLead): Promise<boolean> {
    const request: RegisterLeadRequest = {
        type: LeadType.enum.RUSH_DEMO,
        email: lead.email,
        rush: { bestScore: lead.bestScore, scores: lead.scores },
        attribution: lead.attribution,
    };
    try {
        await axiosService.post('/public/lead', request, { functionName: 'registerLead' });
        return true;
    } catch {
        return false;
    }
}
