import { axiosService } from '@/api/axiosService';
import { LeadType, RegisterLeadRequest } from '@jackstenglein/chess-dojo-common/src/lead/api';
import { isAxiosError } from 'axios';
import { WcEntry } from './prediction';

export type SubmitOutcome = 'stored' | 'closed' | 'failed';

/**
 * A local dev server may talk to an API that does not know the contest yet. The
 * flow still finishes there, so the page can be reviewed.
 */
const ACCEPT_UNSTORED = process.env.NODE_ENV === 'development';

/**
 * Sends a prediction or a results sign up to the lead service, which saves it
 * and emails a prediction back to the visitor. "stored" is only returned when
 * the entry was really saved, because the page then tells the visitor that
 * their picks are in.
 */
export async function submitEntry(entry: WcEntry): Promise<SubmitOutcome> {
    const request: RegisterLeadRequest =
        entry.kind === 'prediction'
            ? {
                  type: LeadType.enum.WC_PREDICTION,
                  email: entry.email,
                  displayName: entry.displayName,
                  picks: entry.picks,
                  attribution: entry.attribution,
              }
            : {
                  type: LeadType.enum.WC_RESULTS,
                  email: entry.email,
                  attribution: entry.attribution,
              };

    try {
        await axiosService.post('/public/lead', request, { functionName: 'registerLead' });
        return 'stored';
    } catch (err) {
        // The lead service answers 409 once Game 1 has started.
        if (isAxiosError(err) && err.response?.status === 409) {
            return 'closed';
        }
        return ACCEPT_UNSTORED ? 'stored' : 'failed';
    }
}
