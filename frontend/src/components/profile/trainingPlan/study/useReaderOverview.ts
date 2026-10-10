import { useApi } from '@/api/Api';
import { useCache } from '@/api/cache/Cache';
import { useRequirements } from '@/api/cache/requirements';
import { Request, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Course } from '@/database/course';
import { hasMaterial } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { ALL_COHORTS, User } from '@/database/user';
import { useEffect, useMemo, useRef, useState } from 'react';
import { concatBooks, courseBook, itemsOf, StudyBook } from './book';
import { loadCourse } from './courseCache';
import { buildOverview, OverviewModel } from './overview';
import { isWorkbook, taskCohort } from './selectors';

/** Maximum timeline pages to search for each set's latest study entry. */
const TIMELINE_PAGE_CAP = 20;

export type ReaderOverviewState =
    | { status: 'loading' }
    | { status: 'error'; request: Request<never> }
    | {
          status: 'ready';
          user: User;
          model: OverviewModel;
          /** The displayed cohort. Defaults to the member's cohort on each visit. */
          viewCohort: string;
          setViewCohort: (cohort: string) => void;
      };

/** Loads the overview data, updates the model, and prefetches books for the study page. */
export function useReaderOverview(): ReaderOverviewState {
    const api = useApi();
    const cache = useCache();
    const { user, status: authStatus } = useAuth();
    const { requirements, request: requirementsRequest } = useRequirements(ALL_COHORTS, false);
    const request = useRequest<never>();
    const [courses, setCourses] = useState<Course[]>();
    const [entries, setEntries] = useState<TimelineEntry[]>();
    const [chosenCohort, setViewCohort] = useState<string>();
    // Associate prefetched books with the request key to exclude results for previous inputs.
    const [walked, setWalked] = useState<{ key: string; books: Map<string, StudyBook> }>();
    const username = user?.username;
    const viewCohort = chosenCohort ?? user?.dojoCohort ?? '';
    // Read the API through a ref so user updates do not restart these requests.
    const apiRef = useRef(api);
    apiRef.current = api;

    const allLoaded = cache.requirements.isFetched(ALL_COHORTS) && !requirementsRequest.isLoading();
    // Sets use their latest study entry to choose the next item. Workbooks use the count.
    // Compare task IDs by value so refetching the requirements does not reload the timeline.
    const studyTaskIds = JSON.stringify(
        allLoaded && user
            ? requirements
                  .filter(
                      (task) =>
                          hasMaterial(task) &&
                          !isWorkbook(task) &&
                          taskCohort(task, user) === user.dojoCohort,
                  )
                  .map((task) => task.id)
            : null,
    );

    const { onFailure } = request;
    useEffect(() => {
        if (!username) return;
        let cancelled = false;
        apiRef.current
            .listAllCourses()
            .then((list) => {
                if (!cancelled) setCourses(list);
            })
            .catch((err: unknown) => {
                if (!cancelled) onFailure(err);
            });
        return () => {
            cancelled = true;
        };
    }, [username, onFailure]);

    // Render after the first timeline page. Load older pages until each set has a study entry,
    // the timeline ends, or the page limit is reached.
    useEffect(() => {
        const taskIds = JSON.parse(studyTaskIds) as string[] | null;
        if (!username || !taskIds) return;
        let cancelled = false;
        const load = async () => {
            const missing = new Set(taskIds);
            const loaded: TimelineEntry[] = [];
            let startKey: string | undefined;
            let pages = 0;
            do {
                const resp = await apiRef.current.listUserTimeline(username, startKey);
                if (cancelled) return;
                loaded.push(...resp.entries);
                setEntries([...loaded]);
                for (const entry of resp.entries) {
                    if (entry.studyInfo) missing.delete(entry.requirementId);
                }
                startKey = resp.lastEvaluatedKey || undefined;
                pages += 1;
            } while (startKey && missing.size > 0 && pages < TIMELINE_PAGE_CAP);
        };
        load().catch((err: unknown) => {
            if (!cancelled) onFailure(err);
        });
        return () => {
            cancelled = true;
        };
    }, [username, studyTaskIds, onFailure]);

    const base = useMemo(
        () =>
            user && courses && entries && allLoaded
                ? buildOverview({ user, requirements, courses, entries, viewCohort })
                : undefined,
        [user, requirements, courses, entries, allLoaded, viewCohort],
    );

    // Load every part of a set to find the next item's name. For workbooks, prefetch through
    // the next item. Compare inputs by value so unrelated user updates do not repeat requests.
    const walkKey = JSON.stringify(
        (base?.cohortStudies ?? []).map((study) => ({
            id: study.task.id,
            material: study.task.material,
            need: isWorkbook(study.task) ? study.done + 1 : Infinity,
        })),
    );
    useEffect(() => {
        const studies = JSON.parse(walkKey) as {
            id: string;
            material: NonNullable<OverviewModel['cohortStudies'][number]['task']['material']>;
            need: number | null;
        }[];
        let cancelled = false;
        const walk = async () => {
            for (const study of studies) {
                const parts: StudyBook[] = [];
                for (const material of study.material) {
                    if (material.kind !== 'COURSE') continue;
                    const data = await loadCourse(
                        apiRef.current,
                        material.courseType,
                        material.courseId,
                    );
                    if (cancelled) return;
                    if (data.isBlocked || !data.course) break;
                    parts.push(courseBook(data.course));
                    const book = concatBooks(data.course.name, parts);
                    setWalked((prev) => ({
                        key: walkKey,
                        books: new Map(prev?.key === walkKey ? prev.books : []).set(study.id, book),
                    }));
                    // JSON turned Infinity into null. That marks a set, which reads every part.
                    if (study.need !== null && itemsOf(book).length >= study.need) break;
                }
            }
        };
        walk().catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [walkKey]);

    const books = walked?.key === walkKey ? walked.books : undefined;
    const model = useMemo(
        () =>
            user && courses && entries && base
                ? buildOverview({ user, requirements, courses, entries, viewCohort, books })
                : undefined,
        [user, requirements, courses, entries, base, viewCohort, books],
    );

    if (request.isFailure()) return { status: 'error', request };
    if (requirementsRequest.isFailure()) return { status: 'error', request: requirementsRequest };
    if (authStatus === AuthStatus.Loading || !user) return { status: 'loading' };
    if (!model) return { status: 'loading' };
    return { status: 'ready', user, model, viewCohort, setViewCohort };
}
