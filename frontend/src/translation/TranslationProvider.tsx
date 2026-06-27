'use client';

import { useRequest } from '@/api/Request';
import { listTranslations, Translation } from '@/api/translationApi';
import { logger } from '@/logging/logger';
import { TranslationContentTypes } from '@jackstenglein/chess-dojo-common/src/translation/api';
import { Alert, Snackbar } from '@mui/material';
import { useLocale } from 'next-intl';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TranslationContext, TranslationContextValue } from './TranslationContext';

const EMPTY_MAP: ReadonlyMap<string, Translation> = new Map();

const NO_OVERLAY_LOCALES: readonly string[] = ['en'];

/**
 * Provides a per-locale overlay of DB-sourced translations (requirement
 * and course fields). Locales in NO_OVERLAY_LOCALES skip the fetch; a
 * generation counter guards stale responses across locale changes.
 * Partial failures surface via a dismissible Snackbar and a `fetchFailed`
 * flag on the context.
 */
export function TranslationProvider({ children }: { children: ReactNode }) {
    const locale = useLocale();
    const request = useRequest<ReadonlyMap<string, Translation>>();
    const [translations, setTranslations] = useState<ReadonlyMap<string, Translation>>(EMPTY_MAP);
    const [fetchFailed, setFetchFailed] = useState(false);
    const [alertDismissed, setAlertDismissed] = useState(false);
    const generationRef = useRef(0);

    useEffect(() => {
        if (NO_OVERLAY_LOCALES.includes(locale)) {
            // Bump the generation so any in-flight response from a prior
            // non-source locale becomes stale and does not overwrite the
            // no-overlay state when it resolves.
            ++generationRef.current;
            setTranslations(EMPTY_MAP);
            setFetchFailed(false);
            setAlertDismissed(false);
            request.reset();
            return;
        }

        const gen = ++generationRef.current;
        request.onStart();
        // Reset failure state at the start of each fetch so a dismissed alert
        // from a prior failed locale does not flash back on locale change.
        setFetchFailed(false);
        setAlertDismissed(false);

        void Promise.allSettled([
            listTranslations(locale, TranslationContentTypes.REQUIREMENT),
            listTranslations(locale, TranslationContentTypes.COURSE),
        ])
            .then((results) => {
                if (gen !== generationRef.current) {
                    logger.debug(
                        'Ignoring stale translation response for locale',
                        locale,
                        'gen:',
                        gen,
                    );
                    return;
                }

                const [reqResult, courseResult] = results;
                const next = new Map<string, Translation>();
                let anyFailed = false;
                let allFailed = true;

                if (reqResult.status === 'fulfilled') {
                    for (const t of reqResult.value) next.set(t.contentKey, t);
                    allFailed = false;
                } else {
                    anyFailed = true;
                    logger.error(
                        'Requirement translation fetch failed for locale',
                        locale,
                        reqResult.reason,
                    );
                }

                if (courseResult.status === 'fulfilled') {
                    for (const t of courseResult.value) next.set(t.contentKey, t);
                    allFailed = false;
                } else {
                    anyFailed = true;
                    logger.error(
                        'Course translation fetch failed for locale',
                        locale,
                        courseResult.reason,
                    );
                }

                setTranslations(next);
                setFetchFailed(anyFailed);

                if (allFailed) {
                    const reason: unknown =
                        reqResult.status === 'rejected'
                            ? reqResult.reason
                            : courseResult.status === 'rejected'
                              ? courseResult.reason
                              : undefined;
                    request.onFailure(reason);
                } else {
                    request.onSuccess(next);
                }
            })
            .catch((err: unknown) => {
                // Safety net: Promise.allSettled never rejects, but the .then
                // body could throw (unexpected shape, setState during unmount,
                // etc). Surface it as a failure rather than an unhandled rejection.
                if (gen !== generationRef.current) return;
                logger.error('Unexpected translation processing error', locale, err);
                setFetchFailed(true);
                request.onFailure(err);
            });
        // request reference changes on every status transition (useRequest's
        // useMemo re-memoizes on status/data/error), so including it in deps
        // would retrigger the effect on every fetch state change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    const value = useMemo<TranslationContextValue>(
        () => ({ translations, locale, fetchFailed }),
        [translations, locale, fetchFailed],
    );

    const dismissAlert = useCallback(() => setAlertDismissed(true), []);

    return (
        <TranslationContext.Provider value={value}>
            <Snackbar
                data-testid='translation-failed-alert'
                open={fetchFailed && !alertDismissed}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                onClose={dismissAlert}
            >
                <Alert severity='warning' variant='filled' onClose={dismissAlert}>
                    Failed to load translations. Showing English.
                </Alert>
            </Snackbar>
            {children}
        </TranslationContext.Provider>
    );
}
