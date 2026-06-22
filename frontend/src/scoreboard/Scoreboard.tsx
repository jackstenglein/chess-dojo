import { Link } from '@/components/navigation/Link';
import HelpIcon from '@mui/icons-material/Help';
import PushPinIcon from '@mui/icons-material/PushPin';
import { Stack, Tooltip } from '@mui/material';
import {
    DataGridPro,
    DataGridProProps,
    GridActionsCellItem,
    GridColDef,
    GridColumnGroupingModel,
    GridColumnVisibilityModel,
    GridProSlotsComponent,
    GridRenderCellParams,
    GridRowId,
    GridRowModel,
} from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useFreeTier } from '../auth/Auth';
import { isGraduation } from '../database/graduation';
import { Requirement, ScoreboardDisplay, formatTime } from '../database/requirement';
import { User, compareCohorts } from '../database/user';
import Avatar from '../profile/Avatar';
import CohortIcon from './CohortIcon';
import ScoreboardProgress from './ScoreboardProgress';
import {
    ScoreboardRow,
    formatPercentComplete,
    getCohortScore,
    getColumnDefinition,
    getCurrentRating,
    getMinutesSpent,
    getNormalizedRatingRow,
    getPercentComplete,
    getRatingChange,
    getRatingSystem,
    getStartRating,
} from './scoreboardData';

type ScoreboardT = ReturnType<typeof useTranslations<'scoreboard'>>;
type RatingT = ReturnType<typeof useTranslations<'enums.ratingSystem'>>;

interface ColumnGroupChild {
    field: string;
}

interface ColumnGroup {
    groupId: string;
    children: ColumnGroupChild[];
}

function getUserInfoColumnGroup(t: ScoreboardT) {
    return {
        groupId: t('groupUserInfo'),
        children: [
            { field: 'actions' },
            { field: 'rank' },
            { field: 'displayName' },
            { field: 'dojoCohort' },
            { field: 'previousCohort' },
        ],
    };
}

function getRankColumn(t: ScoreboardT): GridColDef<ScoreboardRow> {
    return {
        field: 'rank',
        headerName: t('rankColumn'),
        renderHeader: () => '',
        valueGetter: (_value, row, _column, api) =>
            api.current.getSortedRowIds().indexOf(row.username.replace('#pinned', '')) + 1,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        width: 50,
    };
}

function getDisplayNameColumn(t: ScoreboardT): GridColDef<ScoreboardRow> {
    return {
        field: 'displayName',
        headerName: t('nameColumn'),
        minWidth: 250,
        renderCell: (params: GridRenderCellParams<ScoreboardRow, string>) => {
            return (
                <Stack direction='row' spacing={1} alignItems='center'>
                    <Avatar
                        username={params.row.username.replace('#pinned', '')}
                        displayName={params.value}
                        size={32}
                    />
                    <Link href={`/profile/${params.row.username.replace('#pinned', '')}`}>
                        {params.value}
                    </Link>
                </Stack>
            );
        },
    };
}

function getCohortColumn(t: ScoreboardT): GridColDef<ScoreboardRow> {
    return {
        field: 'dojoCohort',
        headerName: t('cohortColumn'),
        align: 'center',
        headerAlign: 'center',
        valueGetter(_value, row) {
            if (isGraduation(row)) {
                return '';
            }
            return parseInt(row.dojoCohort);
        },
        renderCell(params) {
            if (isGraduation(params.row)) {
                return '';
            }
            return params.row.dojoCohort;
        },
    };
}

function getGraduatedColumn(t: ScoreboardT): GridColDef<ScoreboardRow> {
    return {
        field: 'previousCohort',
        headerName: t('graduatedColumn'),
        valueGetter: (_value, row) => {
            if (row.graduationCohorts && row.graduationCohorts.length > 0) {
                return row.graduationCohorts;
            }
            return row.previousCohort;
        },
        renderCell: (params: GridRenderCellParams<ScoreboardRow>) => {
            let graduationCohorts = params.row.graduationCohorts;
            if (graduationCohorts && graduationCohorts.length > 0) {
                graduationCohorts = graduationCohorts
                    .sort(compareCohorts)
                    .filter((c, i) => graduationCohorts?.indexOf(c) === i);
                if (graduationCohorts.length > 3) {
                    graduationCohorts = graduationCohorts.slice(graduationCohorts.length - 3);
                }

                return (
                    <Stack direction='row' alignItems='center' height={1}>
                        {graduationCohorts.map((c) => (
                            <CohortIcon key={c} cohort={c} size={32} />
                        ))}
                    </Stack>
                );
            }
            return <CohortIcon cohort={params.row.previousCohort} size={32} />;
        },
        width: 110,
        align: 'center',
        headerAlign: 'center',
    };
}

function getSummaryUserInfoColumns(t: ScoreboardT) {
    return [getRankColumn(t), getDisplayNameColumn(t), getCohortColumn(t), getGraduatedColumn(t)];
}

function getDefaultUserInfoColumns(t: ScoreboardT) {
    return [getRankColumn(t), getDisplayNameColumn(t), getGraduatedColumn(t)];
}

function getRatingsColumnGroup(t: ScoreboardT) {
    return {
        groupId: t('groupRatings'),
        children: [
            { field: 'ratingSystem' },
            { field: 'startRating' },
            { field: 'currentRating' },
            { field: 'ratingChange' },
            { field: 'normalizedRating' },
        ],
    };
}

function getRatingsColumns(t: ScoreboardT, tRating: RatingT): GridColDef<ScoreboardRow>[] {
    return [
        {
            field: 'ratingSystem',
            headerName: t('ratingSystemColumn'),
            minWidth: 175,
            valueGetter: (_value, row) => getRatingSystem(row, t, tRating),
            align: 'center',
            headerAlign: 'center',
        },
        {
            field: 'startRating',
            headerName: t('startRatingColumn'),
            minWidth: 150,
            valueGetter: (_value, row) => getStartRating(row),
            align: 'center',
            headerAlign: 'center',
        },
        {
            field: 'currentRating',
            headerName: t('currentRatingColumn'),
            minWidth: 150,
            valueGetter: (_value, row) => getCurrentRating(row),
            align: 'center',
            headerAlign: 'center',
        },
        {
            field: 'ratingChange',
            headerName: t('ratingChangeColumn'),
            minWidth: 150,
            valueGetter: (_value, row) => getRatingChange(row),
            align: 'center',
            headerAlign: 'center',
        },
        {
            field: 'normalizedRating',
            headerName: t('normalizedRatingColumn'),
            minWidth: 200,
            valueGetter: (_value, row) => getNormalizedRatingRow(row),
            renderCell: (params: GridRenderCellParams<ScoreboardRow, number>) =>
                (params.value ?? -1) >= 0 ? (
                    params.value
                ) : (
                    <Tooltip title={t('normalizedRatingTooltip')}>
                        <HelpIcon sx={{ ml: 1, color: 'text.secondary', height: 1 }} />
                    </Tooltip>
                ),
            align: 'center',
            headerAlign: 'center',
        },
    ];
}

function getDefaultColumnGroups(t: ScoreboardT): GridColumnGroupingModel {
    return [
        getUserInfoColumnGroup(t),
        getRatingsColumnGroup(t),
        {
            groupId: t('groupTrainingPlan'),
            children: [{ field: 'cohortScore' }, { field: 'percentComplete' }],
        },
        {
            groupId: t('groupTimeSpent'),
            children: [
                { field: 'totalTime' },
                { field: 'last7DaysTime' },
                { field: 'last30DaysTime' },
                { field: 'last90DaysTime' },
                { field: 'last365DaysTime' },
                { field: 'nonDojoTime' },
            ],
            renderHeaderGroup: (params) => {
                return (
                    <Stack direction='row' alignItems='center'>
                        {params.groupId}
                        <Tooltip title={t('timeSpentTooltipDefault')}>
                            <HelpIcon sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                    </Stack>
                );
            },
        },
    ];
}

function getSummaryColumnGroups(t: ScoreboardT): GridColumnGroupingModel {
    return [
        getUserInfoColumnGroup(t),
        getRatingsColumnGroup(t),
        {
            groupId: t('groupTrainingPlan'),
            children: [{ field: 'totalDojoScore' }],
            renderHeaderGroup: (params) => {
                return (
                    <Stack direction='row' alignItems='center'>
                        {params.groupId}
                        <Tooltip title={t('timeSpentTooltipSummary')}>
                            <HelpIcon sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                    </Stack>
                );
            },
        },
        {
            groupId: t('groupTimeSpent'),
            children: [
                { field: 'totalTime' },
                { field: 'last7DaysTime' },
                { field: 'last30DaysTime' },
                { field: 'last90DaysTime' },
                { field: 'last365DaysTime' },
                { field: 'nonDojoTime' },
            ],
            renderHeaderGroup: (params) => {
                return (
                    <Stack direction='row' alignItems='center'>
                        {params.groupId}
                        <Tooltip title={t('timeSpentTooltipSummary')}>
                            <HelpIcon sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                    </Stack>
                );
            },
        },
    ];
}

/**
 * Returns the actions column for the scoreboard.
 * @param pinnedRowIds The ids of the currently-pinned rows.
 * @param setPinnedRowIds A function to set the new pinned row ids.
 * @returns The actions column for the scoreboard.
 */
function getActionColumns(
    pinnedRowIds: GridRowId[],
    setPinnedRowIds: React.Dispatch<React.SetStateAction<GridRowId[]>>,
    t: ScoreboardT,
): GridColDef<ScoreboardRow> {
    return {
        field: 'actions',
        type: 'actions',
        width: 50,
        getActions: (params) => {
            const id = (params.id as string).replace('#pinned', '');
            const isPinned = pinnedRowIds.includes(id);
            if (isPinned) {
                return [
                    <GridActionsCellItem
                        key='unpin'
                        label={t('unpinRow')}
                        icon={
                            <Tooltip title={t('unpinRow')}>
                                <PushPinIcon color='info' />
                            </Tooltip>
                        }
                        onClick={() =>
                            setPinnedRowIds((prevPinnedRowIds) => {
                                return prevPinnedRowIds.filter((rowId) => rowId !== id);
                            })
                        }
                    />,
                ];
            }
            return [
                <GridActionsCellItem
                    key='pin'
                    icon={
                        <Tooltip title={t('pinRow')}>
                            <PushPinIcon sx={{ color: 'text.secondary' }} />
                        </Tooltip>
                    }
                    label={t('pinRow')}
                    onClick={() => setPinnedRowIds((prevPinnedRowIds) => [...prevPinnedRowIds, id])}
                />,
            ];
        },
    };
}

/**
 * Returns the columns for the Training Plan column group.
 * @param cohort The cohort being displayed in the scoreboard, if applicable.
 * @param requirements The requirements being used to calculate the dojo score, if applicable.
 * @returns The columns for the Training Plan column group.
 */
function getTrainingPlanColumns(
    t: ScoreboardT,
    cohort?: string,
    requirements?: Requirement[],
): GridColDef<ScoreboardRow>[] {
    if (cohort && requirements) {
        return [
            {
                field: 'cohortScore',
                headerName: t('dojoScoreColumn'),
                minWidth: 125,
                valueGetter: (_value, row) => getCohortScore(row, cohort, requirements),
                align: 'center',
            },
            {
                field: 'percentComplete',
                headerName: t('percentCompleteColumn'),
                minWidth: 175,
                valueGetter: (_value, row) => getPercentComplete(row, cohort, requirements),
                renderCell: (params: GridRenderCellParams<ScoreboardRow, number>) => (
                    <ScoreboardProgress
                        fullHeight
                        value={params.value ?? 0}
                        max={100}
                        min={0}
                        label={formatPercentComplete(params.value ?? 0)}
                    />
                ),
                align: 'center',
            },
        ];
    }

    return [
        {
            field: 'totalDojoScore',
            headerName: t('dojoScoreColumn'),
            minWidth: 150,
            align: 'center',
            valueFormatter: (value) => Math.round(value * 100) / 100,
        },
    ];
}

/**
 * Returns the columns for the Time Spent column group.
 * @param allCohorts Whether all cohorts should be included for time spent.
 * @returns The columns for the Time Spent column group.
 */
function getTimeSpentColumns(
    t: ScoreboardT,
    tCommon: (key: string, values?: Record<string, string | number>) => string,
    allCohorts?: boolean,
): GridColDef<ScoreboardRow>[] {
    return [
        {
            field: 'totalTime',
            headerName: allCohorts ? t('allTasksColumn') : t('cohortTasksColumn'),
            valueGetter: (_value, row) =>
                getMinutesSpent(row, allCohorts ? 'ALL_COHORTS_ALL_TIME' : 'ALL_TIME'),
            valueFormatter: (value) => formatTime(value, tCommon),
            align: 'center',
            minWidth: 125,
            headerAlign: 'center',
        },
        {
            field: 'last7DaysTime',
            headerName: t('last7DaysColumn'),
            valueGetter: (_value, row) =>
                getMinutesSpent(row, allCohorts ? 'ALL_COHORTS_LAST_7_DAYS' : 'LAST_7_DAYS'),
            valueFormatter: (value) => formatTime(value, tCommon),
            align: 'center',
            minWidth: 125,
            headerAlign: 'center',
        },
        {
            field: 'last30DaysTime',
            headerName: t('last30DaysColumn'),
            valueGetter: (_value, row) =>
                getMinutesSpent(row, allCohorts ? 'ALL_COHORTS_LAST_30_DAYS' : 'LAST_30_DAYS'),
            valueFormatter: (value) => formatTime(value, tCommon),
            align: 'center',
            minWidth: 125,
            headerAlign: 'center',
        },
        {
            field: 'last90DaysTime',
            headerName: t('last90DaysColumn'),
            valueGetter: (_value, row) =>
                getMinutesSpent(row, allCohorts ? 'ALL_COHORTS_LAST_90_DAYS' : 'LAST_90_DAYS'),
            valueFormatter: (value) => formatTime(value, tCommon),
            align: 'center',
            minWidth: 125,
            headerAlign: 'center',
        },
        {
            field: 'last365DaysTime',
            headerName: t('last365DaysColumn'),
            valueGetter: (_value, row) =>
                getMinutesSpent(row, allCohorts ? 'ALL_COHORTS_LAST_365_DAYS' : 'LAST_365_DAYS'),
            valueFormatter: (value) => formatTime(value, tCommon),
            align: 'center',
            minWidth: 125,
            headerAlign: 'center',
        },
        {
            field: 'nonDojoTime',
            headerName: t('nonDojoColumn'),
            valueGetter: (_value, row) =>
                getMinutesSpent(row, allCohorts ? 'ALL_COHORTS_NON_DOJO' : 'NON_DOJO'),
            valueFormatter: (value) => formatTime(value, tCommon),
            align: 'center',
            minWidth: 125,
            headerAlign: 'center',
        },
    ];
}

interface ScoreboardProps {
    user?: User;
    cohort?: string;
    requirements?: Requirement[];
    rows: ScoreboardRow[];
    loading: boolean;
    addUser?: boolean;
    slots?: Partial<GridProSlotsComponent>;
    slotProps?: DataGridProProps['slotProps'];
}

const Scoreboard: React.FC<ScoreboardProps> = ({
    user,
    cohort,
    requirements,
    rows: initialRows,
    loading,
    addUser,
    slots,
    slotProps,
}) => {
    const t = useTranslations('scoreboard');
    const tCommon = useTranslations('common');
    const tRating = useTranslations('enums.ratingSystem');
    const isSummary = cohort === undefined;
    const isFreeTier = useFreeTier();

    const [pinnedRowIds, setPinnedRowIds] = useState<GridRowId[]>(user ? [user.username] : []);

    const actionColumn = useMemo(
        () => getActionColumns(pinnedRowIds, setPinnedRowIds, t),
        [pinnedRowIds, setPinnedRowIds, t],
    );

    const trainingPlanColumns = useMemo(
        () => getTrainingPlanColumns(t, cohort, requirements),
        [t, cohort, requirements],
    );

    const timeSpentColumns = useMemo(
        () => getTimeSpentColumns(t, tCommon, isSummary),
        [t, tCommon, isSummary],
    );

    const ratingsColumns = useMemo(() => getRatingsColumns(t, tRating), [t, tRating]);
    const summaryUserInfoColumns = useMemo(() => getSummaryUserInfoColumns(t), [t]);
    const defaultUserInfoColumns = useMemo(() => getDefaultUserInfoColumns(t), [t]);

    const requirementColumns: GridColDef<ScoreboardRow>[] = useMemo(() => {
        return (
            requirements
                ?.filter(
                    (r) =>
                        r.category !== 'Welcome to the Dojo' &&
                        r.category !== 'Non-Dojo' &&
                        r.scoreboardDisplay !== ScoreboardDisplay.Hidden &&
                        (!isFreeTier || r.isFree),
                )
                .map((r) => getColumnDefinition(r, cohort || '')) ?? []
        );
    }, [requirements, cohort, isFreeTier]);

    const requirementColumnGroups = useMemo(() => {
        const categories: Record<string, ColumnGroup> = {};
        requirements?.forEach((r) => {
            if (categories[r.category] !== undefined) {
                categories[r.category].children.push({ field: r.id });
            } else {
                categories[r.category] = {
                    groupId: r.category,
                    children: [{ field: r.id }],
                };
            }
        });
        return Object.values(categories);
    }, [requirements]);

    const columns = useMemo(
        () =>
            [actionColumn].concat(
                isSummary ? summaryUserInfoColumns : defaultUserInfoColumns,
                ratingsColumns,
                trainingPlanColumns,
                timeSpentColumns,
                requirementColumns,
            ),
        [
            actionColumn,
            isSummary,
            summaryUserInfoColumns,
            defaultUserInfoColumns,
            ratingsColumns,
            trainingPlanColumns,
            timeSpentColumns,
            requirementColumns,
        ],
    );

    const columnGroups = useMemo(
        () =>
            (isSummary ? getSummaryColumnGroups(t) : getDefaultColumnGroups(t)).concat(
                requirementColumnGroups,
            ),
        [t, isSummary, requirementColumnGroups],
    );

    const [rows, pinnedRows] = useMemo(() => {
        const pinnedRows: ScoreboardRow[] = [];

        const rows = addUser && user && !isFreeTier ? initialRows.concat(user) : initialRows;
        for (const row of rows) {
            if (pinnedRowIds.includes(row.username)) {
                pinnedRows.push(Object.assign({}, row, { username: `${row.username}#pinned` }));
            }
        }

        return [rows, { top: pinnedRows }];
    }, [user, initialRows, pinnedRowIds, isFreeTier, addUser]);

    const [columnVisibility, setColumnVisibility] = useLocalStorage<GridColumnVisibilityModel>(
        `/scoreboard/columns`,
        {},
    );

    return (
        <DataGridPro
            sx={{ mb: 4, height: 'calc(100vh - 120px)' }}
            columns={columns}
            columnGroupingModel={columnGroups}
            columnVisibilityModel={columnVisibility}
            onColumnVisibilityModelChange={(model) => setColumnVisibility(model)}
            rows={rows}
            pinnedRows={pinnedRows}
            loading={loading}
            getRowId={(row: GridRowModel<ScoreboardRow>) => row.username}
            initialState={{
                sorting: {
                    sortModel: [
                        {
                            field: isSummary ? 'totalDojoScore' : 'cohortScore',
                            sort: 'desc',
                        },
                    ],
                },
            }}
            pagination
            slots={slots}
            slotProps={slotProps}
            showToolbar
        />
    );
};

export default Scoreboard;
