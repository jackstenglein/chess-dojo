import axios from 'axios';
import { axiosService } from '../axiosService';

/**
 * Local-dev escape hatch: set NEXT_PUBLIC_OTB_BASE_URL=http://localhost:5002
 * to talk to backend/otbService/local_shim.py instead of the deployed
 * service (which also skips the JWT, so no login is needed for OTB calls).
 */
const OTB_BASE_URL = process.env.NEXT_PUBLIC_OTB_BASE_URL || '';
const otbHttp = OTB_BASE_URL ? axios.create({ baseURL: OTB_BASE_URL }) : axiosService;

/**
 * Client for the OTB (FIDE + US Chess) history service (backend/otbService).
 * Scrapes are async: POST starts a job, GET polls it, and the finished
 * payload is fetched from a presigned S3 URL. The service is NOT YET
 * DEPLOYED — all callers must handle connection failures gracefully.
 */

export type OtbJobStatus = 'starting' | 'scraping' | 'done' | 'error';

export interface OtbJob {
    status: OtbJobStatus;
    done: number;
    total: number;
    label: string;
    error?: string;
    /** Presigned S3 GET for the finished payload; present only when done. */
    url?: string;
}

/** Minimal shape of the service payload needed by the results tab. */
export interface OtbRound {
    opp: string;
    color: string;
    title?: string;
    rating?: number | null;
    fed?: string;
    score: number;
    games: number;
    chg?: number;
    round?: number | null;
    state?: string;
    opp_id?: string;
    system?: string;
}

export interface OtbTournament {
    name: string;
    report_url?: string;
    start: string;
    end: string;
    rating_type?: string;
    systems?: string[];
    system_label?: string;
    section?: string;
    games: number;
    score: number;
    rating_change?: number;
    combined_change?: number;
    rounds: OtbRound[];
    /** True when this USCF section duplicates a FIDE tournament. */
    fide_matched?: boolean;
    /** USCF-only games (not shared with FIDE); empty = fully shared. */
    uscf_only?: OtbRound[];
}

export interface OtbPayload {
    fide_id: string;
    info: { name: string };
    tournaments: OtbTournament[];
    uschess?: {
        uscf_id: string;
        tournaments: OtbTournament[];
    } | null;
    uschess_error?: string | null;
}

export function startOtbJob(fideId: string) {
    return otbHttp.post<{ jobId: string; cached: boolean }>(`/otb/jobs`, {
        fideId,
        functionName: 'startOtbJob',
    });
}

export function getOtbJob(jobId: string) {
    return otbHttp.get<OtbJob>(`/otb/jobs/${jobId}`, {
        functionName: 'getOtbJob',
    });
}

async function fetchJson<T>(url: string): Promise<T> {
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`OTB payload fetch failed: ${resp.status}`);
    }
    return (await resp.json()) as T;
}

/** Starts a job and polls until done, then returns the payload. */
export async function pollOtbPayload(
    fideId: string,
    onProgress?: (job: OtbJob) => void,
    signal?: AbortSignal,
): Promise<OtbPayload> {
    const {
        data: { jobId },
    } = await startOtbJob(fideId);
    for (;;) {
        if (signal?.aborted) {
            throw new Error('OTB fetch aborted');
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const { data: job } = await getOtbJob(jobId);
        onProgress?.(job);
        if (job.status === 'done') {
            if (!job.url) {
                throw new Error('OTB job finished without a result URL');
            }
            return await fetchJson<OtbPayload>(job.url);
        }
        if (job.status === 'error') {
            throw new Error(job.error || 'OTB scrape failed');
        }
    }
}
