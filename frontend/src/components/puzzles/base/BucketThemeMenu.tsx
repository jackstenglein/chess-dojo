'use client';

import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Check, ChevronRight, DeleteOutlined } from '@mui/icons-material';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popover,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { MouseEvent, ReactNode, useRef, useState } from 'react';
import { bucketColor } from './bucketStyle';
import { TagCounts } from './tagCounts';

const BUCKET_LIST_WIDTH = 190;
const THEME_LIST_WIDTH = 240;
const THEME_LIST_MAX_HEIGHT = 340;
/** Space to keep between the themes flyout and the edge of the window, in px. */
const EDGE_MARGIN = 8;

interface BucketThemeMenuProps {
    taxonomy: PuzzlebaseTaxonomy;
    selectedBuckets: string[];
    selectedThemes: string[];
    /** How many puzzles have each bucket and theme. Shown next to each entry. */
    counts: TagCounts;
    onToggleBucket: (bucket: string) => void;
    /** Called with the theme and the bucket it was picked under, since a theme can be in several. */
    onToggleTheme: (theme: string, bucket: string) => void;
    /** If provided, the themes flyout has a field to create a new theme in the hovered bucket. */
    onCreateTheme?: (bucket: string, theme: string) => void;
    /** If provided (for puzzle admins), each theme has a delete button that asks first. */
    onDeleteTheme?: (bucket: string, theme: string) => void;
    /** Renders the element that opens the menu. */
    renderTrigger: (props: { onClick: (e: MouseEvent<HTMLElement>) => void }) => ReactNode;
}

/**
 * A menu that shows only the buckets at first. Hovering a bucket opens its themes in a flyout
 * beside the menu. Clicking a bucket toggles the bucket itself; clicking a theme toggles the theme.
 *
 * The menu is pinned to where it opened and the flyout floats beside it, so nothing the user does
 * inside the menu (adding a tag, hovering another bucket) can move the menu out from under the
 * pointer. Adding a tag can grow the row the menu was opened from, which used to make it jump.
 */
export function BucketThemeMenu({
    taxonomy,
    selectedBuckets,
    selectedThemes,
    counts,
    onToggleBucket,
    onToggleTheme,
    onCreateTheme,
    onDeleteTheme,
    renderTrigger,
}: BucketThemeMenuProps) {
    const [open, setOpen] = useState(false);
    // Where the menu opened. Kept after closing so the menu does not jump while it fades out.
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [active, setActive] = useState<string>();
    const [flyout, setFlyout] = useState({ above: false, leftward: false });
    const [newTheme, setNewTheme] = useState('');
    const [deleting, setDeleting] = useState<{ bucket: string; theme: string }>();
    const menuRef = useRef<HTMLDivElement>(null);

    const close = () => {
        setOpen(false);
        setActive(undefined);
        setNewTheme('');
    };

    /** Opens the themes flyout for a bucket, on whichever side has room for it. */
    const showThemes = (bucket: string) => {
        setActive(bucket);
        const rect = menuRef.current?.getBoundingClientRect();
        if (rect) {
            setFlyout({
                above: rect.top + THEME_LIST_MAX_HEIGHT > window.innerHeight - EDGE_MARGIN,
                leftward: rect.right + THEME_LIST_WIDTH > window.innerWidth - EDGE_MARGIN,
            });
        }
    };

    const submitNewTheme = () => {
        const theme = newTheme.trim();
        if (theme && active && onCreateTheme) {
            onCreateTheme(active, theme);
            setNewTheme('');
        }
    };

    return (
        <>
            {renderTrigger({
                onClick: (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPosition({ top: rect.bottom, left: rect.left });
                    setOpen(true);
                },
            })}
            <Popover
                open={open}
                onClose={close}
                anchorReference='anchorPosition'
                anchorPosition={position}
                // Let the flyout extend past the menu's edge.
                slotProps={{ paper: { sx: { overflow: 'visible' } } }}
            >
                <Box ref={menuRef} sx={{ position: 'relative', width: BUCKET_LIST_WIDTH }}>
                    <List dense aria-label='Buckets'>
                        {Object.keys(taxonomy.buckets).map((bucket) => {
                            const selected = selectedBuckets.includes(bucket);
                            return (
                                <ListItemButton
                                    key={bucket}
                                    selected={bucket === active}
                                    onMouseEnter={() => showThemes(bucket)}
                                    onClick={() => {
                                        showThemes(bucket);
                                        onToggleBucket(bucket);
                                    }}
                                    sx={{ borderLeft: `3px solid ${bucketColor(bucket)}` }}
                                >
                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                        {selected && <Check fontSize='small' />}
                                    </ListItemIcon>
                                    <ListItemText primary={bucket} />
                                    <Count value={counts.buckets[bucket]} />
                                    <ChevronRight fontSize='small' />
                                </ListItemButton>
                            );
                        })}
                    </List>

                    {active && (
                        <Paper
                            elevation={8}
                            sx={{
                                position: 'absolute',
                                width: THEME_LIST_WIDTH,
                                maxHeight: THEME_LIST_MAX_HEIGHT,
                                overflowY: 'auto',
                                ...(flyout.above ? { bottom: 0 } : { top: 0 }),
                                ...(flyout.leftward ? { right: '100%' } : { left: '100%' }),
                            }}
                        >
                            <List dense aria-label={`${active} themes`}>
                                {sortThemes(taxonomy.buckets[active] ?? []).map((theme) => (
                                    <ListItemButton
                                        key={theme}
                                        onClick={() => onToggleTheme(theme, active)}
                                    >
                                        <ListItemIcon sx={{ minWidth: 28 }}>
                                            {selectedThemes.includes(theme) && (
                                                <Check fontSize='small' />
                                            )}
                                        </ListItemIcon>
                                        <ListItemText primary={theme} />
                                        <Count value={counts.themes[theme]} />
                                        {onDeleteTheme && (
                                            <IconButton
                                                size='small'
                                                edge='end'
                                                aria-label={`Delete theme ${theme}`}
                                                sx={{ ml: 0.5 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleting({ bucket: active, theme });
                                                }}
                                            >
                                                <DeleteOutlined fontSize='small' />
                                            </IconButton>
                                        )}
                                    </ListItemButton>
                                ))}
                            </List>
                            {onCreateTheme && (
                                <>
                                    <Divider />
                                    <Stack direction='row' sx={{ p: 1, gap: 1 }}>
                                        <TextField
                                            size='small'
                                            placeholder={`New ${active} theme`}
                                            value={newTheme}
                                            onChange={(e) => setNewTheme(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') submitNewTheme();
                                            }}
                                            sx={{ flexGrow: 1 }}
                                        />
                                        <Button
                                            size='small'
                                            onClick={submitNewTheme}
                                            disabled={!newTheme.trim()}
                                        >
                                            Add
                                        </Button>
                                    </Stack>
                                </>
                            )}
                        </Paper>
                    )}
                </Box>
            </Popover>
            {deleting && (
                <Dialog open onClose={() => setDeleting(undefined)}>
                    <DialogTitle>Delete the theme &ldquo;{deleting.theme}&rdquo;?</DialogTitle>
                    <DialogContent>
                        <Typography>
                            It is removed from {deleting.bucket}
                            {bucketsListing(taxonomy, deleting.theme) > 1
                                ? ', and stays under the other buckets that list it.'
                                : `, and from the ${counts.themes[deleting.theme] ?? 0} puzzle(s) that have it. This cannot be undone.`}{' '}
                            The deletion is written to the admin log.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button color='inherit' onClick={() => setDeleting(undefined)}>
                            Cancel
                        </Button>
                        <Button
                            color='error'
                            variant='contained'
                            onClick={() => {
                                onDeleteTheme?.(deleting.bucket, deleting.theme);
                                setDeleting(undefined);
                                close();
                            }}
                        >
                            Delete theme
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
}

/** How many buckets list the theme. */
function bucketsListing(taxonomy: PuzzlebaseTaxonomy, theme: string): number {
    return Object.values(taxonomy.buckets).filter((themes) => themes.includes(theme)).length;
}

/** Returns a copy of the themes in alphabetical order, ignoring case. */
export function sortThemes(themes: string[]): string[] {
    return [...themes].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** A muted puzzle count shown at the right of a menu entry. Zero is shown dimmer. */
function Count({ value = 0 }: { value?: number }) {
    return (
        <Typography
            variant='body2'
            color='text.secondary'
            sx={{ ml: 2, minWidth: 20, textAlign: 'right', opacity: value === 0 ? 0.5 : 1 }}
        >
            {value}
        </Typography>
    );
}
