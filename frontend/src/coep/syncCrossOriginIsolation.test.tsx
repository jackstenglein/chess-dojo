import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncCrossOriginIsolation, useCoepMode } from './syncCrossOriginIsolation';

vi.mock('next/navigation', () => ({
    usePathname: () => '/courses/OPENING/course/0/0',
}));

function setIsolated(isolated: boolean) {
    Object.defineProperty(window, 'crossOriginIsolated', {
        configurable: true,
        value: isolated,
    });
}

describe('syncCrossOriginIsolation', () => {
    afterEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it('reloads when a video page is still isolated', () => {
        setIsolated(true);
        const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => undefined);

        syncCrossOriginIsolation(true, '/courses/OPENING/course/0/0');

        expect(reload).toHaveBeenCalledOnce();
        expect(sessionStorage.getItem('coep-reloaded:/courses/OPENING/course/0/0')).toBe('1');
    });

    it('does not reload again when the server header still disagrees', () => {
        setIsolated(true);
        const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => undefined);
        sessionStorage.setItem('coep-reloaded:/courses/OPENING/course/0/0', '1');

        syncCrossOriginIsolation(true, '/courses/OPENING/course/0/0');

        expect(reload).not.toHaveBeenCalled();
    });

    it('leaves a matching document in place and clears a stale marker', () => {
        setIsolated(false);
        const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => undefined);
        sessionStorage.setItem('coep-reloaded:/blog/post', '1');

        syncCrossOriginIsolation(true, '/blog/post');

        expect(reload).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('coep-reloaded:/blog/post')).toBeNull();
    });
});

describe('useCoepMode', () => {
    afterEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it('waits to reload until the course page leaves the pending state', () => {
        setIsolated(true);
        const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => undefined);
        const hook = renderHook(({ mode }) => useCoepMode(mode), {
            initialProps: { mode: 'pending' as 'pending' | 'video' },
        });

        expect(reload).not.toHaveBeenCalled();

        hook.rerender({ mode: 'video' });

        expect(reload).toHaveBeenCalledOnce();
    });
});
