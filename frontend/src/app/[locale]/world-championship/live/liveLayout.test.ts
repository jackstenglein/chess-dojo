import { describe, expect, it } from 'vitest';
import { parseLayout, resolveLayout } from './liveLayout';

describe('parseLayout', () => {
    it('keeps the three layouts', () => {
        expect(parseLayout('stream')).toBe('stream');
        expect(parseLayout('analysis')).toBe('analysis');
        expect(parseLayout('analysis2')).toBe('analysis2');
    });

    it('drops anything else', () => {
        expect(parseLayout(undefined)).toBeNull();
        expect(parseLayout('')).toBeNull();
        expect(parseLayout('sideways')).toBeNull();
    });
});

describe('resolveLayout', () => {
    it('gives a viewer the stream view, whatever was saved', () => {
        expect(resolveLayout(null, false)).toBe('stream');
        expect(resolveLayout('analysis', false)).toBe('stream');
        expect(resolveLayout('analysis2', false)).toBe('stream');
    });

    it('starts a sensei on the analysis view', () => {
        expect(resolveLayout(null, true)).toBe('analysis');
    });

    it('keeps the view a sensei chose', () => {
        expect(resolveLayout('stream', true)).toBe('stream');
        expect(resolveLayout('analysis', true)).toBe('analysis');
        expect(resolveLayout('analysis2', true)).toBe('analysis2');
    });
});
