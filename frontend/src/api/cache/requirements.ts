import { TimelineSpecialRequirementId } from '@/database/timeline';
import { useEffect, useMemo } from 'react';
import { Requirement, ScoreboardDisplay, compareRequirements } from '../../database/requirement';
import { ALL_COHORTS, dojoCohorts } from '../../database/user';
import { useApi } from '../Api';
import { Request, useRequest } from '../Request';
import { useCache } from './Cache';

interface UseRequirementsResponse {
    requirements: Requirement[];
    request: Request<never>;
}

export function useRequirements(cohort: string, scoreboardOnly: boolean): UseRequirementsResponse {
    const api = useApi();
    const cache = useCache();
    const request = useRequest<never>();

    const requirements = useMemo(() => {
        return cache.requirements
            .filter((r) => {
                if (
                    scoreboardOnly &&
                    (r.scoreboardDisplay === ScoreboardDisplay.Hidden ||
                        r.scoreboardDisplay === ScoreboardDisplay.NonDojo)
                ) {
                    return false;
                }
                if (cohort === ALL_COHORTS) {
                    return true;
                }
                return r.counts[cohort] !== undefined;
            })
            .sort(compareRequirements);
    }, [cache.requirements, cohort, scoreboardOnly]);

    useEffect(() => {
        if (
            (cohort === ALL_COHORTS || dojoCohorts.includes(cohort)) &&
            !cache.requirements.isFetched(ALL_COHORTS) &&
            !cache.requirements.isFetched(cohort) &&
            !request.isSent()
        ) {
            request.onStart();
            cache.requirements.markFetched(cohort);
            api.listRequirements(cohort, false)
                .then((requirements) => {
                    cache.requirements.putMany(requirements);
                    request.onSuccess();
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [requirements, api, request, cache.requirements, cohort]);

    const reset = request.reset;
    useEffect(() => {
        if (!cache.requirements.isFetched(cohort)) {
            reset();
        }
    }, [cohort, cache.requirements, reset]);

    return { requirements, request };
}

interface UseRequirementResponse {
    requirement?: Requirement;
    request: Request<never>;
}

export function useRequirement(id?: string): UseRequirementResponse {
    const api = useApi();
    const cache = useCache();
    const request = useRequest<never>();

    const requirement = useMemo(() => {
        if (id) {
            return cache.requirements.get(id);
        }
        return undefined;
    }, [cache.requirements, id]);

    useEffect(() => {
        if (
            requirement === undefined &&
            id &&
            !Object.keys(TimelineSpecialRequirementId).includes(id) &&
            !request.isSent()
        ) {
            request.onStart();
            api.getRequirement(id)
                .then((response) => {
                    cache.requirements.put(response.data);
                    request.onSuccess();
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [requirement, request, api, cache.requirements, id]);

    return { requirement, request };
}
