import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamEmbed, TWITCH_CHANNEL, YOUTUBE_CHANNEL_ID } from './StreamEmbed';

const player = (name: string) => screen.getByTitle<HTMLIFrameElement>(`ChessDojo on ${name}`);

describe('StreamEmbed', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('plays the Twitch stream first, with this page as its parent', () => {
        render(<StreamEmbed />);
        const src = new URL(player('Twitch').src);
        expect(src.host).toBe('player.twitch.tv');
        expect(src.searchParams.get('channel')).toBe(TWITCH_CHANNEL);
        expect(src.searchParams.get('parent')).toBe(window.location.hostname);
        expect(screen.getByRole('link', { name: 'Open on Twitch' })).toBeDefined();
    });

    it('switches to the live stream of the YouTube channel', () => {
        render(<StreamEmbed />);
        fireEvent.click(screen.getByRole('button', { name: 'YouTube' }));

        const src = new URL(player('YouTube').src);
        expect(src.host).toBe('www.youtube.com');
        expect(src.pathname).toBe('/embed/live_stream');
        expect(src.searchParams.get('channel')).toBe(YOUTUBE_CHANNEL_ID);
        expect(screen.queryByTitle('ChessDojo on Twitch')).toBeNull();
        expect(screen.getByRole('link', { name: 'Open on YouTube' })).toBeDefined();
    });

    it('remembers the choice for the next visit', () => {
        const first = render(<StreamEmbed />);
        fireEvent.click(screen.getByRole('button', { name: 'YouTube' }));
        first.unmount();

        render(<StreamEmbed />);
        expect(player('YouTube')).toBeDefined();
    });

    it('can be minimized, which stops the player, and shown again', () => {
        render(<StreamEmbed minimizable />);
        fireEvent.click(screen.getByRole('button', { name: 'Minimize the stream' }));
        expect(screen.queryByTitle('ChessDojo on Twitch')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Show the stream' }));
        expect(player('Twitch')).toBeDefined();
    });

    it('shows a minimized stream on a phone on its side, which has no header to show it', () => {
        localStorage.setItem('wcLive.streamMinimized', 'true');
        vi.stubGlobal('matchMedia', (query: string) => ({
            matches: query.includes('orientation: landscape'),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        }));

        render(<StreamEmbed minimizable />);
        expect(player('Twitch')).toBeDefined();
    });

    it('has no minimize button unless asked for one', () => {
        render(<StreamEmbed />);
        expect(screen.queryByRole('button', { name: 'Minimize the stream' })).toBeNull();
    });
});
