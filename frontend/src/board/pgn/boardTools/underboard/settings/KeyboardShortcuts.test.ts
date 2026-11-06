import { Chess, CommentType } from '@jackstenglein/chess';
import { describe, expect, it, vi } from 'vitest';
import { keyboardShortcutHandlers, matchAction } from './KeyboardShortcuts';
import { KeyBinding, ShortcutAction, ShortcutBindings } from './ShortcutAction';

describe('delete remaining moves shortcut', () => {
    it('uses ] for existing saved bindings that predate the new action', () => {
        const saved = { ...ShortcutBindings.default } as Partial<
            Record<ShortcutAction, KeyBinding>
        >;
        saved[ShortcutAction.DeleteRemainingMoves] = undefined;
        expect(matchAction(saved as Record<ShortcutAction, KeyBinding>, 'BracketRight', {})).toBe(
            ShortcutAction.DeleteRemainingMoves,
        );
    });

    it('respects a custom binding and an explicitly removed binding', () => {
        const custom = {
            ...ShortcutBindings.default,
            [ShortcutAction.DeleteRemainingMoves]: { modifier: 'Control', key: 'x' },
        };
        expect(matchAction(custom, 'BracketRight', {})).toBeUndefined();
        expect(matchAction(custom, 'X', { Control: true })).toBe(
            ShortcutAction.DeleteRemainingMoves,
        );
        expect(matchAction(custom, 'X', {})).toBeUndefined();
        expect(
            matchAction(
                { ...custom, [ShortcutAction.DeleteRemainingMoves]: { modifier: '', key: '' } },
                'BracketRight',
                {},
            ),
        ).toBeUndefined();
    });
});

describe('text after move shortcut', () => {
    it('defaults Enter for older settings and explicitly requests the after-move editor', () => {
        const saved = { ...ShortcutBindings.default } as Partial<
            Record<ShortcutAction, KeyBinding>
        >;
        saved[ShortcutAction.TextAfterMove] = undefined;
        expect(matchAction(saved as Record<ShortcutAction, KeyBinding>, 'Enter', {})).toBe(
            ShortcutAction.TextAfterMove,
        );
        const focusEditor = vi.fn();
        keyboardShortcutHandlers[ShortcutAction.TextAfterMove]({
            opts: { underboardApi: { focusEditor } as never },
        });
        expect(focusEditor).toHaveBeenCalledWith(CommentType.After);
    });
});

describe('next variation shortcut', () => {
    it('defaults to Down Arrow and navigates through sibling variations', () => {
        expect(matchAction(ShortcutBindings.default, 'ArrowDown', {})).toBe(
            ShortcutAction.NextVariation,
        );
        const chess = new Chess({ pgn: '1. e4 (1. d4 d5) (1. c4 e5) e5' });
        chess.seek(chess.firstMove());
        const handler = keyboardShortcutHandlers[ShortcutAction.NextVariation];
        handler({ chess });
        expect(chess.currentMove()?.san).toBe('d4');
        handler({ chess });
        expect(chess.currentMove()?.san).toBe('c4');
    });
});
