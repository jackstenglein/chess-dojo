import Board from '@/board/Board';
import { Move } from '@jackstenglein/chess';
import { Box, Link, Stack, SxProps, Typography, useTheme } from '@mui/material';
import { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChessContext, useChess } from '../PgnBoard';

const allowedElements = [
    'code',
    'p',
    'pre',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'strong',
    'em',
    'del',
    'hr',
    'img',
];

interface MarkdownProps {
    text: string;
    inline?: boolean;
    move?: Move;
}

const Markdown: React.FC<MarkdownProps> = ({ text, inline, move }) => {
    const theme = useTheme();
    const { chess, orientation } = useChess();

    text = text.trim();
    if (text.length === 0) {
        return null;
    }

    const components = inline ? text.split(/\n\S*\n/) : [text];
    return components.map((t, index) =>
        t.trim().length === 0 ? (
            <div key={index} style={{ height: '14px' }} />
        ) : (
            <ReactMarkdown
                key={index}
                skipHtml
                remarkPlugins={[remarkGfm]}
                allowedElements={allowedElements}
                components={{
                    code: (props) => <Text inline={inline}>{props.children}</Text>,
                    p: (props) => (
                        <Text inline={inline} first={inline && index === 0}>
                            {props.children}
                        </Text>
                    ),
                    pre: (props) => <>{props.children}</>,
                    a: (props) => (
                        <Link
                            href={props.href}
                            target='_blank'
                            rel='noreferrer'
                            sx={{ wordBreak: 'break-all' }}
                        >
                            {props.children}
                        </Link>
                    ),
                    h1: (props) => <Text {...props} inline={inline} fontSize='1.25rem' />,
                    h2: (props) => <Text {...props} inline={inline} fontSize='1.1875rem' />,
                    h3: (props) => <Text {...props} inline={inline} fontSize='1.125rem' />,
                    h4: (props) => <Text {...props} inline={inline} fontSize='1.0625rem' />,
                    h5: (props) => <Text {...props} inline={inline} fontSize='1rem' />,
                    h6: (props) => <Text {...props} inline={inline} fontSize='0.9375rem' />,
                    ul: (props) => (
                        <ul
                            style={{
                                margin: '4px 0',
                                paddingLeft: '24px',
                                fontSize: '0.875rem',
                            }}
                        >
                            {props.children}
                        </ul>
                    ),
                    ol: (props) => (
                        <ol
                            style={{
                                margin: '4px 0',
                                paddingLeft: '26px',
                                fontSize: '0.875rem',
                            }}
                        >
                            {props.children}
                        </ol>
                    ),
                    li: (props) => <li>{props.children}</li>,
                    blockquote: (props) => (
                        <blockquote
                            style={{
                                margin: '6px 10px',
                                borderLeft: `0.25em solid ${theme.palette.divider}`,
                            }}
                        >
                            {props.children}
                        </blockquote>
                    ),
                    img: (props) => (
                        <Stack
                            sx={{
                                width: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 0.95,
                                    aspectRatio: '1/1',
                                    maxWidth: '300px',
                                }}
                            >
                                <ChessContext.Provider value={{}}>
                                    <Board
                                        config={{
                                            fen: props.alt || chess?.fen(move),
                                            viewOnly: true,
                                            orientation,
                                        }}
                                    />
                                </ChessContext.Provider>
                            </Box>
                        </Stack>
                    ),
                }}
            >
                {t}
            </ReactMarkdown>
        ),
    );
};

function Text(props: {
    inline?: boolean;
    first?: boolean;
    p?: string;
    fontSize?: string;
    children?: ReactNode;
}) {
    let sx: SxProps | undefined;
    if (props.inline) {
        if (props.first) {
            sx = {
                lineHeight: '1.43',
                display: 'inline',
            };
        } else {
            sx = {
                lineHeight: '1.43',
                marginLeft: 0,
                paddingLeft: 0,
            };
        }
    }

    return (
        <Typography
            variant={props.inline ? 'caption' : 'body2'}
            component='p'
            sx={{
                mx: props.inline ? '4px' : undefined,
                color: 'text.secondary',
                p: props.p || '6px',
                whiteSpace: 'pre-line',
                fontSize: props.fontSize,
                ...sx,
                wordBreak: 'break-word',
            }}
        >
            {props.children}
        </Typography>
    );
}

export default Markdown;
