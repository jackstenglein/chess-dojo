import { useChess } from '@/board/pgn/PgnBoard';
import {
    ENGINE_LINE_COUNT,
    ENGINE_NAME,
    engines,
    LineEval,
} from '@/stockfish/engine/engine';
import { useChessDB } from '@/stockfish/hooks/useChessDb';
import { useEval } from '@/stockfish/hooks/useEval';
import Icon from '@/style/Icon';
import { Box, Paper, Stack, Switch, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { EvaluationSection } from './EvaluationSection';
import { formatLineEval } from './LineEval';
import Settings from './Settings';

export default function EngineSection() {
    const [engineName] = useLocalStorage(ENGINE_NAME.Key, ENGINE_NAME.Default);
    let engineInfo = engines.find((e) => e.name === engineName);
    if (!engineInfo) {
        engineInfo = engines[0];
    }

    const [linesNumber] = useLocalStorage(ENGINE_LINE_COUNT.Key, ENGINE_LINE_COUNT.Default);

    const [enabled, setEnabled] = useState(false);
    const evaluation = useEval(enabled, engineInfo.name);

    const { chess } = useChess();
    const isGameOver = chess?.isGameOver();

    const { pv: chessDbPv, pvLoading: chessDbLoading } = useChessDB();

    const engineLines = evaluation?.lines?.length
        ? evaluation.lines
        : (Array.from({ length: Math.max(1, linesNumber) }).map((_, i) => ({
              fen: '',
              pv: [],
              depth: 0,
              multiPv: i + 1,
          })) as LineEval[]);

    const resultPercentages = engineLines[0]?.resultPercentages;
;
 

    return (
        <Paper
            elevation={6}
            sx={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
            }}
        >
            <Stack sx={{ p: 1, containerType: 'inline-size' }}>
                <Stack direction='row' alignItems='center'>
                    <Tooltip title='Toggle Engine' disableInteractive>
                        <Switch
                            checked={enabled}
                            onChange={(e) => {
                                setEnabled((prev) => !prev);
                                e.currentTarget.blur();
                            }}
                            sx={{ mr: 1 }}
                        />
                    </Tooltip>

                    {enabled && !isGameOver && (
                        <Stack sx={{ mr: 2 }} alignItems='center'>
                            <Typography variant='h5'>{formatLineEval(engineLines[0])}</Typography>
                            <Tooltip
                                title="The engine's expected Win / Draw / Loss percentages"
                                disableInteractive
                            >
                                <Typography variant='caption' sx={{ whiteSpace: 'nowrap' }}>
                                    {resultPercentages?.win ?? '?'} /{' '}
                                    {resultPercentages?.draw ?? '?'} /{' '}
                                    {resultPercentages?.loss ?? '?'}
                                </Typography>
                            </Tooltip>
                        </Stack>
                    )}

                    <Stack sx={{ flexGrow: 1, lineHeight: '1.2', color: 'text.secondary' }}>
                        <Stack direction='row' alignItems='center'>
                            <Typography variant='caption' sx={{ display: { '@288': 'none' } }}>
                                {engineInfo.extraShortName}
                            </Typography>
                            <Typography
                                variant='caption'
                                sx={{ display: { '@': 'none', '@288': 'initial' } }}
                            >
                                {engineInfo.shortName}
                            </Typography>

                            <Tooltip title={engineInfo.techDescription} disableInteractive>
                                <Typography
                                    color='dojoOrange'
                                    variant='caption'
                                    sx={{ display: { '@': 'none', '@351': 'initial' } }}
                                >
                                    <Icon
                                        name={engineInfo.name}
                                        sx={{
                                            verticalAlign: 'middle',
                                            ml: 0.75,
                                            mr: 0.5,
                                            fontSize: 15,
                                        }}
                                    />
                                    {engineInfo.tech}
                                </Typography>
                            </Tooltip>

                        </Stack>

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { '@': 'column', '@319': 'row' },
                            }}
                        >
                            {enabled ? (
                                isGameOver ? (
                                    <Typography variant='caption'>Game Over</Typography>
                                ) : (
                                    <>
                                        <Typography variant='caption'>
                                            Depth {engineLines[0].depth}
                                        </Typography>
                                        <Typography
                                            variant='caption'
                                            sx={{
                                                whiteSpace: 'pre',
                                                display: { '@': 'none', '@319': 'initial' },
                                            }}
                                        >
                                            {' • '}
                                        </Typography>
                                        <NodesPerSecond nps={engineLines[0].nps} />
                                    </>
                                )
                            ) : (
                                <Typography variant='caption'>{engineInfo.location}</Typography>
                            )}
                        </Box>
                    </Stack>

                    <Settings />
                </Stack>

                {enabled && !isGameOver && (
                    <Stack>
                        <EvaluationSection
                            engineInfo={engineInfo}
                            allLines={engineLines}
                            maxLines={linesNumber}
                            chessDbpv={chessDbPv}
                            chessDbLoading={chessDbLoading}
                        />
                    </Stack>
                )}
            </Stack>
        </Paper>
    );
}

function NodesPerSecond({ nps }: { nps?: number }) {
    if (!nps) return null;

    let text = '';
    if (nps > 1_000_000) {
        text = `${Math.round(nps / 100_000) / 10} Mn/s`;
    } else {
        text = `${Math.round(nps / 100) / 10} Kn/s`;
    }

    return (
        <Tooltip title='Nodes (positions searched) per second' disableInteractive>
            <Typography variant='caption'>{text}</Typography>
        </Tooltip>
    );
}
