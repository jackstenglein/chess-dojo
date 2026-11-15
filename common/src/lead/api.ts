import { z } from 'zod';

export const LeadType = z.enum(['LIVE_CLASS']);

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
    /** The attribution of the lead. */
    attribution: z.record(z.string(), z.string().max(200)).optional(),
});

/** A request to register a new lead. */
export type RegisterLeadRequest = z.infer<typeof registerLeadRequestSchema>;
