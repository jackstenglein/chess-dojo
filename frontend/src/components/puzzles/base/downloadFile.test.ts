import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadText } from './downloadFile';

afterEach(() => vi.restoreAllMocks());

describe('downloadText', () => {
    it('clicks a download link with the file name, then cleans up', () => {
        const create = vi.fn(() => 'blob:abc');
        const revoke = vi.fn();
        Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
        const clicked: { href: string; download: string }[] = [];
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
            this: HTMLAnchorElement,
        ) {
            clicked.push({ href: this.href, download: this.download });
        });

        downloadText('puzzles.pgn', '1. e4 *');

        expect(create).toHaveBeenCalledTimes(1);
        expect(clicked).toEqual([{ href: 'blob:abc', download: 'puzzles.pgn' }]);
        expect(revoke).toHaveBeenCalledWith('blob:abc');
        expect(document.querySelector('a[download]')).toBeNull();
    });
});
