import { Box, Button, Link, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';
import Markdown from 'react-markdown';

const allowedElements = ['p', 'a'];

function useTruncatedElement<T extends HTMLElement>() {
    const [ref, setRef] = useState<T>();
    const [isTruncated, setIsTruncated] = useState(false);
    const [showMore, setShowMore] = useState(false);

    useLayoutEffect(() => {
        const { offsetHeight, scrollHeight } = ref || {};
        setIsTruncated(Boolean(offsetHeight && scrollHeight && offsetHeight < scrollHeight));
    }, [ref]);

    const toggleShowMore = () => setShowMore((prev) => !prev);

    return {
        ref: setRef,
        isTruncated,
        showMore,
        toggleShowMore,
    };
}

interface BioProps {
    bio?: string;
}

const Bio: React.FC<BioProps> = ({ bio }) => {
    const t = useTranslations('profile.info.bio');
    const { ref, isTruncated, showMore, toggleShowMore } = useTruncatedElement();

    if (!bio) {
        return null;
    }

    return (
        <Stack
            spacing={1}
            sx={{
                alignItems: 'center',
            }}
        >
            <Box
                ref={ref}
                sx={{
                    whiteSpace: 'pre-line',
                    textAlign: 'center',

                    ...(!showMore && {
                        lineClamp: { xs: '3' },
                        WebkitLineClamp: { xs: '3' },
                        display: { xs: '-webkit-box' },
                        WebkitBoxOrient: { xs: 'vertical' },
                        overflow: { xs: 'hidden' },
                    }),
                }}
            >
                <Markdown
                    skipHtml
                    allowedElements={allowedElements}
                    components={{
                        p: (props) => <Typography>{props.children}</Typography>,
                        a: (props) => (
                            <Link href={props.href} target='_blank' rel='noreferrer'>
                                {props.children}
                            </Link>
                        ),
                    }}
                >
                    {bio}
                </Markdown>
            </Box>
            {isTruncated && (
                <Button onClick={toggleShowMore} size='small'>
                    {showMore ? t('showLess') : t('showMore')}
                </Button>
            )}
        </Stack>
    );
};

export default Bio;
