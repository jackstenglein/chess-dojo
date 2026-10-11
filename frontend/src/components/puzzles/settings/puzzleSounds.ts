/*
 * The sounds of the puzzle trainer, made on the spot with the Web Audio API so there is nothing to
 * download. Every sound is soft enough to never startle, and does nothing where audio is
 * unavailable or the browser has not allowed it yet.
 */

export interface SoundOption<Id extends string> {
    id: Id;
    label: string;
}

export type SolvedSoundId =
    'off' | 'chord' | 'pair' | 'sparkle' | 'bell' | 'ding' | 'fifth' | 'sixth';

export const DEFAULT_SOLVED_SOUND: SolvedSoundId = 'chord';

export const SOLVED_SOUNDS: SoundOption<SolvedSoundId>[] = [
    { id: 'chord', label: 'Warm chord' },
    { id: 'fifth', label: 'Rising fifth' },
    { id: 'sixth', label: 'Sixth up' },
    { id: 'pair', label: 'Rising pair' },
    { id: 'sparkle', label: 'Sparkle run' },
    { id: 'bell', label: 'Soft bell' },
    { id: 'ding', label: 'Classic ding' },
    { id: 'off', label: 'Off' },
];

/** A note: pitch in Hz, when it starts after the sound does (s), how long it rings (s), loudness. */
type Note = readonly [
    frequency: number,
    at: number,
    ring: number,
    peak: number,
    type?: OscillatorType,
];

/** A bell: a note with the overtones of metal, which fade faster than the note itself. */
function bellNotes(frequency: number, at: number, ring: number, peak: number): Note[] {
    return [
        [frequency, at, ring, peak],
        [frequency * 2.76, at, ring * 0.4, peak * 0.22],
        [frequency * 5.4, at, ring * 0.2, peak * 0.1],
    ];
}

/** The notes of each solved sound. */
export const SOLVED_NOTES: Record<Exclude<SolvedSoundId, 'off'>, readonly Note[]> = {
    chord: [523.25, 659.25, 783.99, 1046.5].map((f, i) => [f, i * 0.025, 0.9, 0.06] as const),
    pair: [
        [783.99, 0, 0.55, 0.11],
        [1567.98, 0, 0.55, 0.03],
        [1046.5, 0.11, 0.55, 0.11],
        [2093, 0.11, 0.55, 0.03],
    ],
    sparkle: [1046.5, 1318.5, 1568, 2093].flatMap((f, i) => [
        [f, i * 0.07, 0.45, 0.08] as const,
        [f * 2, i * 0.07, 0.3, 0.015] as const,
    ]),
    bell: [
        [1318.5, 0, 1.1, 0.12],
        [1318.5 * 2.76, 0, 0.5, 0.025],
        [1318.5 * 5.4, 0, 0.25, 0.012],
    ],
    // Two bells a fifth apart, one after the other: da-DING.
    fifth: [...bellNotes(784, 0, 0.18, 0.1), ...bellNotes(1175, 0.09, 0.5, 0.12)],
    // A warm note, then a bell a major sixth above it.
    sixth: [[659, 0, 0.14, 0.09, 'triangle'], ...bellNotes(1047, 0.08, 0.5, 0.11)],
    // One clean bell: a bright note with the overtones of metal, ringing out quickly.
    ding: [
        [1568, 0, 0.8, 0.14],
        [1568 * 2.76, 0, 0.35, 0.03],
        [1568 * 5.4, 0, 0.15, 0.015],
    ],
};

interface Sweep {
    filter: BiquadFilterType;
    from: number;
    to: number;
    q: number;
    /** Seconds. */
    duration: number;
    peak: number;
    /** How far through the sound the loudest point comes, 0 to 1. */
    attack: number;
    /** An optional low tone under the air. */
    hum?: number;
}

/** The deep sweep: lowpass-filtered noise opening up, with a low hum under it. */
export const WHOOSH: Sweep = {
    filter: 'lowpass',
    from: 300,
    to: 2200,
    q: 2,
    duration: 0.42,
    peak: 0.3,
    attack: 0.5,
    hum: 180,
};

let context: AudioContext | undefined;

/** Returns the shared audio context, or undefined where audio is unavailable. */
function audio(): AudioContext | undefined {
    const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
        return undefined;
    }
    context ??= new AudioContextClass();
    void context.resume();
    return context;
}

function playNote(a: AudioContext, [frequency, at, ring, peak, type]: Note) {
    const start = a.currentTime + at;
    const oscillator = a.createOscillator();
    const gain = a.createGain();
    oscillator.type = type ?? 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + ring);
    oscillator.connect(gain).connect(a.destination);
    oscillator.start(start);
    oscillator.stop(start + ring + 0.05);
}

/** Plays the chosen sound for solving a puzzle. */
export function playSolvedSound(id: SolvedSoundId): void {
    if (id === 'off') return;
    try {
        const a = audio();
        // A saved choice that is no longer offered, like the old Level up, plays the default.
        const notes = (SOLVED_NOTES[id] ?? SOLVED_NOTES.chord) as readonly Note[] | undefined;
        if (a && notes) {
            for (const note of notes) playNote(a, note);
        }
    } catch {
        // No sound is better than an error in the middle of a puzzle.
    }
}

/** Plays the whoosh for moving on to the next defense. */
export function playWhoosh(): void {
    try {
        const a = audio();
        const sweep = WHOOSH;
        if (!a) return;

        const now = a.currentTime;
        const length = Math.floor(a.sampleRate * (sweep.duration + 0.1));
        const buffer = a.createBuffer(1, length, a.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

        const source = a.createBufferSource();
        const filter = a.createBiquadFilter();
        const gain = a.createGain();
        source.buffer = buffer;
        filter.type = sweep.filter;
        filter.Q.value = sweep.q;
        filter.frequency.setValueAtTime(sweep.from, now);
        filter.frequency.exponentialRampToValueAtTime(sweep.to, now + sweep.duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(sweep.peak, now + sweep.duration * sweep.attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + sweep.duration);
        source.connect(filter).connect(gain).connect(a.destination);
        source.start(now);
        source.stop(now + sweep.duration + 0.1);

        if (sweep.hum) playNote(a, [sweep.hum, 0, 0.3, 0.03]);
    } catch {
        // No sound is better than an error in the middle of a puzzle.
    }
}
