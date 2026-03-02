'use client';

import { useAuth } from '@/auth/Auth';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import { ALL_COHORTS, compareCohorts, dojoCohorts } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import {
    Card,
    CardContent,
    CardHeader,
    Container,
    Grid,
    Link,
    Stack,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { Book as BookModel, BookSection, sections } from './books';

function getDisplayTitle(b: BookModel) {
    if (b.author) {
        return `${b.author} - ${b.title}`;
    }
    return b.title;
}

const Book: React.FC<{ book: BookModel }> = ({ book }) => {
    if (book.link) {
        return (
            <Link href={book.link} target='_blank' rel='noopener'>
                {getDisplayTitle(book)}
            </Link>
        );
    }
    return <Typography>{getDisplayTitle(book)}</Typography>;
};

interface SectionProps {
    section: BookSection;
    cohort: string;
}

const Section: React.FC<SectionProps> = ({ section, cohort }) => {
    const books = section.cohorts.find((c) => c.cohort === cohort)?.books;
    if (!books) {
        return null;
    }

    return (
        <Stack spacing={1}>
            <Typography variant='subtitle1' fontWeight='bold' color='text.secondary'>
                {section.title}
            </Typography>

            <ul>
                {books.map((b) => (
                    <li key={b.title}>
                        <Book key={b.title} book={b} />
                    </li>
                ))}
            </ul>
        </Stack>
    );
};

export default function BooksPage() {
    const { user } = useAuth();
    const [cohorts, setCohorts] = useState([user?.dojoCohort || ALL_COHORTS]);

    const onChangeCohort = (newCohorts: string[]) => {
        const addedCohorts = newCohorts.filter((c) => !cohorts.includes(c));
        let finalCohorts = [];
        if (addedCohorts.includes(ALL_COHORTS)) {
            finalCohorts = [ALL_COHORTS];
        } else {
            finalCohorts = newCohorts.filter((c) => c !== ALL_COHORTS).sort(compareCohorts);
        }

        setCohorts(finalCohorts);
    };

    return (
        <Container sx={{ py: 3 }}>
            <Stack spacing={3}>
                <Typography variant='h5' align='center'>
                    ChessDojo Recommended Books
                </Typography>
                <Typography>
                    The following books have been handpicked by the Senseis for each cohort. Below
                    you'll see the list of books that are assigned for each rating band, split among
                    the main recommendations, tactics books, and endgame books.
                </Typography>
            </Stack>
            <Stack mt={3} spacing={3}>
                <MultipleSelectChip
                    data-testid='cohort-selector'
                    selected={cohorts}
                    setSelected={onChangeCohort}
                    options={[ALL_COHORTS, ...dojoCohorts].map((opt) => ({
                        value: opt,
                        label: opt === ALL_COHORTS ? 'All Cohorts' : opt,
                        icon: (
                            <CohortIcon
                                cohort={opt}
                                size={25}
                                sx={{ marginRight: '0.6rem' }}
                                tooltip=''
                                color='primary'
                            />
                        ),
                    }))}
                    label='Cohorts'
                    sx={{ mb: 3, width: 1 }}
                    size='small'
                    error={cohorts.length === 0}
                />

                <Grid container rowGap={2} columnSpacing={2}>
                    {(cohorts[0] === ALL_COHORTS ? dojoCohorts : cohorts).map((cohort) => (
                        <Grid
                            key={cohort}
                            size={{
                                xs: 12,
                                sm: 6,
                            }}
                        >
                            <Card
                                variant='outlined'
                                sx={{
                                    height: 1,
                                }}
                            >
                                <CardHeader
                                    title={
                                        <>
                                            <CohortIcon
                                                cohort={cohort}
                                                sx={{
                                                    marginRight: '0.6rem',
                                                    verticalAlign: 'middle',
                                                }}
                                                tooltip=''
                                            />{' '}
                                            {cohort}
                                        </>
                                    }
                                />

                                <CardContent>
                                    <Stack spacing={3}>
                                        {sections.map((s) => (
                                            <Section key={s.title} section={s} cohort={cohort} />
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Stack>
        </Container>
    );
}
