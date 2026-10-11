import {
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { popularity } from '@jackstenglein/chess-dojo-common/src/puzzlebase/votes';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Fragment, ReactNode } from 'react';
import { AnnotatorLink } from './AnnotatorLink';
import { bucketColor, tagChipSx, themeOutline } from './bucketStyle';
import { groupTags } from './tagGroups';

/**
 * A puzzle's details in a compact box: its number and tags, then a labelled grid with the game,
 * rating, whose turn it is, and where it comes from. Meant to sit above the PGN, on the puzzle
 * page and when a puzzle ends in the trainer.
 */
export function PuzzleInfoPanel({
    puzzle,
    taxonomy,
    hideHeading,
    numberOnly,
    plain,
    afterHeading,
}: {
    puzzle: PuzzlebasePuzzle;
    taxonomy: PuzzlebaseTaxonomy;
    /** Leave out the number and tags, when they are shown somewhere else. */
    hideHeading?: boolean;
    /** Show the number as the title, but not the tags, which are shown somewhere else. */
    numberOnly?: boolean;
    /** No line or space under it, for when something else follows directly. */
    plain?: boolean;
    /** Something to put under the number and tags, such as a button, with a line under it. */
    afterHeading?: ReactNode;
}) {
    const groups = groupTags(taxonomy, puzzle);

    const facts: [string, ReactNode][] = [
        ['Game', gameLine(puzzle)],
        ['Rating', puzzle.rating],
        ['Popularity', popularityText(puzzle)],
        ['Result', puzzle.result],
        ['Source', puzzle.composer],
        [
            'Annotated by',
            <AnnotatorLink
                key='annotator'
                username={puzzle.annotator}
                displayName={puzzle.annotatorDisplayName}
            />,
        ],
    ];

    return (
        <PuzzleInfo
            puzzle={puzzle}
            groups={groups}
            facts={facts}
            hideHeading={hideHeading}
            numberOnly={numberOnly}
            plain={plain}
            afterHeading={afterHeading}
        />
    );
}

/**
 * The puzzle's details, kept quiet to sit above the PGN: its number and tags on one line, the game
 * under it, then the rest as small labelled items in a row. No boxes or fills.
 */
function PuzzleInfo({
    puzzle,
    groups,
    facts,
    hideHeading,
    numberOnly,
    plain,
    afterHeading,
}: {
    puzzle: PuzzlebasePuzzle;
    groups: ReturnType<typeof groupTags>;
    facts: [string, ReactNode][];
    hideHeading?: boolean;
    numberOnly?: boolean;
    plain?: boolean;
    afterHeading?: ReactNode;
}) {
    const present = facts.filter(([, value]) => value !== undefined && value !== '');
    const game = present.find(([label]) => label === 'Game');
    const others = present.filter(([label]) => label !== 'Game');
    // The rest go two to a row, so the labels line up in columns.
    const pairs: [string, ReactNode][][] = [];
    for (let i = 0; i < others.length; i += 2) pairs.push(others.slice(i, i + 2));

    // With the number as the title, everything fits in two lines: the number beside the game, then
    // the other facts side by side.
    if (numberOnly && !hideHeading) {
        const { players, where } = gameParts(puzzle);
        const result = present.find(([label]) => label === 'Result')?.[1];
        const rest = others.filter(([label]) => label !== 'Result');
        return (
            <Stack sx={{ gap: 1.25, px: 2.5, pt: 3, flexShrink: 0 }}>
                {/* The number, the players and the result on one line. */}
                <Stack direction='row' sx={{ alignItems: 'center', gap: 1.5 }}>
                    <Typography
                        component='span'
                        sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                            fontWeight: 800,
                            fontSize: '1.05rem',
                            lineHeight: 1.4,
                            flexShrink: 0,
                        }}
                    >
                        #{puzzle.id}
                    </Typography>
                    <Typography
                        sx={{ fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.3, flexGrow: 1 }}
                    >
                        {players || (game ? game[1] : '')}
                    </Typography>
                    {result && (
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: '1.2rem',
                                color: 'text.secondary',
                                fontVariantNumeric: 'tabular-nums',
                                flexShrink: 0,
                            }}
                        >
                            {result}
                        </Typography>
                    )}
                </Stack>
                {/* Where and when, quieter, under the players. */}
                {where && players && <Typography color='text.secondary'>{where}</Typography>}
                {/* The rest as small labelled facts on one line. */}
                {rest.length > 0 && (
                    <Stack
                        direction='row'
                        sx={{ flexWrap: 'wrap', columnGap: 3, rowGap: 0.5, pt: 0.75 }}
                    >
                        {rest.map(([label, value]) => (
                            <Stack
                                key={label}
                                direction='row'
                                sx={{ gap: 0.75, alignItems: 'baseline' }}
                            >
                                <Label>{label === 'Annotated by' ? 'Annotator' : label}</Label>
                                <Typography
                                    component='div'
                                    variant='body1'
                                    sx={{ fontWeight: 600 }}
                                >
                                    {value}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                )}
            </Stack>
        );
    }

    return (
        <Stack
            sx={{
                gap: 1,
                // Room on both sides, so the labels do not sit against the edge.
                px: 2,
                pt: 2,
                flexShrink: 0,
                // On its own, a line under it separates it from what follows.
                ...(plain ? {} : { mb: 2.5, pb: 2.5, borderBottom: 1, borderColor: 'divider' }),
            }}
        >
            {!hideHeading && (
                <PuzzleHeading puzzle={puzzle} groups={groups} numberOnly={numberOnly} />
            )}
            {afterHeading && (
                <>
                    <Box sx={{ pb: 1 }}>{afterHeading}</Box>
                    <Divider sx={{ mb: 1 }} />
                </>
            )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'max-content minmax(0, 1fr) max-content minmax(0, 1fr)',
                    columnGap: 2,
                    rowGap: 0.75,
                    alignItems: 'baseline',
                }}
            >
                {game && (
                    <>
                        <Label>{game[0]}</Label>
                        <Typography sx={{ gridColumn: 'span 3', fontWeight: 600 }}>
                            {game[1]}
                        </Typography>
                    </>
                )}
                {pairs.map((row) =>
                    row.map(([label, value], i) => (
                        <Fragment key={label}>
                            <Label>{label}</Label>
                            <Typography
                                component='div'
                                variant='body2'
                                sx={{
                                    fontWeight: 600,
                                    // Alone in its row, a fact takes the rest of the row.
                                    gridColumn: row.length === 1 && i === 0 ? 'span 3' : undefined,
                                }}
                            >
                                {value}
                            </Typography>
                        </Fragment>
                    )),
                )}
            </Box>
        </Stack>
    );
}

/** The puzzle's number, with its bucket and theme chips beside it. */
function PuzzleHeading({
    puzzle,
    groups,
    numberOnly,
}: {
    puzzle: PuzzlebasePuzzle;
    groups: ReturnType<typeof groupTags>;
    /** Just the number, with the tags left for somewhere else. */
    numberOnly?: boolean;
}) {
    return (
        <Stack direction='row' sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant='h5' sx={{ fontWeight: 'bold', lineHeight: 1.1 }}>
                #{puzzle.id}
            </Typography>
            {!numberOnly && (
                <Stack direction='row' sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                    {groups
                        .filter((group) => group.hasBucketTag)
                        .map((group) => (
                            <Chip
                                key={group.bucket}
                                size='small'
                                label={group.bucket}
                                sx={{
                                    ...tagChipSx,
                                    fontWeight: 600,
                                    bgcolor: alpha(bucketColor(group.bucket), 0.42),
                                }}
                            />
                        ))}
                    {groups.flatMap((group) =>
                        group.themes.map((theme) => (
                            <Chip
                                key={theme}
                                size='small'
                                variant='outlined'
                                label={theme}
                                sx={{ ...tagChipSx, borderColor: themeOutline }}
                            />
                        )),
                    )}
                </Stack>
            )}
        </Stack>
    );
}

/** The puzzle's number and tags, on their own, for showing away from the rest of its details. */
export function PuzzleNumberAndTags({
    puzzle,
    taxonomy,
}: {
    puzzle: PuzzlebasePuzzle;
    taxonomy: PuzzlebaseTaxonomy;
}) {
    return <PuzzleHeading puzzle={puzzle} groups={groupTags(taxonomy, puzzle)} />;
}

/** Just the puzzle's bucket and theme chips, for showing them under its other details. */
export function PuzzleTagChips({
    puzzle,
    taxonomy,
    roomy,
}: {
    puzzle: PuzzlebasePuzzle;
    taxonomy: PuzzlebaseTaxonomy;
    /** Bigger chips with more space between, for when there is room. */
    roomy?: boolean;
}) {
    const size = roomy ? { height: 28, fontSize: '0.85rem' } : {};
    const groups = groupTags(taxonomy, puzzle);
    return (
        <Stack direction='row' sx={{ gap: roomy ? 0.875 : 0.5, flexWrap: 'wrap' }}>
            {groups
                .filter((group) => group.hasBucketTag)
                .map((group) => (
                    <Chip
                        key={group.bucket}
                        size='small'
                        label={group.bucket}
                        sx={{
                            ...tagChipSx,
                            ...size,
                            fontWeight: 600,
                            bgcolor: alpha(bucketColor(group.bucket), 0.42),
                        }}
                    />
                ))}
            {groups.flatMap((group) =>
                group.themes.map((theme) => (
                    <Chip
                        key={theme}
                        size='small'
                        variant='outlined'
                        label={theme}
                        sx={{ ...tagChipSx, ...size, borderColor: themeOutline }}
                    />
                )),
            )}
        </Stack>
    );
}

/** A small grey label in front of a value. */
function Label({ children }: { children: ReactNode }) {
    return (
        <Typography
            component='span'
            variant='caption'
            sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </Typography>
    );
}

/**
 * The game a puzzle comes from, on one line: the players, then the event, the place and the year.
 * For example "Fischer - Spassky, World Championship, Reykjavik 1972". Leaves out whatever is not
 * known, and does not repeat a place or a year that the event's name already has.
 *
 * A puzzle sorted in ChessBase has a label like "Ex 12 Tactics, Pin" in the White field, with both
 * players in the Black field. The label is not a player, so it is left out.
 */
export function gameParts(
    puzzle: Pick<PuzzlebasePuzzle, 'white' | 'black' | 'event' | 'site' | 'year'>,
): { players: string; where: string } {
    const isLabel = /^Ex \d+\b/.test(puzzle.white ?? '');
    const players = (isLabel ? [puzzle.black] : [puzzle.white, puzzle.black])
        .filter((name): name is string => !!name && name !== '?')
        .join(' - ');

    const known = (text?: string) => (text && text !== '?' ? text : undefined);
    const event = known(puzzle.event);
    // The place is left out when the event already names it ("London 1946" held in London).
    const site = known(puzzle.site);
    const siteToShow =
        site && !event?.toLowerCase().includes(site.toLowerCase()) ? site : undefined;
    const places = [event, siteToShow].filter(Boolean).join(', ');
    // Likewise the year, when the event is "London 1946".
    const yearToShow =
        puzzle.year !== undefined && !places.includes(String(puzzle.year))
            ? puzzle.year
            : undefined;
    const where = [places, yearToShow]
        .filter((part) => part !== undefined && part !== '')
        .join(' ');

    return { players, where };
}

/** The game on one line: the players, then where and when it was played. */
export function gameLine(
    puzzle: Pick<PuzzlebasePuzzle, 'white' | 'black' | 'event' | 'site' | 'year'>,
): string {
    const { players, where } = gameParts(puzzle);
    return [players, where].filter(Boolean).join(', ');
}

/** "85% (17 votes)" for a puzzle people voted on, shown to Puzzle Contributors only. */
function popularityText(puzzle: PuzzlebasePuzzle): string | undefined {
    const score = popularity(puzzle);
    if (score === undefined) return undefined;
    const votes = (puzzle.upvotes ?? 0) + (puzzle.downvotes ?? 0);
    return `${score}% (${votes} vote${votes === 1 ? '' : 's'})`;
}
