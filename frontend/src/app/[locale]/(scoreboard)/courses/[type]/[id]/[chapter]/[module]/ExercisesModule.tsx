import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import PuzzleBoard from '@/board/puzzle/PuzzleBoard';
import { Coach, CourseModule, coachUrls } from '@/database/course';
import { User } from '@/database/user';
import PgnErrorBoundary from '@/games/view/PgnErrorBoundary';
import { Box, Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { ModuleProps } from './Module';
import PgnSelector from './PgnSelector';

function getCompleted(user: User | undefined, module: CourseModule): boolean[] {
    let exercises: boolean[] = [];

    const userExercises = user?.openingProgress?.[module.id]?.exercises;
    if (userExercises !== undefined) {
        exercises = userExercises;
    }

    return (module.pgns ?? []).map((_: string, idx: number) => {
        if (exercises[idx]) {
            return true;
        }
        return false;
    });
}

const ExercisesModule = ({ module, preview }: ModuleProps) => {
    const t = useTranslations('courses.exercises');
    const { user } = useAuth();
    const [completed, setCompleted] = useState(getCompleted(user, module));
    const [selectedIndex, setSelectedIndex] = useState(0);
    const request = useRequest();
    const api = useApi();

    const onComplete = useCallback(() => {
        const newCompleted = [
            ...completed.slice(0, selectedIndex),
            true,
            ...completed.slice(selectedIndex + 1),
        ];
        setCompleted(newCompleted);

        if (!preview && module.id && user) {
            request.onStart();
            api.updateUser({
                openingProgress: {
                    ...user.openingProgress,
                    [module.id]: {
                        exercises: newCompleted,
                    },
                },
            })
                .then(() => {
                    request.onSuccess();
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [api, completed, module.id, preview, request, selectedIndex, user]);

    if (!module.pgns || module.pgns.length < 1) {
        return null;
    }

    const onNextPuzzle = () => {
        onComplete();
        setSelectedIndex(selectedIndex + 1);
    };

    return (
        <Container
            maxWidth={false}
            sx={{
                pt: 4,
                pb: 4,
                px: '0 !important',
                '--gap': '16px',
                '--site-header-margin': '150px',
                '--player-header-height': '0px',
                '--toc-width': '21vw',
                '--underboard-width': '400px',
                '--coach-width': '400px',
                '--tools-height': '0px',
                '--board-width': 'calc(100vw - var(--coach-width) - 60px - var(--toc-width))',
                '--board-height':
                    'calc(100vh - var(--navbar-height) - var(--site-header-margin) - var(--tools-height) - 2 * var(--player-header-height))',
                '--board-size': 'calc(min(var(--board-width), var(--board-height)))',
            }}
        >
            <Box
                sx={{
                    display: 'grid',
                    rowGap: '0px',
                    gridTemplateRows: {
                        xs: 'auto auto',
                    },
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'var(--board-size) var(--gap) var(--coach-width) auto',
                    },
                    gridTemplateAreas: {
                        xs: '"extras" "subtitle" "pgn"',
                        md: '"extras . . ." "subtitle . . ." "pgn pgn pgn pgn"',
                    },
                }}
            >
                <PgnSelector
                    pgns={module.pgns}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    completed={completed}
                />

                <Stack
                    sx={{
                        mt: 3,
                        gridArea: 'subtitle',
                    }}
                >
                    <Typography
                        variant='subtitle2'
                        sx={{
                            fontWeight: 'bold',
                            color: 'text.secondary',
                        }}
                    >
                        {t('exerciseNumber', { index: selectedIndex + 1 })}
                    </Typography>
                </Stack>

                <PgnErrorBoundary pgn={module.pgns[selectedIndex]}>
                    <PuzzleBoard
                        key={module.pgns[selectedIndex]}
                        pgn={module.pgns[selectedIndex]}
                        coachUrl={coachUrls[module.coach as Coach]}
                        onComplete={onComplete}
                        onNextPuzzle={
                            selectedIndex < module.pgns.length - 1 ? onNextPuzzle : undefined
                        }
                    />
                </PgnErrorBoundary>
            </Box>
        </Container>
    );
};

export default ExercisesModule;
