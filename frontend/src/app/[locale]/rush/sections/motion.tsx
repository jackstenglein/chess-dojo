import { keyframes } from '@mui/material/styles';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** A strong ease-out: quick to answer, slow to settle. Used for everything that enters. */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/**
 * Buttons give a little under the finger. The other transitions are MUI's own,
 * restated because setting `transition` replaces the whole list.
 */
export const pressSx = {
    '& .MuiButton-root, & [data-press]': {
        transition: `transform 160ms ${EASE_OUT}, background-color 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease`,
        '&:active': { transform: 'scale(0.97)' },
    },
} as const;

/** A number that has just changed lifts off the line and fades: "+70", "-90". */
export const floatAway = keyframes`
    0% { opacity: 0; transform: translateY(4px); }
    18% { opacity: 1; transform: translateY(0); }
    70% { opacity: 1; transform: translateY(-6px); }
    100% { opacity: 0; transform: translateY(-14px); }
`;

/** Hover styles only where there is a real pointer, so a tap on a phone leaves no stuck hover. */
export const HOVER = '@media (hover: hover) and (pointer: fine)';

/**
 * The change in rating next to the status line: it arrives, holds and fades where
 * it stands. It sits between the clock and the board, so it must not travel.
 */
export const popAway = keyframes`
    0% { opacity: 0; transform: translateY(3px) scale(0.92); }
    14% { opacity: 1; transform: translateY(0) scale(1); }
    72% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-3px) scale(1); }
`;

/** A bar of the ladder grows out of the baseline. */
export const growIn = keyframes`
    from { opacity: 0; transform: scaleY(0.55); }
    to { opacity: 1; transform: scaleY(1); }
`;

/** The code is uncovered from left to right, once, when the third run is done. */
export const uncover = keyframes`
    from { clip-path: inset(0 100% 0 0); }
    to { clip-path: inset(0 0 0 0); }
`;

/** A strike lands like a stamp: slightly too big, then to size. */
export const stampIn = keyframes`
    from { transform: scale(1.35); }
    to { transform: scale(1); }
`;

export const softIn = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
`;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotion(listener: () => void) {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
}

/** True when the visitor has asked their device for less motion. */
export function useReducedMotion(): boolean {
    return useSyncExternalStore(
        subscribeToMotion,
        () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
        () => false,
    );
}

/** Counts from the last value shown to the new one, so a change in score reads as a climb or a drop. */
export function useAnimatedNumber(value: number, durationMs = 420): number {
    const [shown, setShown] = useState(value);
    const shownRef = useRef(value);

    useEffect(() => {
        const from = shownRef.current;
        if (from === value) {
            return;
        }
        const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const progress = reduced ? 1 : Math.min(1, (now - start) / durationMs);
            const next = Math.round(from + (value - from) * (1 - (1 - progress) ** 4));
            shownRef.current = next;
            setShown(next);
            if (progress < 1) {
                frame = requestAnimationFrame(step);
            }
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, durationMs]);

    return shown;
}

/** True while the element is on screen and the tab is in front. Loops use it to rest. */
export function useOnScreen<T extends Element>(): [React.RefObject<T | null>, boolean] {
    const ref = useRef<T>(null);
    const [onScreen, setOnScreen] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        let intersecting = false;
        const update = () => setOnScreen(intersecting && document.visibilityState === 'visible');
        const observer = new IntersectionObserver(
            ([entry]) => {
                intersecting = entry.isIntersecting;
                update();
            },
            { threshold: 0.35 },
        );
        observer.observe(element);
        document.addEventListener('visibilitychange', update);
        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', update);
        };
    }, []);

    return [ref, onScreen];
}
