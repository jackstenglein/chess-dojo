'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth, useFreeTier } from '@/auth/Auth';
import { toDojoDateString } from '@/components/calendar/displayDate';
import { isCohortInRange } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { Exam, ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';
import { getRegression, predictExamRating } from '@jackstenglein/chess-dojo-common/src/exam/scores';
import { Check, Close, ExpandLess, ExpandMore, Help, Lock } from '@mui/icons-material';
import {
    Alert,
    ButtonBase,
    Collapse,
    Link,
    Snackbar,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid-pro';
import { useEffect, useMemo, useState } from 'react';

interface CohortRangeExams {
    name: string;
    exams: ExamInfo[];
}

interface ExamListProps {
    cohortRanges: string[];
    examType: ExamType;
}

interface ExamInfo {
    id: string;
    exam: Exam;
    averageScore: number;
    averageRating: number | undefined;
    userScore: number | undefined;
    userRating: number | undefined;
    dateTaken: string;
}

function getExamInfo(e: Exam, username?: string, timezoneOverride?: string): ExamInfo {
    const regression = getRegression(e);
    const scores = Object.values(e.answers).map((a) => a.score);
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const answer = e.answers[username || ''];

    let averageRating: number | undefined = undefined;
    let userRating: number | undefined = undefined;
    if (regression) {
        const sum = Object.values(e.answers)
            .map((a) => predictExamRating(regression, a.score))
            .reduce((sum, rating) => sum + rating, 0);
        averageRating = Math.round((10 * sum) / Object.values(e.answers).length) / 10;

        if (answer) {
            userRating = Math.round(10 * predictExamRating(regression, answer.score)) / 10;
        }
    }

    return {
        id: e.id,
        exam: e,
        averageScore: Math.round(10 * avg) / 10,
        averageRating,
        userScore: e.answers[username || '']?.score,
        userRating,
        dateTaken: answer ? toDojoDateString(new Date(answer.createdAt), timezoneOverride) : '',
    };
}

/**
 * Renders a set of exams in different cohort ranges. Each cohort range is
 * collapsible, and the user's current cohort range is expanded by default.
 * @param cohortRanges The cohort ranges that apply to this section
 * @param examType The type of exam shown in this section
 */
export const ExamList: React.FC<ExamListProps> = ({ cohortRanges, examType }) => {
    const api = useApi();
    const request = useRequest<ExamInfo[]>();
    const { user, status } = useAuth();
    const [expanded, setExpanded] = useState(
        cohortRanges.map((c) => isCohortInRange(user?.dojoCohort, c)),
    );

    useEffect(() => {
        if (status !== AuthStatus.Loading && !request.isSent()) {
            request.onStart();

            api.listExams(examType)
                .then((exams) => {
                    request.onSuccess(
                        exams.map((e) => getExamInfo(e, user?.username, user?.timezoneOverride)),
                    );
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, examType, user?.username, user?.timezoneOverride, status]);

    const ranges = useMemo(() => {
        const ranges: CohortRangeExams[] = [];
        if (request.data) {
            for (const range of cohortRanges) {
                const exams = request.data
                    .filter((c) => c.exam.cohortRange === range)
                    .sort((lhs, rhs) => {
                        if (
                            parseInt(lhs.exam.name.replace('Test #', '')) <
                            parseInt(rhs.exam.name.replace('Test #', ''))
                        ) {
                            return -1;
                        }
                        return 1;
                    });
                ranges.push({
                    name: range,
                    exams,
                });
            }
        }
        return ranges;
    }, [request, cohortRanges]);

    const onChangeExpanded = (i: number) => {
        setExpanded([...expanded.slice(0, i), !expanded[i], ...expanded.slice(i + 1)]);
    };

    return (
        <Stack spacing={2}>
            {!request.isSent() || request.isLoading() ? (
                <LoadingPage />
            ) : (
                <Stack spacing={3}>
                    {ranges.map((range, i) => (
                        <Stack key={range.name}>
                            <Stack spacing={1} direction='row' alignItems='center'>
                                <Tooltip
                                    title={expanded[i] ? 'Collapse Section' : 'Expand Section'}
                                >
                                    <ButtonBase onClick={() => onChangeExpanded(i)}>
                                        {expanded[i] ? <ExpandLess /> : <ExpandMore />}
                                        <Typography variant='h6'>{range.name}</Typography>
                                    </ButtonBase>
                                </Tooltip>
                            </Stack>

                            <Collapse in={expanded[i]} unmountOnExit>
                                <ExamsTable exams={range.exams} />
                            </Collapse>
                        </Stack>
                    ))}
                </Stack>
            )}

            <RequestSnackbar request={request} />
        </Stack>
    );
};

const columns: GridColDef<ExamInfo>[] = [
    {
        field: 'problems',
        headerName: '# of Problems',
        valueGetter: (_value, row) => row.exam.pgns.length,
        align: 'center',
        headerAlign: 'center',
        flex: 1,
    },
    {
        field: 'timeLimitSeconds',
        headerName: 'Time Limit',
        valueGetter: (_value, row) => row.exam.timeLimitSeconds,
        valueFormatter: (value: number) => `${value / 60} min`,
        headerAlign: 'center',
        align: 'center',
        flex: 1,
    },
    {
        field: 'takebacksDisabled',
        headerName: 'Takebacks',
        headerAlign: 'center',
        align: 'center',
        width: 88,
        valueGetter: (_value, row) => row.exam.takebacksDisabled,
        renderCell(params) {
            return (
                <Tooltip
                    title={
                        params.value
                            ? 'Takebacks are disabled for this exam. Once you make a move, it is locked in.'
                            : 'Takebacks are enabled for this exam. After making a move, you can promote another move instead.'
                    }
                >
                    {params.value ? (
                        <Close color='error' sx={{ height: 1 }} />
                    ) : (
                        <Check color='success' sx={{ height: 1 }} />
                    )}
                </Tooltip>
            );
        },
    },
    {
        field: 'avgScore',
        headerName: 'Avg Score',
        headerAlign: 'center',
        align: 'center',
        valueGetter: (_value, row) => row.averageScore,
        renderCell(params: GridRenderCellParams<ExamInfo, number>) {
            if (params.value === undefined || isNaN(params.value)) {
                return `- / ${params.row.exam.totalScore}`;
            }
            return `${params.value} / ${params.row.exam.totalScore}`;
        },
        flex: 1,
    },
    {
        field: 'yourScore',
        headerName: 'Your Score',
        align: 'center',
        headerAlign: 'center',
        valueGetter: (_value, row) => row.userScore,
        renderCell(params: GridRenderCellParams<ExamInfo, number | undefined>) {
            if (params.value === undefined) {
                return `- / ${params.row.exam.totalScore}`;
            }
            return `${params.value} / ${params.row.exam.totalScore}`;
        },
        flex: 1,
    },
    {
        field: 'avgRating',
        headerName: 'Avg Rating',
        headerAlign: 'center',
        align: 'center',
        valueGetter: (_value, row) => row.averageRating,
        renderCell(params: GridRenderCellParams<ExamInfo, number | undefined>) {
            if (params.value === undefined || isNaN(params.value)) {
                return (
                    <Tooltip title='Avg rating is not calculated until enough people have taken the exam.'>
                        <Help sx={{ color: 'text.secondary', height: 1 }} />
                    </Tooltip>
                );
            }
            return `${params.value}`;
        },
        flex: 1,
    },
    {
        field: 'yourRating',
        headerName: 'Your Rating',
        align: 'center',
        headerAlign: 'center',
        valueGetter: (_value, row) => row.userRating,
        renderCell(params: GridRenderCellParams<ExamInfo, number | undefined>) {
            if (params.value === undefined || isNaN(params.value)) {
                return (
                    <Tooltip title='Your rating is not calculated until enough people have taken the exam.'>
                        <Help sx={{ color: 'text.secondary', height: 1 }} />
                    </Tooltip>
                );
            }
            return `${params.value}`;
        },
    },
    {
        field: 'dateTaken',
        headerName: 'Date Taken',
        align: 'center',
        headerAlign: 'center',
        valueGetter: (_value, row) => row.dateTaken,
        flex: 1,
    },
];

const initialState = {
    pagination: {
        paginationModel: { pageSize: 10 },
    },
};

export const ExamsTable = ({ exams }: { exams: ExamInfo[] }) => {
    const user = useAuth().user;
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [upsellOpen, setUpsellOpen] = useState(false);
    const isFreeTier = useFreeTier();
    const router = useRouter();

    const examColumns = useMemo(() => {
        const examColumns: GridColDef<ExamInfo>[] = [
            {
                field: 'name',
                headerName: 'Name',
                valueGetter: (_value, row) => row.exam.name,
                renderCell(params: GridRenderCellParams<ExamInfo, string>) {
                    const hasAnswered = Boolean(params.row.exam.answers[user?.username || '']);

                    const i = exams.findIndex((e) => e.id === params.row.id);
                    if (
                        !hasAnswered &&
                        i >= 1 &&
                        !exams[i - 1].exam.answers[user?.username || '']
                    ) {
                        return (
                            <Tooltip title='This exam is locked until you complete the previous exam'>
                                <Stack direction='row' spacing={0.5} alignItems='center'>
                                    <Link color='text.disabled'>{params.value}</Link>
                                    <Lock fontSize='small' />
                                </Stack>
                            </Tooltip>
                        );
                    }
                    return <Link sx={{ cursor: 'pointer' }}>{params.value}</Link>;
                },
                flex: 1,
            },
            ...columns,
        ];
        return examColumns;
    }, [user, exams]);

    const onClickRow = (params: GridRowParams<ExamInfo>) => {
        if (params.row.exam.answers[user?.username || '']) {
            router.push(`/tests/${params.row.exam.type}/${params.row.id}/exam`);
            return;
        }

        const i = exams.findIndex((e) => e.id === params.row.id);
        if (!user?.isAdmin && i >= 1 && !exams[i - 1].exam.answers[user?.username || '']) {
            setSnackbarOpen(true);
        } else if (i >= 1 && isFreeTier) {
            setUpsellOpen(true);
        } else {
            router.push(`/tests/${params.row.exam.type}/${params.row.id}`);
        }
    };

    const handleClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }

        setSnackbarOpen(false);
    };

    return (
        <>
            <DataGridPro
                autoHeight
                columns={examColumns}
                rows={exams}
                hideFooter
                onRowClick={onClickRow}
                disableRowSelectionOnClick
                disableColumnMenu
                disableColumnSelector
                initialState={initialState}
            />
            <Snackbar
                open={snackbarOpen}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity='error' variant='filled' onClose={handleClose}>
                    This exam is locked until you complete the previous exam.
                </Alert>
            </Snackbar>
            <UpsellDialog
                open={upsellOpen}
                onClose={() => setUpsellOpen(false)}
                currentAction={RestrictedAction.TacticsExams}
            />
        </>
    );
};
