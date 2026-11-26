import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { CustomTask, getCurrentCount, getTotalCount, Requirement } from '@/database/requirement';

/**
 * Returns a function that marks the given task complete for the signed-in user in
 * one step, without logging time, along with the request's state. Used for tasks
 * that are simply done or not, like the Welcome to the Dojo tasks.
 * @param task The task to mark complete.
 */
export function useMarkComplete(task: Requirement | CustomTask) {
    const api = useApi();
    const { user } = useAuth();
    const { onNewEntry } = useTimelineContext();
    const request = useRequest();

    const markComplete = async () => {
        if (!user || request.isLoading()) {
            return false;
        }
        const cohort = user.dojoCohort;
        request.onStart();
        try {
            const resp = await api.updateUserProgress({
                cohort,
                requirementId: task.id,
                previousCount: getCurrentCount({
                    cohort,
                    requirement: task,
                    progress: user.progress[task.id],
                }),
                newCount: getTotalCount(cohort, task, true),
                incrementalMinutesSpent: 0,
                date: null,
                notes: '',
            });
            onNewEntry(resp.data.timelineEntry);
            request.onSuccess();
            return true;
        } catch (err) {
            request.onFailure(err);
            return false;
        }
    };

    return { markComplete, request };
}
