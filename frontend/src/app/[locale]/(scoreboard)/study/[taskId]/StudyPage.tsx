'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import PurchaseCoursePage from '@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/PurchaseCoursePage';
import { useAuth, useFreeTier } from '@/auth/Auth';
import PgnBoard, { PgnBoardSlots } from '@/board/pgn/PgnBoard';
import { CustomUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import { EngineControlContext } from '@/board/pgn/pgnText/engine/EngineControl';
import { AreaSizes, getSizes } from '@/board/pgn/resize';
import { Link } from '@/components/navigation/Link';
import { SolveBoard, SolveStatus } from '@/components/profile/trainingPlan/study/SolveBoard';
import { StudyBoardActions } from '@/components/profile/trainingPlan/study/StudyBoardActions';
import { StudyCatalog } from '@/components/profile/trainingPlan/study/StudyCatalog';
import { StudyLayout } from '@/components/profile/trainingPlan/study/StudyLayout';
import { StudyPanel } from '@/components/profile/trainingPlan/study/StudyPanel';
import { StudyItem } from '@/components/profile/trainingPlan/study/book';
import { sideToMove, taskTitle } from '@/components/profile/trainingPlan/study/selectors';
import {
    StudyBoard,
    StudyMode,
    StudyReady,
    StudySource,
    useStudy,
} from '@/components/profile/trainingPlan/study/useStudy';
import { GameContext } from '@/context/useGame';
import PgnErrorBoundary from '@/games/view/PgnErrorBoundary';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import LoadingPage from '@/loading/LoadingPage';
import { useLightMode } from '@/style/useLightMode';
import { useWindowSizeEffect } from '@/style/useWindowSizeEffect';
import { MenuBook } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useNavigationGuard } from 'next-navigation-guard';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

const READER_TAB = 'reader';

const NO_DONE_MARKS = new Set<string>();

export function StudyPage({ source: routeSource }: { source: StudySource }) {
    const { user } = useAuth();
    const { searchParams } = useNextSearchParams();
    if (!user) {
        return <LoadingPage />;
    }
    // A different cohort in the URL opens its material in browse mode.
    // The member's own cohort opens a progress session.
    const cohort = searchParams.get('cohort');
    const source: StudySource =
        routeSource.kind === 'task' && cohort && cohort !== user.dojoCohort
            ? { ...routeSource, cohort }
            : routeSource;
    return <StudyContent source={source} />;
}

function StudyContent({ source }: { source: StudySource }) {
    const t = useTranslations('study');
    const { searchParams } = useNextSearchParams();
    const { user } = useAuth();
    const study = useStudy(source, searchParams.get('item'));
    const isFreeTier = useFreeTier();

    if (study.status === 'loading') {
        return <LoadingPage />;
    }
    if (study.status === 'error') {
        return (
            <Container sx={{ py: 5 }}>
                <Typography color='error'>{String(study.error)}</Typography>
            </Container>
        );
    }
    if (study.status === 'blocked') {
        return <PurchaseCoursePage course={study.course} isFreeTier={isFreeTier} />;
    }
    if (study.status === 'no-material' || study.status === 'empty') {
        return (
            <Container sx={{ py: 5 }}>
                <Stack spacing={2}>
                    <Typography variant='h5'>
                        {study.status === 'no-material'
                            ? taskTitle(study.task, user?.dojoCohort ?? '')
                            : study.book.title}
                    </Typography>
                    <Typography>
                        {study.status === 'no-material'
                            ? t('noMaterial')
                            : t('catalog.empty', { count: study.book.skipped })}
                    </Typography>
                    <Button
                        component={Link}
                        href='/profile?view=progress'
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        {t('backToPlan')}
                    </Button>
                </Stack>
            </Container>
        );
    }
    return <StudyReadyView study={study} />;
}

function StudyReadyView({ study }: { study: StudyReady }) {
    const t = useTranslations('study');
    const tGuard = useTranslations('games.unsavedNavigationGuard');
    const tNav = useTranslations('navbar');
    const [blockedSelect, setBlockedSelect] = useState(false);
    const [catalogOpen, setCatalogOpen] = useLocalStorage('study.catalogOpen', true);
    const markRequest = useRequest();

    // The board's own guard only covers a saved game; until the copy exists, this page holds the edits.
    const guard = useNavigationGuard({ enabled: study.pendingEdits });
    useEffect(() => {
        if (!study.pendingEdits) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [study.pendingEdits]);

    const { session, book, current, board, select } = study;
    const isDone = session?.done.has(current.key) ?? false;
    const hasCopy = Boolean(board?.context.game) && current.kind === 'canonical';
    const targetReached =
        session?.mapping.unit && session.currentCount >= session.totalCount
            ? session.totalCount - (session.task.startCount ?? 0)
            : undefined;

    const onSelect = (item: StudyItem) => {
        if (!select(item)) setBlockedSelect(true);
    };
    const onSetMode = (kind: StudyMode['kind']) => {
        if (!study.setMode(current, kind)) setBlockedSelect(true);
    };
    // The hook marks the item as it was when Done was pressed, even if the member moves on
    // while the post or the count refresh is pending.
    const mark = () => {
        if (!session) return;
        markRequest.onStart();
        session.markItemDone(current).then(() => markRequest.onSuccess(), markRequest.onFailure);
    };
    const onMarkDone = () => {
        if (!markRequest.isLoading()) mark();
    };
    // An item already marked done gets no second post. The pane calls this once per board.
    const onSolveComplete = () => {
        if (!isDone) mark();
    };
    const onUndo = () => {
        if (!session || markRequest.isLoading()) return;
        markRequest.onStart();
        session.undoMark(current.key).then(() => markRequest.onSuccess(), markRequest.onFailure);
    };

    const renderPanel = (status?: SolveStatus) => (
        <StudyPanel
            book={book}
            current={current}
            session={session}
            hasCopy={hasCopy}
            isDone={isDone}
            solveStatus={status}
            mark={
                session && {
                    canUndo: session.canUndo,
                    saving: markRequest.isLoading(),
                    onUndo,
                }
            }
            onMarkDone={onMarkDone}
            onSelect={onSelect}
            onSetMode={onSetMode}
        />
    );

    // The panel is the board's only right tab, so no tab strip shows.
    const rightTabs: CustomUnderboardTab[] = [
        {
            name: READER_TAB,
            tooltip: tNav('reader'),
            icon: <MenuBook />,
            element: renderPanel(),
        },
    ];

    return (
        <>
            <StudyLayout
                catalog={(onCollapse) => (
                    <StudyCatalog
                        book={book}
                        current={current}
                        done={session?.done ?? NO_DONE_MARKS}
                        workedOn={study.workedOn}
                        historyComplete={session?.historyComplete ?? true}
                        browsing={!session}
                        unit={session?.mapping.mapped ? session.mapping.unit : undefined}
                        targetReached={targetReached}
                        onSelect={onSelect}
                        onCollapse={onCollapse}
                    />
                )}
                catalogOpen={catalogOpen}
                onToggleCatalog={() => setCatalogOpen(!catalogOpen)}
            >
                {!board ? (
                    <LoadingPage />
                ) : (
                    <PgnErrorBoundary key={board.key} pgn={board.pgn}>
                        {board.mode.kind === 'solve' ? (
                            <SolvePane
                                board={board}
                                playBothSides={board.mode.playBothSides}
                                panel={renderPanel}
                                onComplete={onSolveComplete}
                            />
                        ) : (
                            <ReadPane
                                board={board}
                                rightTabs={rightTabs}
                                onInitialize={study.onBoardInitialize}
                            />
                        )}
                    </PgnErrorBoundary>
                )}
            </StudyLayout>

            <RequestSnackbar request={study.copyRequest} />
            <RequestSnackbar request={markRequest} />

            <Dialog open={blockedSelect} onClose={() => setBlockedSelect(false)}>
                <DialogTitle>{t('session.savingTitle')}</DialogTitle>
                <DialogContent>
                    {study.copyRequest.isFailure()
                        ? t('session.unsavedBody')
                        : t('session.savingBody')}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBlockedSelect(false)}>{tGuard('cancel')}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={guard.active} onClose={guard.reject}>
                <DialogTitle>{tGuard('title')}</DialogTitle>
                <DialogContent>{tGuard('gameWarning')}</DialogContent>
                <DialogActions>
                    <Button onClick={guard.reject}>{tGuard('cancel')}</Button>
                    <Button color='error' onClick={guard.accept}>
                        {tGuard('leave')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

/** The row under the board, made once so a toggle does not change the board's context. */
const READ_SLOTS: PgnBoardSlots = { boardButtons: <StudyBoardActions /> };

/**
 * The move list board and its panel. The engine is off until the member turns it on from the
 * row under the board, and a new board starts off again. The engine state reaches the strip
 * through EngineControlContext alone, never through the board's props, so a toggle leaves the
 * board's context and the move list's scroll position untouched.
 */
function ReadPane({
    board,
    rightTabs,
    onInitialize,
}: {
    board: StudyBoard;
    rightTabs: CustomUnderboardTab[];
    onInitialize: StudyReady['onBoardInitialize'];
}) {
    const [pgn] = useState(board.latestPgn);
    const [engineOn, setEngineOn] = useState(false);
    const engineControl = useMemo(
        () => ({ enabled: engineOn, setEnabled: setEngineOn }),
        [engineOn],
    );

    return (
        <GameContext.Provider value={board.context}>
            <EngineControlContext.Provider value={engineControl}>
                <PgnBoard
                    pgn={pgn}
                    startOrientation={board.orientation}
                    onInitialize={onInitialize}
                    disableExport={board.disableExport}
                    showPlayerHeaders={false}
                    underboardTabs={[]}
                    rightTabs={rightTabs}
                    initialRightTab={READER_TAB}
                    allowMoveDeletion
                    allowDeleteBefore
                    slots={READ_SLOTS}
                />
            </EngineControlContext.Provider>
        </GameContext.Provider>
    );
}

/**
 * The solve board and its panel, sized with the read layout's rule so the two modes line
 * up with the catalog the same way. The status lives here, with the board it describes, so
 * a remount starts at the prompt.
 */
function SolvePane({
    board,
    playBothSides,
    panel,
    onComplete,
}: {
    board: StudyBoard;
    playBothSides: boolean;
    panel: (status: SolveStatus) => ReactNode;
    onComplete: () => void;
}) {
    const light = useLightMode();
    const paneRef = useRef<HTMLDivElement>(null);
    const [sizes, setSizes] = useState<AreaSizes>();
    const [pgn] = useState(board.latestPgn);
    // The board reports the side to move once it mounts. Until then the PGN header names it.
    const [status, setStatus] = useState<SolveStatus>(() => ({
        kind: 'prompt',
        toMove: sideToMove(pgn),
    }));
    const completed = useRef(false);
    const onSolved = () => {
        if (completed.current) return;
        completed.current = true;
        onComplete();
    };
    const measure = useCallback(() => {
        const width = paneRef.current?.getBoundingClientRect().width ?? 0;
        setSizes(getSizes(width, false, true, { showPgn: true }));
    }, []);
    useEffect(measure, [measure]);
    useWindowSizeEffect(measure);

    return (
        <Stack
            ref={paneRef}
            direction='row'
            data-testid='study-solve-pane'
            data-board-key={board.key}
            sx={{
                width: 1,
                justifyContent: 'center',
                flexWrap: 'wrap',
                rowGap: 0.5,
                columnGap: { xs: 0.5, md: 1 },
            }}
        >
            {sizes && (
                <>
                    <Box sx={{ width: sizes.board.width, height: sizes.board.width }}>
                        <SolveBoard
                            pgn={pgn}
                            playBothSides={playBothSides}
                            onStatus={setStatus}
                            onComplete={onSolved}
                        />
                    </Box>
                    <Card
                        elevation={light ? undefined : 3}
                        variant={light ? 'outlined' : 'elevation'}
                        sx={{
                            width: sizes.pgn.width,
                            height: sizes.pgn.height,
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'none',
                        }}
                    >
                        {panel(status)}
                    </Card>
                </>
            )}
        </Stack>
    );
}
