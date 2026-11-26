'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

/**
 * The starter plan preview only exists on a local dev server (`next dev`). Production
 * builds set NODE_ENV to production, so the live site never shows it.
 */
export const STARTER_PREVIEW_ENABLED = process.env.NODE_ENV === 'development';

/** The URL parameter that controls the preview: on, off or reset. */
export const STARTER_PREVIEW_PARAM = 'starterPlan';

export enum StarterPreviewMode {
    /** No preview: the starter plan follows the normal rules. */
    Off = 'off',
    /** Show the starter plan to the signed-in account, as if it had just joined. */
    On = 'on',
    /** Clear the account's starter progress, then preview as with On. */
    Reset = 'reset',
    /**
     * Show the "New to Dojo? Start here" button above the usual training plan, as an
     * inactive member would see it. Starting from it shows the real starter plan, with
     * the account's real progress.
     */
    Suggest = 'suggest',
}

/**
 * Returns the starter plan preview mode, for testing the starter plan with an
 * existing account on a local dev server.
 *
 * Visit /profile?starterPlan=on to turn it on, ?starterPlan=off to turn it off and
 * ?starterPlan=reset to clear the account's starter progress. On and off are
 * remembered in this browser until changed. ?starterPlan=suggest shows the "Start
 * here" button offered to inactive members.
 */
export function useStarterPlanPreview(): StarterPreviewMode {
    const param = useSearchParams().get(STARTER_PREVIEW_PARAM);
    const [stored, setStored] = useLocalStorage('starter-plan-preview', false);

    useEffect(() => {
        if (!STARTER_PREVIEW_ENABLED) {
            return;
        }
        if (param === StarterPreviewMode.On || param === StarterPreviewMode.Reset) {
            setStored(true);
        } else if (param === StarterPreviewMode.Off || param === StarterPreviewMode.Suggest) {
            setStored(false);
        }
    }, [param, setStored]);

    if (!STARTER_PREVIEW_ENABLED || param === StarterPreviewMode.Off) {
        return StarterPreviewMode.Off;
    }
    if (param === StarterPreviewMode.Reset || param === StarterPreviewMode.Suggest) {
        return param;
    }
    return param === StarterPreviewMode.On || stored
        ? StarterPreviewMode.On
        : StarterPreviewMode.Off;
}

/**
 * Returns a function that turns ?starterPlan=reset into ?starterPlan=on, for once the
 * previewed starter plan is finished: the reset preview always shows the starter plan
 * and clears it again on reload, which would hide what finishing leads to.
 */
export function useLeaveStarterReset(): () => void {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return () => {
        if (searchParams.get(STARTER_PREVIEW_PARAM) !== StarterPreviewMode.Reset) {
            return;
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set(STARTER_PREVIEW_PARAM, StarterPreviewMode.On);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };
}
