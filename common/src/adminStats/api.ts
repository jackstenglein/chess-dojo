/** Accounts that signed up in one calendar month (UTC), grouped by what they are now. */
export interface AdminStatsMonth {
    /** The signup month, as YYYY-MM. */
    month: string;
    /** Accounts created in the month. */
    signups: number;
    /** Of those, accounts that have never had a paid subscription. */
    free: number;
    /** Of those, accounts with an active paid subscription. */
    paying: number;
    /** Of those, accounts whose paid subscription was canceled. */
    churned: number;
    /** Of those, accounts with complimentary access granted by an admin. */
    complimentary: number;
    /** Of those, accounts that picked a cohort. */
    onboarded: number;
    /** Of those, accounts active in the last 30 days. */
    active30: number;
}

/** Current account counts. */
export interface AdminStatsTotals {
    accounts: number;
    free: number;
    paying: number;
    churned: number;
    complimentary: number;
    /** Accounts that never picked a cohort. */
    notOnboarded: number;
    /** Accounts active in the last day, 7 days and 30 days. */
    active1: number;
    active7: number;
    active30: number;
    /** Free accounts active in the last 30 days. */
    freeActive30: number;
    /** Accounts that ever paid (subscribed now or canceled since), active in the last 30 days. */
    paidActive30: number;
    /** Complimentary accounts active in the last 30 days. */
    complimentaryActive30: number;
}

/** Counts for one cohort. */
export interface AdminStatsCohort {
    cohort: string;
    free: number;
    /** Accounts that ever paid: subscribed now or canceled since. */
    paid: number;
    active30: number;
}

/** How free members use the Dojo Starter Plan and custom plans. */
export interface AdminStatsFreePlan {
    /** Free accounts that picked a cohort. */
    freeOnboarded: number;
    /** Free accounts that finished the Dojo Starter Plan. */
    starterFinished: number;
    /** Free accounts with a custom plan. */
    customPlan: number;
}

/** The totals as they were on one day, saved nightly so trends build up over time. */
export interface AdminStatsSnapshot {
    /** The day, as YYYY-MM-DD. */
    date: string;
    accounts: number;
    free: number;
    /** Accounts subscribed that day. */
    paying: number;
    /** Accounts that had ever paid by that day. */
    paid: number;
    active7: number;
    active30: number;
}

/** The response of GET /admin/statistics. */
export interface GetAdminStatsResponse {
    /** When the numbers were computed, in ISO 8601. */
    generatedAt: string;
    totals: AdminStatsTotals;
    /** Signup months, oldest first. */
    months: AdminStatsMonth[];
    cohorts: AdminStatsCohort[];
    freePlan: AdminStatsFreePlan;
    /** Nightly snapshots, oldest first. */
    history: AdminStatsSnapshot[];
}
