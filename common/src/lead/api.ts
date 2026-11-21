import { z } from 'zod';
import { WC_MAX_DISPLAY_NAME, wcPicksSchema } from './worldChampionship';

export const LeadType = z.enum(['LIVE_CLASS', 'WC_PREDICTION', 'WC_RESULTS']);

export const LiveClassLeadId = z.enum(['LOGICAL_CHESS', 'CALCULATION', 'GAME_REVIEW']);

export type LiveClassLeadId = z.infer<typeof LiveClassLeadId>;

/** Verifies the type of a register lead request. */
export const registerLeadRequestSchema = z.object({
    /** The email of the lead. */
    email: z.email().max(254),
    /** The type of the lead. */
    type: LeadType,
    /** The id of the class, if the lead is a live class lead. */
    classId: LiveClassLeadId.optional(),
    /** The picks, if the lead is a World Championship prediction. */
    picks: wcPicksSchema.optional(),
    /** The name shown on the picks card, if the lead is a World Championship prediction. */
    displayName: z.string().trim().max(WC_MAX_DISPLAY_NAME).optional(),
    /** The attribution of the lead. */
    attribution: z.record(z.string(), z.string().max(200)).optional(),
});

/** A request to register a new lead. */
export type RegisterLeadRequest = z.infer<typeof registerLeadRequestSchema>;
