'use client';

import { RequestSnackbar } from '@/api/Request';
import CustomTaskEditor from '@/components/profile/trainingPlan/CustomTaskEditor';
import { Course, CourseType } from '@/database/course';
import { CustomTaskCategory, RequirementCategory, TaskMaterial } from '@/database/requirement';
import LoadingPage from '@/loading/LoadingPage';
import { Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CohortBlock } from './CohortBlock';
import { CohortSwitch } from './CohortSwitch';
import { useReaderOverview } from './useReaderOverview';
import { YoursBlock } from './YoursBlock';

/** The training plan category for a custom task created from a course. */
export function categoryForCourse(course: Course): CustomTaskCategory {
    switch (course.type) {
        case CourseType.Opening:
            return RequirementCategory.Opening;
        case CourseType.Endgame:
            return RequirementCategory.Endgame;
        default:
            return RequirementCategory.Middlegames;
    }
}

interface NewStudy {
    material?: TaskMaterial;
    name?: string;
    category: CustomTaskCategory;
}

export function ReaderPage() {
    const t = useTranslations('study.overview');
    const state = useReaderOverview();
    const [newStudy, setNewStudy] = useState<NewStudy>();

    if (state.status === 'loading') {
        return <LoadingPage />;
    }
    if (state.status === 'error') {
        return (
            <Container sx={{ py: 5 }}>
                <Typography color='error'>{t('loadFailed')}</Typography>
                <RequestSnackbar request={state.request} />
            </Container>
        );
    }
    const { model, user, viewCohort, setViewCohort } = state;

    return (
        <Container maxWidth='xl' sx={{ py: 4 }} data-testid='reader-page'>
            <Stack spacing={3}>
                <Stack spacing={2}>
                    <Stack direction='row' sx={{ justifyContent: 'flex-end' }}>
                        <CohortSwitch
                            cohorts={model.cohorts}
                            value={viewCohort}
                            own={user.dojoCohort}
                            onChange={setViewCohort}
                        />
                    </Stack>
                    <CohortBlock studies={model.cohortStudies} />
                </Stack>
                <Stack spacing={1}>
                    <YoursBlock
                        studies={model.studies}
                        courses={model.courses}
                        onNewStudy={() =>
                            setNewStudy({ category: RequirementCategory.Middlegames })
                        }
                        onAddToPlan={(course) =>
                            setNewStudy({
                                material: {
                                    kind: 'COURSE',
                                    courseType: course.type,
                                    courseId: course.id,
                                },
                                name: course.name,
                                category: categoryForCourse(course),
                            })
                        }
                    />
                </Stack>
            </Stack>

            {newStudy && (
                <CustomTaskEditor
                    open
                    onClose={() => setNewStudy(undefined)}
                    initialCategory={newStudy.category}
                    initialMaterial={newStudy.material}
                    initialName={newStudy.name}
                />
            )}
        </Container>
    );
}
