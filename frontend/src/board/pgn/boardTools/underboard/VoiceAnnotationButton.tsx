import { Chess, CommentType, EventType } from '@jackstenglein/chess';
import Mic from '@mui/icons-material/Mic';
import Stop from '@mui/icons-material/Stop';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Snackbar,
    Tooltip,
} from '@mui/material';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

// The recognition controller (including the prefixed version) is not in lib.dom.
interface SpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult:
        | ((event: {
              resultIndex: number;
              results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
          }) => void)
        | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

function getSpeechRecognition() {
    const speechWindow = window as Window & {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export default function VoiceAnnotationButton({
    chess,
    commentType,
    enabled = true,
}: {
    chess: Chess;
    commentType: CommentType;
    enabled?: boolean;
}) {
    const t = useTranslations('analysisBoard.underboard.dictation');
    const locale = useLocale();
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [stopping, setStopping] = useState(false);
    const [showNotice, setShowNotice] = useState(false);
    const [error, setError] = useState('');
    const noticeAcceptedRef = useRef(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const cancelRecognition = useCallback(() => {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        if (recognition) {
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            recognition.abort();
        }
        setListening(false);
        setStopping(false);
    }, []);

    useEffect(() => {
        setSupported(Boolean(getSpeechRecognition()));
    }, []);

    useEffect(() => {
        if (!enabled) {
            setShowNotice(false);
            return;
        }
        const observer = {
            types: [
                EventType.Initialized,
                EventType.LegalMove,
                EventType.DeleteMove,
                EventType.DeleteBeforeMove,
                EventType.PromoteVariation,
            ],
            handler: cancelRecognition,
        };
        chess.addObserver(observer);
        return () => {
            chess.removeObserver(observer);
            cancelRecognition();
        };
    }, [chess, commentType, locale, enabled, cancelRecognition]);

    const startRecognition = () => {
        setShowNotice(false);
        if (!enabled || recognitionRef.current) {
            return;
        }
        const Recognition = getSpeechRecognition();
        if (!Recognition) {
            return;
        }
        setError('');
        const move = chess.currentMove();
        const pgn = chess.pgn;
        const processedResults = new Set<number>();

        try {
            const recognition = new Recognition();
            recognition.lang = locale === 'pseudo' ? 'en' : locale;
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.onresult = (event) => {
                if (recognitionRef.current !== recognition) {
                    return;
                }
                if (chess.currentMove() !== move || chess.pgn !== pgn) {
                    cancelRecognition();
                    return;
                }
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (!result.isFinal || processedResults.has(i)) {
                        continue;
                    }
                    processedResults.add(i);
                    const transcript = result[0].transcript.trim();
                    if (!transcript) {
                        continue;
                    }
                    // Read the latest comment so typing during dictation is preserved.
                    const comment = chess.getComment(commentType, move);
                    const separator = comment && !/\s$/.test(comment) ? ' ' : '';
                    chess.setComment(`${comment}${separator}${transcript}`, commentType, move);
                }
            };
            recognition.onerror = (event) => {
                if (recognitionRef.current !== recognition) {
                    return;
                }
                cancelRecognition();
                if (event.error === 'not-allowed') {
                    setError(t('permissionError'));
                } else if (event.error === 'audio-capture') {
                    setError(t('microphoneError'));
                } else if (event.error === 'no-speech') {
                    setError(t('noSpeechError'));
                } else if (event.error === 'language-not-supported') {
                    setError(t('languageError'));
                } else if (event.error !== 'aborted') {
                    setError(t('failedError'));
                }
            };
            recognition.onend = () => {
                if (recognitionRef.current === recognition) {
                    recognitionRef.current = null;
                    setListening(false);
                    setStopping(false);
                }
            };
            recognitionRef.current = recognition;
            setListening(true);
            recognition.start();
        } catch {
            cancelRecognition();
            setError(t('failedError'));
        }
    };

    const onClick = () => {
        if (recognitionRef.current) {
            try {
                setStopping(true);
                recognitionRef.current.stop();
            } catch {
                cancelRecognition();
                setError(t('failedError'));
            }
        } else if (noticeAcceptedRef.current) {
            startRecognition();
        } else {
            setShowNotice(true);
        }
    };

    const label = !supported
        ? t('unsupported')
        : stopping
          ? t('stopping')
          : listening
            ? t('stop')
            : t('start');

    return (
        <>
            <Tooltip title={label}>
                <span>
                    <IconButton
                        aria-label={label}
                        aria-pressed={listening}
                        disabled={!enabled || !supported || stopping}
                        color={listening ? 'error' : 'primary'}
                        onClick={onClick}
                    >
                        {listening ? <Stop /> : <Mic />}
                    </IconButton>
                </span>
            </Tooltip>
            <Dialog open={enabled && showNotice} onClose={() => setShowNotice(false)}>
                <DialogTitle>{t('start')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('privacyNotice')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowNotice(false)}>{t('cancel')}</Button>
                    <Button
                        onClick={() => {
                            noticeAcceptedRef.current = true;
                            startRecognition();
                        }}
                    >
                        {t('start')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={enabled && Boolean(error)} onClose={() => setError('')}>
                <Alert severity='error' onClose={() => setError('')}>
                    {error}
                </Alert>
            </Snackbar>
        </>
    );
}
