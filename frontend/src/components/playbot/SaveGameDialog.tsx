'use client';

/**
 * SaveMaiaGameDialog
 *
 * Saves a completed Maia bot game to the user's ChessDojo game library.
 *
 * Builds the PGN from the MoveRecord list (which has san + fen per move),
 * pre-fills all headers from known game state (White, Black, Result, Date),
 * lets the user choose any folder via DirectorySelectButton (defaults to
 * My Games), then calls api.createGame({ type: 'manual', pgnText, ... }).
 *
 * After save → navigates to the new game page.
 */

import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { isGame } from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { DirectorySelectButton } from '@/components/directories/select/DirectorySelectButton';
import { DirectoryCacheProvider } from '@/components/profile/directories/DirectoryCache';
import { GameResult } from '@/database/game';
import { useRouter } from '@/hooks/useRouter';
import { FEN } from '@jackstenglein/chess';
import { MY_GAMES_DIRECTORY_ID } from '@jackstenglein/chess-dojo-common/src/database/directory';
import { GameImportTypes } from '@jackstenglein/chess-dojo-common/src/database/game';
import { SaveOutlined } from '@mui/icons-material';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Stack,
    Typography,
} from '@mui/material';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { MaiaRating } from './maiaengine';
import { GameResult as BotGameResult, MoveRecord, PlayerColor } from './useMaiaGame';

function buildResultTag(result: BotGameResult): string {
    if (result === 'white') return GameResult.White;
    if (result === 'black') return GameResult.Black;
    if (result === 'draw') return GameResult.Draw;
    return '*';
}

function buildPgn(opts: {
    whiteName: string;
    blackName: string;
    result: BotGameResult;
    startFen: string;
    moves: MoveRecord[];
    playerColor: PlayerColor;
    maiaRating: MaiaRating;
}): string {
    const { whiteName, blackName, result, startFen, moves, maiaRating } = opts;
    const resultTag = buildResultTag(result);
    const dateStr = DateTime.now().toFormat('yyyy.MM.dd');
    const isCustomStart = startFen && startFen !== FEN.start;

    const headers = [
        `[White "${whiteName}"]`,
        `[Black "${blackName}"]`,
        `[Result "${resultTag}"]`,
        `[Date "${dateStr}"]`,
        `[Site "ChessDojo — Play Maia ${maiaRating}"]`,
        ...(isCustomStart ? [`[SetUp "1"]`, `[FEN "${startFen}"]`] : []),
    ].join('\n');

    const moveParts: string[] = [];
    for (let i = 0; i < moves.length; i++) {
        const moveNum = Math.floor(i / 2) + 1;
        if (i % 2 === 0) {
            moveParts.push(`${moveNum}.`);
        }
        moveParts.push(moves[i].san);
    }
    moveParts.push(resultTag);

    return `${headers}\n\n${moveParts.join(' ')}`;
}

interface SaveMaiaGameDialogProps {
    open: boolean;
    onClose: () => void;
    result: BotGameResult;
    moves: MoveRecord[];
    playerColor: PlayerColor;
    maiaRating: MaiaRating;
    startFen: string;
}

export function SaveMaiaGameDialog({
    open,
    onClose,
    result,
    moves,
    playerColor,
    maiaRating,
    startFen,
}: SaveMaiaGameDialogProps) {
    const { user } = useAuth();
    const api = useApi();
    const router = useRouter();
    const request = useRequest<string>();

    const playerName = user?.displayName || 'You';
    const botName = `Maia ${maiaRating}`;

    const whiteName = playerColor === 'white' ? playerName : botName;
    const blackName = playerColor === 'black' ? playerName : botName;

    const [directory, setDirectory] = useState<{ owner: string; id: string }>({
        owner: user?.username || '',
        id: MY_GAMES_DIRECTORY_ID,
    });
    const [addToFolder, setAddToFolder] = useState(false);

    const handleSave = async () => {
        request.onStart();
        try {
            const pgn = buildPgn({
                whiteName,
                blackName,
                result,
                startFen,
                moves,
                playerColor,
                maiaRating,
            });
            const resp = await api.createGame({
                type: GameImportTypes.manual,
                pgnText: pgn,
                orientation: playerColor,
                publish: false,
                directory: addToFolder ? directory : undefined,
            });
            trackEvent(EventType.SubmitGame, { count: 1, method: GameImportTypes.manual });

            if (isGame(resp.data)) {
                const cohort = resp.data.cohort.replaceAll('+', '%2B');
                const id = resp.data.id.replaceAll('?', '%3F');
                router.push(`/games/${cohort}/${id}`);
            }
        } catch (err) {
            request.onFailure(err);
        }
    };

    const resultTag = buildResultTag(result);

    return (
        <Dialog
            open={open}
            onClose={request.isLoading() ? undefined : onClose}
            maxWidth='xs'
            fullWidth
        >
            <RequestSnackbar request={request} />

            <DialogTitle>
                <Stack direction='row' alignItems='center' spacing={1}>
                    <SaveOutlined color='primary' />
                    <span>Save Game</span>
                </Stack>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2}>
                    {/* Game summary */}
                    <Stack
                        direction='row'
                        alignItems='center'
                        justifyContent='space-between'
                        sx={{ px: 1, py: 0.75, bgcolor: 'action.hover', borderRadius: 1 }}
                    >
                        <Stack>
                            <Typography variant='body2' fontWeight={600}>
                                {whiteName}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                                White
                            </Typography>
                        </Stack>
                        <Typography variant='h6' fontWeight={700} color='text.secondary'>
                            {resultTag}
                        </Typography>
                        <Stack alignItems='flex-end'>
                            <Typography variant='body2' fontWeight={600}>
                                {blackName}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                                Black
                            </Typography>
                        </Stack>
                    </Stack>

                    <Divider />

                    <Stack spacing={0.5}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={addToFolder}
                                    onChange={(e) => setAddToFolder(e.target.checked)}
                                    size='small'
                                />
                            }
                            label={<Typography variant='body2'>Add to folder</Typography>}
                        />
                        <DirectoryCacheProvider>
                            <DirectorySelectButton
                                initialDirectory={directory}
                                showDirectoryName
                                onSelect={(dir) => {
                                    setDirectory(dir);
                                    return Promise.resolve(true);
                                }}
                                slotProps={{
                                    button: { disabled: !addToFolder, size: 'small' },
                                    dialog: { confirmButton: { children: 'Select' } },
                                }}
                            />
                        </DirectoryCacheProvider>
                    </Stack>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={request.isLoading()}>
                    Cancel
                </Button>
                <Button onClick={handleSave} loading={request.isLoading()}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
