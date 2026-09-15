import { Move } from '@jackstenglein/chess';
import { useCallback, useRef } from 'react';

/**
 * Returns a `playSound` function that plays the appropriate chess
 * sound (move, capture, or check) based on the move that was made.
 * Does nothing when `enabled` is false.
 */
export function useBoardSound(enabled: boolean) {
    const moveAudio = useRef<HTMLAudioElement | null>(null);
    const captureAudio = useRef<HTMLAudioElement | null>(null);
    const checkAudio = useRef<HTMLAudioElement | null>(null);

    const getAudio = useCallback((ref: React.RefObject<HTMLAudioElement | null>, src: string) => {
        if (!ref.current) {
            ref.current = new Audio(src);
            ref.current.volume = 0.7;
        }
        return ref.current;
    }, []);

    const playSound = useCallback(
        (move: Move, isCheck: boolean) => {
            if (!enabled) return;

            let audio: HTMLAudioElement;
            if (isCheck) {
                audio = getAudio(checkAudio, '/static/board/sounds/check.mp3');
            } else if (move.captured) {
                audio = getAudio(captureAudio, '/static/board/sounds/capture.mp3');
            } else {
                audio = getAudio(moveAudio, '/static/board/sounds/move.mp3');
            }

            // Rewind so rapid moves always play from the start
            audio.currentTime = 0;
            audio.play().catch(() => {
                // Browsers may silently block autoplay; ignore
            });
        },
        [enabled, getAudio],
    );

    return { playSound };
}
