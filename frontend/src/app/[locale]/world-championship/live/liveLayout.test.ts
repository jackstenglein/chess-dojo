import { describe, expect, it } from 'vitest';
import { resolveLayout } from './liveLayout';

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
