import Contents from '@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/Contents';
import { getAdjacentModule } from '@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/courseUtils';
import Module from '@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/Module';
import { Course, CourseModule } from '@/database/course';
import { Box, Button, Divider, Grid, Stack, Typography } from '@mui/material';
import { useState } from 'react';

export function CourseContentPreview({ course }: { course: Course }) {
    const [chapterIndex, setChapterIndex] = useState(0);
    const [moduleIndex, setModuleIndex] = useState(0);

    const chapters = course.chapters;
    const selection = resolveModule(chapters, chapterIndex, moduleIndex);

    const selectModule = (nextChapter: number, nextModule: number) => {
        setChapterIndex(nextChapter);
        setModuleIndex(nextModule);
    };

    if (!selection) {
        return (
            <Typography sx={{ color: 'text.secondary', py: 4 }}>
                Add chapters and modules in the Content tab to preview them here.
            </Typography>
        );
    }

    const prevModule = getAdjacentModule(
        selection.chapterIndex,
        selection.moduleIndex,
        chapters,
        -1,
    );
    const nextModule = getAdjacentModule(
        selection.chapterIndex,
        selection.moduleIndex,
        chapters,
        1,
    );

    const {
        module: courseModule,
        chapterIndex: safeChapterIndex,
        moduleIndex: safeModuleIndex,
    } = selection;

    return (
        <Grid container sx={{ rowGap: 2 }}>
            <Grid size={{ xs: 12, md: 9.5 }}>
                <Stack>
                    <Typography variant='h4'>{course.name || 'Untitled course'}</Typography>
                    {course.cohortRange && (
                        <Typography variant='h5' sx={{ color: 'text.secondary' }}>
                            {course.cohortRange}
                        </Typography>
                    )}
                    <Divider />
                    <Box sx={{ mt: 2 }}>
                        <Module
                            key={`${safeChapterIndex}-${safeModuleIndex}-${courseModule.id}`}
                            module={courseModule}
                            preview
                        />
                    </Box>
                </Stack>

                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'space-between',
                        mt: 4,
                        px: { xs: 0, md: 4 },
                    }}
                >
                    {prevModule ? (
                        <Button
                            variant='contained'
                            onClick={() =>
                                selectModule(prevModule.chapterIndex, prevModule.moduleIndex)
                            }
                        >
                            Previous: {prevModule.name || 'Untitled module'}
                        </Button>
                    ) : (
                        <span />
                    )}
                    {nextModule && (
                        <Button
                            variant='contained'
                            onClick={() =>
                                selectModule(nextModule.chapterIndex, nextModule.moduleIndex)
                            }
                        >
                            Next: {nextModule.name || 'Untitled module'}
                        </Button>
                    )}
                </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 2.5 }}>
                <Contents
                    course={course}
                    selectedChapter={safeChapterIndex}
                    selectedModule={safeModuleIndex}
                    onSelect={selectModule}
                />
            </Grid>
        </Grid>
    );
}

/**
 * Resolves a module by chapter and module index. If the module is not found,
 * the nearest module is returned.
 * @param chapters The chapters of the course.
 * @param chapterIndex The index of the chapter to select.
 * @param moduleIndex The index of the module to select.
 * @returns The selected chapter and module.
 */
export function resolveModule(
    chapters: Course['chapters'],
    chapterIndex: number,
    moduleIndex: number,
): { chapterIndex: number; moduleIndex: number; module: CourseModule } | undefined {
    if (!chapters) {
        return undefined;
    }

    const chapter = chapters[chapterIndex];
    const selected = chapter?.modules[moduleIndex];
    if (selected) {
        return { chapterIndex, moduleIndex, module: selected };
    }

    const clampedChapter = Math.min(chapterIndex, Math.max(0, chapters.length - 1));
    const clampedModules = chapters[clampedChapter]?.modules ?? [];
    if (clampedModules.length > 0) {
        const clampedModule = Math.min(moduleIndex, clampedModules.length - 1);
        return {
            chapterIndex: clampedChapter,
            moduleIndex: clampedModule,
            module: clampedModules[clampedModule],
        };
    }

    for (let i = 0; i < chapters.length; i++) {
        const first = chapters[i].modules[0];
        if (first) {
            return { chapterIndex: i, moduleIndex: 0, module: first };
        }
    }

    return undefined;
}
