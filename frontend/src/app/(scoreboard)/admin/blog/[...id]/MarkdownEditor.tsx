'use client';

import { BlogListItem } from '@/app/(blog)/blog/BlogListItem';
import { GameViewer } from '@/app/(blog)/blog/player-spotlight/GameViewer';
import { Link } from '@/components/navigation/Link';
import { Box, Container, Stack, Tab, Tabs, TextField, Typography, useTheme } from '@mui/material';
import { SyntheticEvent, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from '../../../../(blog)/blog/common/Header';

const GAME_LINK_PREFIX = '/game:';

type EditorMode = 'write' | 'preview' | 'syntax' | 'list';

export interface MarkdownEditorProps {
    /** Current markdown content. */
    value: string;
    /** Called when the user changes the content (write mode only). */
    onChange?: (value: string) => void;
    /** Placeholder when the editor is empty. */
    placeholder?: string;
    /** Minimum height of the editor and preview area in pixels. */
    minHeight?: number;
    /** Whether the editor is disabled. */
    disabled?: boolean;
    /** Blog title shown above the content in Preview. */
    title?: string;
    /** Blog subtitle shown above the content in Preview. */
    subtitle?: string;
    /** Short description shown in the List preview tab and on the blog list page. */
    description?: string;
    /** Optional cover image URL shown in the List preview tab and on the blog list page. */
    coverImage?: string;
    /** Publication date (e.g. ISO date string) shown in the List preview tab subheader. */
    date?: string;
}

/**
 * Renders a markdown text editor with Write and Preview tabs. In Write mode the user
 * types markdown; in Preview mode the content is rendered as it will appear when published.
 */
export function MarkdownEditor({
    value,
    onChange,
    placeholder = 'Write your blog post in markdown...',
    minHeight = 320,
    disabled = false,
    title,
    subtitle,
    description,
    coverImage,
    date,
}: MarkdownEditorProps) {
    const [mode, setMode] = useState<EditorMode>('write');
    const theme = useTheme();

    const handleTabChange = (_: SyntheticEvent, newValue: EditorMode) => {
        setMode(newValue);
    };

    return (
        <Stack spacing={2}>
            <Tabs value={mode} onChange={handleTabChange} sx={{ minHeight: 40 }}>
                <Tab label='Write' value='write' />
                <Tab label='Preview' value='preview' />
                <Tab label='List preview' value='list' />
                <Tab label='Syntax' value='syntax' />
            </Tabs>

            {mode === 'write' ? (
                <TextField
                    data-testid='markdown-editor'
                    multiline
                    fullWidth
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    minRows={12}
                    maxRows={32}
                    sx={{
                        '& .MuiInputBase-root': {
                            minHeight,
                            alignItems: 'flex-start',
                        },
                        '& .MuiInputBase-input': {
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            lineHeight: 1.6,
                        },
                    }}
                />
            ) : mode === 'list' ? (
                <Box
                    data-testid='markdown-list-preview'
                    sx={{
                        minHeight,
                        px: 2,
                        py: 2,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: 'auto',
                    }}
                >
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        How this post appears on the blog list page:
                    </Typography>
                    <Container maxWidth='sm' disableGutters>
                        <BlogListItem blog={{ title, subtitle, date, description, coverImage }} />
                    </Container>
                </Box>
            ) : mode === 'syntax' ? (
                <Box
                    sx={{
                        minHeight,
                        px: 2,
                        py: 2,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: 'auto',
                    }}
                >
                    <MarkdownSyntaxHelp />
                </Box>
            ) : (
                <Box
                    sx={{
                        minHeight,
                        px: 2,
                        py: 2,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: 'auto',
                    }}
                >
                    <Container maxWidth='md'>
                        <Header title={title} subtitle={subtitle} />

                        {value.trim() ? (
                            <BlogMarkdown>{value}</BlogMarkdown>
                        ) : (
                            <Typography color='text.secondary' fontStyle='italic'>
                                Nothing to preview. Switch to Write to add content.
                            </Typography>
                        )}
                    </Container>
                </Box>
            )}
        </Stack>
    );
}

/** Instructions for markdown syntax shown in the Syntax tab. */
function MarkdownSyntaxHelp() {
    const code = (s: string) => (
        <Box
            component='code'
            sx={{
                px: 0.5,
                py: 0.25,
                fontFamily: 'monospace',
                fontSize: '0.85em',
                bgcolor: 'background.paper',
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            {s}
        </Box>
    );

    return (
        <Stack spacing={2.5}>
            <Typography variant='subtitle1' fontWeight={600}>
                Markdown syntax reference
            </Typography>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Headings
                </Typography>
                <Typography
                    variant='body2'
                    component='div'
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                    {'# Heading 1\n## Heading 2\n### Heading 3'}
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Bold and italic
                </Typography>
                <Typography variant='body2'>
                    {code('**bold**')} or {code('__bold__')} · {code('*italic*')} or{' '}
                    {code('_italic_')}
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Links
                </Typography>
                <Typography
                    variant='body2'
                    component='div'
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                    {'[link text](https://example.com)'}
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Images
                </Typography>
                <Typography
                    variant='body2'
                    component='div'
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                    {'![alt text](image-url)'}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    Use an exclamation mark before the brackets. Alt text is shown if the image
                    cannot load.
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    YouTube videos
                </Typography>
                <Typography
                    variant='body2'
                    component='div'
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                    {'[Watch here](https://www.youtube.com/watch?v=VIDEO_ID)'}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    A link to a YouTube video (watch, embed, or youtu.be URL) is rendered as an
                    embedded player.
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Game viewer
                </Typography>
                <Typography
                    variant='body2'
                    component='div'
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                    [View game]({GAME_LINK_PREFIX}cohortId/gameId)
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    A link with URL {code(`${GAME_LINK_PREFIX}cohortId/gameId`)} (cohort and game ID
                    from the Dojo) is rendered as an embedded interactive game viewer. Replace
                    cohortId and gameId with the actual cohort and game IDs. Note that the leading
                    slash is required.
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Lists
                </Typography>
                <Typography
                    variant='body2'
                    component='div'
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                    {'- bullet item\n- another item\n\n1. first\n2. second'}
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Code
                </Typography>
                <Typography variant='body2'>
                    Inline: {code('`code`')} · Block: wrap in three backticks on their own lines
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Blockquote
                </Typography>
                <Typography
                    variant='body2'
                    component='div'
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                    {'> quoted text'}
                </Typography>
            </Box>

            <Box>
                <Typography variant='body2' fontWeight={600} color='text.secondary' gutterBottom>
                    Horizontal rule
                </Typography>
                <Typography variant='body2' component='div' sx={{ fontFamily: 'monospace' }}>
                    ---
                </Typography>
            </Box>

            <Typography variant='body2' color='text.secondary'>
                Leave a blank line between paragraphs and between blocks (headings, lists, etc.).
            </Typography>
        </Stack>
    );
}

/** Parses game:cohort/id href into { cohort, id } for GameViewer, or undefined if not a game link. */
function getGameViewerParams(href: string | undefined): { cohort: string; id: string } | undefined {
    if (!href?.startsWith(GAME_LINK_PREFIX)) {
        return undefined;
    }
    const rest = href.slice(GAME_LINK_PREFIX.length).trim();
    const slash = rest.indexOf('/');
    if (slash <= 0) {
        return undefined;
    }
    const cohort = rest.slice(0, slash).trim();
    const id = rest.slice(slash + 1).trim();
    return cohort && id ? { cohort, id } : undefined;
}

/** Extracts YouTube video ID from watch, embed, or short URLs. */
function getYouTubeVideoId(href: string | undefined): string | null {
    if (!href) return null;
    try {
        const url = new URL(href);
        if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
            if (url.pathname === '/watch' && url.searchParams.has('v')) {
                return url.searchParams.get('v');
            }
            const embedMatch = /^\/embed\/([a-zA-Z0-9_-]+)/.exec(url.pathname);
            if (embedMatch) return embedMatch[1];
        }
        if (url.hostname === 'youtu.be') {
            const id = url.pathname.slice(1).split('/')[0];
            return id || null;
        }
    } catch {
        return null;
    }
    return null;
}

/** Renders markdown with typography and links styled to match published blog posts. */
export function BlogMarkdown({ children }: { children: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                p: (props) => (
                    <Typography mt={2} variant='body1' component='p' sx={{ lineHeight: 1.7 }}>
                        {props.children}
                    </Typography>
                ),
                h1: (props) => (
                    <Typography mt={3} mb={1} variant='h4' component='h1'>
                        {props.children}
                    </Typography>
                ),
                h2: (props) => (
                    <Typography mt={3} mb={1} variant='h5' component='h2'>
                        {props.children}
                    </Typography>
                ),
                h3: (props) => (
                    <Typography mt={2} mb={1} variant='h6' component='h3'>
                        {props.children}
                    </Typography>
                ),
                h4: (props) => (
                    <Typography mt={2} mb={0.5} variant='subtitle1' fontWeight={600} component='h4'>
                        {props.children}
                    </Typography>
                ),
                h5: (props) => (
                    <Typography mt={2} mb={0.5} variant='subtitle2' fontWeight={600} component='h5'>
                        {props.children}
                    </Typography>
                ),
                h6: (props) => (
                    <Typography mt={1.5} mb={0.5} variant='body2' fontWeight={600} component='h6'>
                        {props.children}
                    </Typography>
                ),
                a: (props) => {
                    const gameViewerParams = getGameViewerParams(props.href);
                    if (gameViewerParams) {
                        return (
                            <Box sx={{ my: 2 }}>
                                <GameViewer
                                    cohort={gameViewerParams.cohort}
                                    id={gameViewerParams.id}
                                />
                            </Box>
                        );
                    }
                    const videoId = getYouTubeVideoId(props.href);
                    if (videoId) {
                        return (
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    paddingBottom: '56.25%',
                                    height: 0,
                                    overflow: 'hidden',
                                    my: 2,
                                    borderRadius: 1,
                                }}
                            >
                                <Box
                                    component='iframe'
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title='YouTube video'
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                                    allowFullScreen
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        border: 0,
                                    }}
                                />
                            </Box>
                        );
                    }
                    return (
                        <Link href={props.href ?? '#'} target='_blank' rel='noopener noreferrer'>
                            {props.children}
                        </Link>
                    );
                },
                ul: (props) => (
                    <Box component='ul' sx={{ mt: 1.5, mb: 1.5, pl: 3 }}>
                        {props.children}
                    </Box>
                ),
                ol: (props) => (
                    <Box component='ol' sx={{ mt: 1.5, mb: 1.5, pl: 3 }}>
                        {props.children}
                    </Box>
                ),
                li: (props) => (
                    <Typography component='li' variant='body1' sx={{ mb: 0.5, lineHeight: 1.7 }}>
                        {props.children}
                    </Typography>
                ),
                blockquote: (props) => (
                    <Box
                        component='blockquote'
                        sx={{
                            my: 2,
                            pl: 2,
                            borderLeft: 4,
                            borderColor: 'divider',
                            color: 'text.secondary',
                        }}
                    >
                        <Typography variant='body1' component='span' sx={{ lineHeight: 1.7 }}>
                            {props.children}
                        </Typography>
                    </Box>
                ),
                code: (props) => {
                    const isInline = !props.className;
                    if (isInline) {
                        return (
                            <Box
                                component='code'
                                sx={{
                                    px: 0.5,
                                    py: 0.25,
                                    fontFamily: 'monospace',
                                    fontSize: '0.85em',
                                    bgcolor: 'action.hover',
                                    borderRadius: 0.5,
                                }}
                            >
                                {props.children}
                            </Box>
                        );
                    }
                    return (
                        <Box
                            component='pre'
                            sx={{
                                overflow: 'auto',
                                p: 2,
                                my: 2,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography
                                component='code'
                                variant='body2'
                                sx={{ fontFamily: 'monospace', display: 'block' }}
                            >
                                {props.children}
                            </Typography>
                        </Box>
                    );
                },
                hr: () => (
                    <Box
                        component='hr'
                        sx={{ my: 3, border: 'none', borderTop: 1, borderColor: 'divider' }}
                    />
                ),
                strong: (props) => (
                    <Typography component='strong' fontWeight={700}>
                        {props.children}
                    </Typography>
                ),
                em: (props) => (
                    <Typography component='em' fontStyle='italic'>
                        {props.children}
                    </Typography>
                ),
            }}
        >
            {children}
        </ReactMarkdown>
    );
}
