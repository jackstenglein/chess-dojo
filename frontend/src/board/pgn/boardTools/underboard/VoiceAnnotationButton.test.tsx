import { Chess, CommentType } from '@jackstenglein/chess';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '~/messages/en.json';
import VoiceAnnotationButton from './VoiceAnnotationButton';

function renderWithIntl(children: ReactElement, locale = 'en') {
    return render(children, {
        wrapper: ({ children }) => (
            <NextIntlClientProvider
                locale={locale}
                messages={{
                    analysisBoard: {
                        underboard: { dictation: messages.analysisBoard.underboard.dictation },
                    },
                }}
            >
                {children}
            </NextIntlClientProvider>
        ),
    });
}

class MockRecognition {
    static instances: MockRecognition[] = [];
    static startError = false;
    lang = '';
    continuous = false;
    interimResults = true;
    onresult:
        | ((event: {
              resultIndex: number;
              results: { isFinal: boolean; 0: { transcript: string } }[];
          }) => void)
        | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start = vi.fn(() => {
        if (MockRecognition.startError) {
            throw new Error('Recognition unavailable');
        }
    });
    stop = vi.fn();
    abort = vi.fn();

    constructor() {
        MockRecognition.instances.push(this);
    }
}

function result(transcript: string, isFinal = true) {
    return { isFinal, 0: { transcript } };
}

async function startDictation() {
    fireEvent.click(screen.getByRole('button', { name: 'Start dictation' }));
    const dialog = screen.queryByRole('dialog');
    if (dialog) {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Start dictation' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
    const recognition = MockRecognition.instances.at(-1);
    if (!recognition) {
        throw new Error('Dictation did not create a recognition session');
    }
    return recognition;
}

function getCurrentMove(chess: Chess) {
    const move = chess.currentMove();
    if (!move) {
        throw new Error('Expected a current move');
    }
    return move;
}

function captureResultHandler(recognition: MockRecognition) {
    const handler = recognition.onresult;
    if (!handler) {
        throw new Error('Expected an active recognition session');
    }
    return handler;
}

describe('VoiceAnnotationButton', () => {
    let chess: Chess;

    beforeEach(() => {
        chess = new Chess({ pgn: '1. e4 e5' });
        MockRecognition.instances = [];
        MockRecognition.startError = false;
        vi.stubGlobal('SpeechRecognition', MockRecognition);
        vi.stubGlobal('webkitSpeechRecognition', undefined);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('requires confirmation before starting and allows cancellation', () => {
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start dictation' }));

        expect(screen.getByText(/Your browser may send audio/)).toBeVisible();
        expect(MockRecognition.instances).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(MockRecognition.instances).toHaveLength(0);
    });

    it('supports the prefixed browser API', async () => {
        vi.stubGlobal('SpeechRecognition', undefined);
        vi.stubGlobal('webkitSpeechRecognition', MockRecognition);
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const recognition = await startDictation();

        expect(recognition.start).toHaveBeenCalledOnce();
        expect(recognition.lang).toBe('en');
        expect(recognition.continuous).toBe(true);
        expect(recognition.interimResults).toBe(false);
        expect(screen.getByRole('button', { name: 'Stop dictation' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('disables dictation in unsupported browsers without changing annotations', () => {
        vi.stubGlobal('SpeechRecognition', undefined);
        chess.setComment('Existing annotation');
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);

        expect(
            screen.getByRole('button', { name: 'Dictation is not supported in this browser' }),
        ).toBeDisabled();
        expect(chess.getComment()).toBe('Existing annotation');
        expect(MockRecognition.instances).toHaveLength(0);
    });

    it('appends finalized speech once, ignores interim text, and preserves typed edits', async () => {
        chess.setComment('Existing annotation.');
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const recognition = await startDictation();

        act(() =>
            recognition.onresult?.({ resultIndex: 0, results: [result('uncertain', false)] }),
        );
        expect(chess.getComment()).toBe('Existing annotation.');

        const first = result(' A strong move. ');
        act(() => recognition.onresult?.({ resultIndex: 0, results: [first] }));
        expect(chess.getComment()).toBe('Existing annotation. A strong move.');
        chess.setComment(`${chess.getComment()} Typed correction.`);
        act(() =>
            recognition.onresult?.({ resultIndex: 0, results: [first, result('Next idea.')] }),
        );

        expect(chess.getComment()).toBe(
            'Existing annotation. A strong move. Typed correction. Next idea.',
        );
        expect(chess.renderPgn()).toContain('Typed correction. Next idea.');
    });

    it('writes starting-position annotations without adding extra whitespace', async () => {
        chess.seek(null);
        chess.setComment('Introduction.\n');
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const recognition = await startDictation();
        act(() => recognition.onresult?.({ resultIndex: 0, results: [result('Opening plan.')] }));

        expect(chess.getComment()).toBe('Introduction.\nOpening plan.');
    });

    it('dictates into the selected before-variation comment', async () => {
        chess.seek(getCurrentMove(chess).previous ?? null);
        chess.move('c5');
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.Before} />);
        const recognition = await startDictation();
        act(() => recognition.onresult?.({ resultIndex: 0, results: [result('An alternative.')] }));

        expect(chess.getComment(CommentType.Before)).toBe('An alternative.');
        expect(chess.getComment(CommentType.After)).toBe('');
    });

    it('allows a final result after Stop, prevents overlapping sessions, and can restart', async () => {
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const recognition = await startDictation();
        fireEvent.click(screen.getByRole('button', { name: 'Stop dictation' }));

        expect(recognition.stop).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Stopping dictation' })).toBeDisabled();
        expect(MockRecognition.instances).toHaveLength(1);
        act(() => recognition.onresult?.({ resultIndex: 0, results: [result('Final thought.')] }));
        act(() => recognition.onend?.());
        expect(chess.getComment()).toBe('Final thought.');

        await startDictation();
        expect(MockRecognition.instances).toHaveLength(2);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cancels on move changes and ignores late results even after returning to that move', async () => {
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const recognition = await startDictation();
        const lateResult = captureResultHandler(recognition);
        const originalMove = getCurrentMove(chess);

        act(() => {
            chess.seek(originalMove.previous ?? null);
        });
        act(() => {
            chess.seek(originalMove);
        });
        act(() => lateResult({ resultIndex: 0, results: [result('Wrong position.')] }));

        expect(recognition.abort).toHaveBeenCalledOnce();
        expect(recognition.onresult).toBeNull();
        expect(chess.getComment(CommentType.After, originalMove)).toBe('');
        expect(chess.getComment(CommentType.After, originalMove.previous ?? null)).toBe('');
        expect(screen.getByRole('button', { name: 'Start dictation' })).toBeEnabled();
    });

    it('cancels when a new game loads at the starting position', async () => {
        chess.seek(null);
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const recognition = await startDictation();
        const lateResult = captureResultHandler(recognition);

        act(() => chess.loadPgn(''));
        act(() => lateResult({ resultIndex: 0, results: [result('Old game.')] }));

        expect(recognition.abort).toHaveBeenCalledOnce();
        expect(chess.getComment()).toBe('');
    });

    it('cancels when the panel is hidden and does not restart when shown again', async () => {
        chess.setComment('Keep this.');
        const { rerender } = renderWithIntl(
            <VoiceAnnotationButton chess={chess} commentType={CommentType.After} enabled />,
        );
        const recognition = await startDictation();
        const lateResult = captureResultHandler(recognition);

        rerender(
            <VoiceAnnotationButton chess={chess} commentType={CommentType.After} enabled={false} />,
        );
        act(() => lateResult({ resultIndex: 0, results: [result('Hidden dictation.')] }));

        expect(recognition.abort).toHaveBeenCalledOnce();
        expect(recognition.onresult).toBeNull();
        expect(recognition.onerror).toBeNull();
        expect(recognition.onend).toBeNull();
        expect(chess.getComment()).toBe('Keep this.');
        expect(screen.getByRole('button', { name: 'Start dictation' })).toBeDisabled();

        rerender(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} enabled />);
        expect(screen.getByRole('button', { name: 'Start dictation' })).toBeEnabled();
        expect(MockRecognition.instances).toHaveLength(1);
        const nextRecognition = await startDictation();
        expect(nextRecognition).not.toBe(recognition);
        expect(nextRecognition.start).toHaveBeenCalledOnce();
    });

    it('dismisses the privacy notice when hidden without starting the microphone', async () => {
        const { rerender } = renderWithIntl(
            <VoiceAnnotationButton chess={chess} commentType={CommentType.After} enabled />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Start dictation' }));
        expect(screen.getByRole('dialog')).toBeVisible();

        rerender(
            <VoiceAnnotationButton chess={chess} commentType={CommentType.After} enabled={false} />,
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        rerender(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} enabled />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(MockRecognition.instances).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Start dictation' }));
        expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('cancels when the comment type changes', async () => {
        const { rerender } = renderWithIntl(
            <VoiceAnnotationButton chess={chess} commentType={CommentType.After} />,
        );
        const recognition = await startDictation();
        const lateResult = captureResultHandler(recognition);
        rerender(<VoiceAnnotationButton chess={chess} commentType={CommentType.Before} />);
        act(() => lateResult({ resultIndex: 0, results: [result('Wrong comment.')] }));

        expect(recognition.abort).toHaveBeenCalledOnce();
        expect(chess.getComment(CommentType.After)).toBe('');
        expect(chess.getComment(CommentType.Before)).toBe('');
    });

    it('cancels when the chess instance changes', async () => {
        const { rerender } = renderWithIntl(
            <VoiceAnnotationButton chess={chess} commentType={CommentType.After} />,
        );
        const recognition = await startDictation();
        const nextGame = new Chess();
        rerender(<VoiceAnnotationButton chess={nextGame} commentType={CommentType.After} />);

        expect(recognition.abort).toHaveBeenCalledOnce();
        expect(nextGame.getComment()).toBe('');
    });

    it('aborts and removes its observer on unmount', async () => {
        const initialObservers = chess.observers.length;
        const { unmount } = renderWithIntl(
            <VoiceAnnotationButton chess={chess} commentType={CommentType.After} />,
        );
        const recognition = await startDictation();
        const lateResult = captureResultHandler(recognition);
        unmount();
        act(() => lateResult({ resultIndex: 0, results: [result('Too late.')] }));

        expect(recognition.abort).toHaveBeenCalledOnce();
        expect(chess.observers).toHaveLength(initialObservers);
        expect(chess.getComment()).toBe('');
    });

    it.each([
        ['not-allowed', /Microphone access was denied/],
        ['audio-capture', /No microphone is available/],
        ['no-speech', /No speech was detected/],
        ['language-not-supported', /not available for this language/],
        ['network', /Dictation could not start/],
        ['service-not-allowed', /Dictation could not start/],
    ])('handles %s without modifying existing annotations', async (error, message) => {
        chess.setComment('Keep this.');
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const recognition = await startDictation();
        act(() => recognition.onerror?.({ error }));

        expect(screen.getByRole('alert')).toHaveTextContent(message);
        expect(screen.getByRole('button', { name: 'Start dictation' })).toBeEnabled();
        expect(chess.getComment()).toBe('Keep this.');
    });

    it('recovers from a synchronous start failure', async () => {
        MockRecognition.startError = true;
        renderWithIntl(<VoiceAnnotationButton chess={chess} commentType={CommentType.After} />);
        const failedRecognition = await startDictation();

        expect(screen.getByRole('alert')).toHaveTextContent(/Dictation could not start/);
        expect(failedRecognition.abort).toHaveBeenCalledOnce();
        MockRecognition.startError = false;
        const recognition = await startDictation();
        act(() => recognition.onresult?.({ resultIndex: 0, results: [result('Retry works.')] }));

        expect(chess.getComment()).toBe('Retry works.');
    });
});
