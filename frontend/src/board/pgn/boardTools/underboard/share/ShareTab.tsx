import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { axiosService } from '@/api/axiosService';
import { isGame } from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useChess } from '@/board/pgn/PgnBoard';
import { DirectorySelectButton } from '@/components/directories/select/DirectorySelectButton';
import { DirectoryCacheProvider } from '@/components/profile/directories/DirectoryCache';
import { getConfig } from '@/config';
import useGame from '@/context/useGame';
import { pgnExportOptions, usePgnExportOptions } from '@/hooks/usePgnExportOptions';
import { Chess } from '@jackstenglein/chess';
import { GameImportTypes } from '@jackstenglein/chess-dojo-common/src/database/game';
import { PdfExportRequest } from '@jackstenglein/chess-dojo-common/src/pgn/export';
import {
    Check,
    ContentPaste,
    Download,
    Link,
    Merge,
    OpenInNew,
    PictureAsPdf,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    CardContent,
    Checkbox,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    Radio,
    RadioGroup,
    Slider,
    Stack,
} from '@mui/material';
import copy from 'copy-to-clipboard';
import { ReactNode, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { BoardStyle, BoardStyleKey, PieceStyle, PieceStyleKey } from '../settings/ViewerSettings';
import { MergeLineDialog } from './MergeLineDialog';

const config = getConfig();

export function ShareTab() {
    const { chess, board } = useChess();
    const { game } = useGame();
    const [copied, setCopied] = useState('');
    const api = useApi();
    const { user } = useAuth();

    const [boardStyle] = useLocalStorage<string>(BoardStyleKey, BoardStyle.Standard);
    const [pieceStyle] = useLocalStorage<string>(PieceStyleKey, PieceStyle.Standard);

    const [showMergeDialog, setShowMergeDialog] = useState(false);

    const {
        skipComments,
        setSkipComments,
        skipNags,
        setSkipNags,
        skipDrawables,
        setSkipDrawables,
        skipVariations,
        setSkipVariations,
        skipNullMoves,
        setSkipNullMoves,
        skipHeader,
        setSkipHeader,
        skipClocks,
        setSkipClocks,
        skipQrCode,
        setSkipQrCode,
        pdfDiagramMode,
        setPdfDiagramMode,
        plyBetweenDiagrams,
        setPlyBetweenDiagrams,
    } = usePgnExportOptions();

    const pdfRequest = useRequest();
    const cloneRequest = useRequest();
    const addToFolderRequest = useRequest<string>();

    const onAddToFolder = async (directory: { owner: string; id: string }) => {
        if (!game) {
            return true;
        }

        addToFolderRequest.onStart();

        try {
            const resp = await api.addDirectoryItems({
                owner: directory.owner,
                id: directory.id,
                games: [
                    {
                        owner: game.owner,
                        ownerDisplayName: game.ownerDisplayName,
                        createdAt:
                            game.createdAt ||
                            game.date.replaceAll('.', '-') ||
                            new Date().toISOString(),
                        id: game.id,
                        cohort: game.cohort,
                        white: game.headers.White,
                        black: game.headers.Black,
                        whiteElo: game.headers.WhiteElo,
                        blackElo: game.headers.BlackElo,
                        result: game.headers.Result,
                        unlisted: game.unlisted ?? false,
                    },
                ],
            });
            addToFolderRequest.onSuccess(`Game added to ${resp.data.directory.name}`);
            trackEvent(EventType.AddDirectoryItems, {
                count: 1,
                method: 'share_tab_add_to_folder',
            });
            return true;
        } catch (err) {
            addToFolderRequest.onFailure(err);
            return false;
        }
    };

    const onCopy = (name: string, value: string) => {
        copy(value);
        setCopied(name);
        setTimeout(() => {
            setCopied('');
        }, 2500);
    };

    const onCopyUrl = () => {
        onCopy('url', window.location.href);
    };

    const onCopyFen = () => {
        onCopy('fen', chess?.fen() || '');
    };

    const onOpenBoardImage = () => {
        if (!chess) {
            return;
        }

        const fen = chess.fen();
        const newParams: Record<string, string> = {
            fen,
            orientation: board?.state.orientation || 'white',
            white: getPlayer(chess, 'White', 'WhiteElo'),
            black: getPlayer(chess, 'Black', 'BlackElo'),
            date: chess.header().getRawValue('Date'),
            lastMove: board?.state.lastMove?.join('') || '',
            comment: window.location.href,
            theme: boardStyle.toLowerCase(),
            piece:
                pieceStyle === PieceStyle.ThreeD || pieceStyle === PieceStyle.ThreeDRedBlue
                    ? 'standard'
                    : pieceStyle.toLowerCase(),
        };
        if (!newParams.lastMove) {
            delete newParams.lastMove;
        }
        const params = new URLSearchParams(newParams);
        const url = `${config.api.baseUrl}/public/pgn-export/image?${params.toString()}`;
        window.open(url, '_blank');
    };

    const onDownloadGif = async () => {
        if (!chess) {
            return;
        }

        const white = getPlayer(chess, 'White', 'WhiteElo');
        const black = getPlayer(chess, 'Black', 'BlackElo');

        const response = await getPgnGif({
            white,
            black,
            date: chess.header().getRawValue('Date'),
            orientation: board?.state.orientation || 'white',
            comment: window.location.href,
            theme: boardStyle.toLowerCase(),
            piece:
                pieceStyle === PieceStyle.ThreeD || pieceStyle === PieceStyle.ThreeDRedBlue
                    ? 'standard'
                    : pieceStyle.toLowerCase(),
            delay: 100,
            frames: [{ fen: chess.setUpFen() }].concat(
                chess.history().map((move) => ({
                    fen: move.after,
                    lastMove: `${move.from}${move.to}`,
                })),
            ),
        });

        const a = document.createElement('a');
        a.download = `${white} - ${black}.gif`;
        a.href = window.URL.createObjectURL(response.data);
        a.dataset.downloadurl = ['application/octet-stream', a.download, a.href].join(':');
        a.click();
    };

    const renderPgn = () => {
        return (
            chess?.renderPgn({
                skipComments,
                skipNags,
                skipDrawables,
                skipVariations,
                skipNullMoves,
                skipHeader,
                skipClocks,
            }) || ''
        );
    };

    const renderLine = () => {
        return (
            chess?.renderLine(chess.currentMove(), {
                skipComments,
                skipNags,
                skipDrawables,
                skipVariations,
                skipNullMoves,
                skipHeader,
                skipClocks,
            }) || ''
        );
    };

    const onCopyPgn = () => {
        onCopy('pgn', renderPgn());
    };

    const onDownloadPgn = () => {
        if (!chess) {
            return;
        }

        const pgn = renderPgn();
        const white = getPlayer(chess, 'White', 'WhiteElo');
        const black = getPlayer(chess, 'Black', 'BlackElo');

        const a = document.createElement('a');
        a.download = `${white} - ${black}.pgn`;
        a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(pgn));
        a.click();
    };

    const onDownloadPdf = async () => {
        if (!chess) {
            return;
        }

        try {
            pdfRequest.onStart();
            const pgn =
                chess?.renderPgn({
                    skipComments,
                    skipNags,
                    skipDrawables,
                    skipVariations,
                    skipNullMoves,
                    skipHeader,
                }) || '';

            const response = await getPdf({
                pgn,
                orientation: game?.orientation || board?.state.orientation || 'white',
                cohort: game?.cohort,
                id: game?.id,
                skipHeader,
                skipComments,
                skipNags,
                skipDrawables,
                skipVariations,
                skipNullMoves,
                skipClocks,
                skipQrCode,
                plyBetweenDiagrams: pdfDiagramMode === 'markedPositions' ? -1 : plyBetweenDiagrams,
            });

            const white = getPlayer(chess, 'White', 'WhiteElo');
            const black = getPlayer(chess, 'Black', 'BlackElo');

            const a = document.createElement('a');
            a.download = `${white} - ${black}.pdf`;
            a.href = window.URL.createObjectURL(response.data);
            a.dataset.downloadurl = ['application/octet-stream', a.download, a.href].join(':');
            a.click();
            pdfRequest.onSuccess();
            window.URL.revokeObjectURL(a.href);
        } catch (err) {
            pdfRequest.onFailure(err);
        }
    };

    const onCopyLine = () => {
        onCopy('line', renderLine());
    };

    const onCloneGame = () => {
        if (!chess) {
            return;
        }

        cloneRequest.onStart();
        chess.setHeader('ClonedFrom', window.location.href);
        const pgn = renderPgn();
        chess.setHeader('ClonedFrom');

        api.createGame({ pgnText: pgn, type: GameImportTypes.clone })
            .then((resp) => {
                if (isGame(resp.data)) {
                    const urlSafeCohort = resp.data.cohort.replaceAll('+', '%2B');
                    window
                        .open(`${config.baseUrl}/games/${urlSafeCohort}/${resp.data.id}`, '_blank')
                        ?.focus();
                    trackEvent(EventType.SubmitGame, {
                        count: 1,
                        method: GameImportTypes.clone,
                    });
                }
                cloneRequest.onSuccess();
            })
            .catch((err) => {
                cloneRequest.onFailure(err);
            });
    };

    return (
        <CardContent data-cy='underboard-tab-share'>
            <Stack>
                <RequestSnackbar request={pdfRequest} />
                <RequestSnackbar request={cloneRequest} />
                <RequestSnackbar request={addToFolderRequest} showSuccess />

                <Stack direction='row' gap={1} flexWrap='wrap' mb={2} justifyContent='center'>
                    {game && (
                        <DirectoryCacheProvider>
                            <DirectorySelectButton
                                request={addToFolderRequest}
                                onSelect={onAddToFolder}
                            />
                        </DirectoryCacheProvider>
                    )}

                    <CopyButton name='url' startIcon={<Link />} onClick={onCopyUrl} copied={copied}>
                        Copy URL
                    </CopyButton>

                    <CopyButton
                        name='fen'
                        startIcon={<ContentPaste />}
                        onClick={onCopyFen}
                        copied={copied}
                    >
                        Copy FEN
                    </CopyButton>

                    <Button
                        variant='contained'
                        startIcon={<OpenInNew />}
                        onClick={onOpenBoardImage}
                    >
                        Image
                    </Button>

                    <Button variant='contained' startIcon={<Download />} onClick={onDownloadGif}>
                        Gif
                    </Button>
                </Stack>

                <Divider />

                <Stack direction='row' flexWrap='wrap' columnGap={1} mt={2}>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipComments}
                                    onChange={(e) => setSkipComments(!e.target.checked)}
                                />
                            }
                            label='Comments'
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipNags}
                                    onChange={(e) => setSkipNags(!e.target.checked)}
                                />
                            }
                            label='Glyphs (!, !?, etc)'
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipDrawables}
                                    onChange={(e) => setSkipDrawables(!e.target.checked)}
                                />
                            }
                            label='Arrows/Highlights'
                        />
                    </FormGroup>

                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipVariations}
                                    onChange={(e) => setSkipVariations(!e.target.checked)}
                                />
                            }
                            label='Variations'
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipNullMoves}
                                    onChange={(e) => setSkipNullMoves(!e.target.checked)}
                                />
                            }
                            label='Null Moves'
                        />
                    </FormGroup>

                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipHeader}
                                    onChange={(e) => setSkipHeader(!e.target.checked)}
                                />
                            }
                            label='Tags'
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipClocks}
                                    onChange={(e) => setSkipClocks(!e.target.checked)}
                                />
                            }
                            label='Clock Times'
                        />
                    </FormGroup>
                </Stack>

                <FormControl sx={{ mt: 1.5, mb: 1 }}>
                    <FormLabel>PDF Options</FormLabel>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!skipQrCode}
                                onChange={(e) => setSkipQrCode(!e.target.checked)}
                            />
                        }
                        label='QR Code'
                    />
                    <RadioGroup
                        row
                        value={pdfDiagramMode}
                        onChange={(e) =>
                            setPdfDiagramMode(e.target.value as 'markedPositions' | 'numMoves')
                        }
                    >
                        <FormControlLabel
                            value='markedPositions'
                            control={<Radio />}
                            label='Marked Positions Only'
                        />
                        <FormControlLabel
                            value='numMoves'
                            control={<Radio />}
                            label={`Marked Positions + Every ${plyBetweenDiagrams / 2} Moves`}
                        />
                    </RadioGroup>
                </FormControl>

                {pdfDiagramMode === 'numMoves' && (
                    <FormGroup>
                        <FormLabel>{plyBetweenDiagrams / 2} Moves Between Diagrams</FormLabel>
                        <Slider
                            value={plyBetweenDiagrams}
                            onChange={(_, value) => setPlyBetweenDiagrams(value)}
                            step={2}
                            min={pgnExportOptions.plyBetweenDiagrams.min}
                            max={pgnExportOptions.plyBetweenDiagrams.max}
                            valueLabelFormat={(value) => {
                                return value / 2;
                            }}
                            valueLabelDisplay='auto'
                        />
                    </FormGroup>
                )}

                <Stack direction='row' gap={1} flexWrap='wrap' mt={2} justifyContent='center'>
                    <CopyButton
                        name='pgn'
                        startIcon={<ContentPaste />}
                        onClick={onCopyPgn}
                        copied={copied}
                    >
                        Copy PGN
                    </CopyButton>

                    <Button variant='contained' startIcon={<Download />} onClick={onDownloadPgn}>
                        Download PGN
                    </Button>

                    <LoadingButton
                        variant='contained'
                        startIcon={<PictureAsPdf />}
                        onClick={onDownloadPdf}
                        loading={pdfRequest.isLoading()}
                    >
                        Download PDF
                    </LoadingButton>

                    <CopyButton
                        name='line'
                        startIcon={<ContentPaste />}
                        onClick={onCopyLine}
                        copied={copied}
                    >
                        Copy Current Line
                    </CopyButton>

                    {user && (
                        <>
                            <LoadingButton
                                variant='contained'
                                startIcon={<Merge />}
                                onClick={() => setShowMergeDialog(true)}
                            >
                                Merge Current Line
                            </LoadingButton>
                            <MergeLineDialog
                                open={showMergeDialog}
                                onClose={() => setShowMergeDialog(false)}
                            />

                            <LoadingButton
                                variant='contained'
                                loading={cloneRequest.isLoading()}
                                onClick={onCloneGame}
                            >
                                Clone Game
                            </LoadingButton>
                        </>
                    )}
                </Stack>
            </Stack>
        </CardContent>
    );
}

function CopyButton({
    name,
    children,
    startIcon,
    onClick,
    copied,
}: {
    name: string;
    children: ReactNode;
    startIcon: ReactNode;
    onClick: () => void;
    copied: string;
}) {
    return (
        <Button
            variant='contained'
            startIcon={copied === name ? <Check /> : startIcon}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}

function getPlayer(chess: Chess, key: 'White' | 'Black', eloKey: 'WhiteElo' | 'BlackElo'): string {
    const player = chess.header().getRawValue(key);
    const elo = chess.header().getRawValue(eloKey);
    if (player) {
        let result = player;
        if (elo) {
            result += ` (${elo})`;
        }
        return result;
    }
    return '';
}

interface PgnGifProps {
    white?: string;
    black?: string;
    date?: string;
    comment?: string;
    orientation?: 'white' | 'black';
    theme?: string;
    piece?: string;
    delay?: number;
    frames: {
        fen: string;
        delay?: number;
        lastMove?: string;
        check?: string;
    }[];
}

/**
 * Sends an API request to fetch the gif data for the given props.
 * @param props The request to get the gif.
 * @returns The gif data as a blob.
 */
function getPgnGif(props: PgnGifProps) {
    return axiosService.post<Blob>(`/public/pgn-export/gif`, props, {
        responseType: 'blob',
        functionName: 'pgnExportGif',
    });
}

function getPdf(request: PdfExportRequest) {
    return axiosService.post<Blob>(`/public/pgn-export/pdf`, request, {
        responseType: 'blob',
        functionName: 'pgnExportPdf',
    });
}
