'use client';

import { RequestSnackbar } from '@/api/Request';
import { useRequirements } from '@/api/cache/requirements';
import { AuthStatus, useAuth, useFreeTier } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import Position from '@/components/profile/trainingPlan/Position';
import { Requirement } from '@/database/requirement';
import { ALL_COHORTS, dojoCohorts } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon, { IconProps } from '@/style/Icon';
import {
    Box,
    Button,
    Collapse,
    Container,
    Divider,
    Grid,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import React, { useMemo, useState } from 'react';

interface SparringRequirementProps {
    requirement: Requirement;
    forceExpanded?: boolean;
    stacked?: boolean;
}

const SparringRequirement: React.FC<SparringRequirementProps> = ({
    requirement,
    forceExpanded,
    stacked,
}) => {
    const [open, setOpen] = useState(false);
    const toggleOpen = () => {
        setOpen(!open);
    };

    if (!requirement.positions) {
        return null;
    }

    if (!forceExpanded && requirement.positions.length > 1) {
        return (
            <Box>
                <Stack direction='row' alignItems='center'>
                    <IconButton size='small' onClick={toggleOpen}>
                        {open ? (
                            <Icon name='innerMenuUp' color='dojoOrange' />
                        ) : (
                            <Icon name='innerMenuDown' color='dojoOrange' />
                        )}
                    </IconButton>
                    <Typography
                        variant='subtitle1'
                        fontWeight='bold'
                        color='text.secondary'
                        onClick={toggleOpen}
                        sx={{ cursor: 'pointer' }}
                    >
                        {requirement.shortName || requirement.name}
                    </Typography>
                </Stack>
                <Collapse in={open} timeout='auto' unmountOnExit>
                    <Grid container spacing={2} justifyContent={{ xs: 'center', sm: 'start' }}>
                        {requirement.positions.map((p) => (
                            <Grid
                                key={p.fen}
                                size={{
                                    md: 'auto',
                                }}
                            >
                                <Position position={p} />
                            </Grid>
                        ))}
                    </Grid>
                </Collapse>
            </Box>
        );
    }

    if (stacked) {
        return (
            <Grid container spacing={2} justifyContent={{ xs: 'center', sm: 'start' }}>
                {requirement.positions.map((p) => (
                    <Grid
                        key={p.fen}
                        size={{
                            md: 'auto',
                        }}
                    >
                        <Position position={p} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    return (
        <>
            {requirement.positions.map((p) => (
                <Grid
                    key={p.fen}
                    size={{
                        md: 'auto',
                    }}
                >
                    <Position position={p} />
                </Grid>
            ))}
        </>
    );
};

interface SparringSubsectionProps {
    subsection: Subsection;
}

const SparringSubsection: React.FC<SparringSubsectionProps> = ({ subsection }) => {
    const [open, setOpen] = useState(false);

    const toggleOpen = () => {
        setOpen(!open);
    };

    return (
        <Box>
            <Stack direction='row' alignItems='center'>
                <IconButton size='small' onClick={toggleOpen}>
                    {open ? (
                        <Icon name='innerMenuUp' color='dojoOrange' />
                    ) : (
                        <Icon name='innerMenuDown' color='dojoOrange' />
                    )}
                </IconButton>
                <Typography
                    variant='subtitle1'
                    fontWeight='bold'
                    color='text.secondary'
                    onClick={toggleOpen}
                    sx={{ cursor: 'pointer' }}
                >
                    <>
                        {dojoCohorts.includes(subsection.name) ? (
                            <>
                                <CohortIcon
                                    cohort={subsection.name}
                                    size={30}
                                    sx={{
                                        marginRight: '0.6rem',
                                        verticalAlign: 'middle',
                                    }}
                                    tooltip=''
                                    color='primary'
                                />
                                {subsection.name}
                            </>
                        ) : (
                            <>{subsection.name}</>
                        )}
                    </>
                </Typography>
            </Stack>
            <Collapse in={open} timeout='auto' unmountOnExit>
                {subsection.stacked ? (
                    <Stack pl={{ xs: 0, sm: 2 }} spacing={1}>
                        {subsection.requirements.map((r) => (
                            <SparringRequirement key={r.id} requirement={r} stacked />
                        ))}
                    </Stack>
                ) : (
                    <Grid container spacing={2}>
                        {subsection.requirements.map((r) => (
                            <SparringRequirement
                                key={r.id}
                                requirement={r}
                                forceExpanded={subsection.requirements.length === 1}
                            />
                        ))}

                        {subsection.hidden > 0 && (
                            <Grid size='auto'>
                                <Stack
                                    data-testid='upsell-message'
                                    px={1}
                                    mt={2}
                                    spacing={2}
                                    alignItems='center'
                                    justifyContent='center'
                                    height={1}
                                >
                                    <Typography textAlign='center'>
                                        Unlock {subsection.hidden} more position
                                        {subsection.hidden > 1 ? 's' : ''} by upgrading to a full
                                        account
                                    </Typography>
                                    <Button variant='outlined' component={Link} href='/prices'>
                                        View Prices
                                    </Button>
                                </Stack>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Collapse>
        </Box>
    );
};

interface SparringSectionProps {
    section: Section;
}

const SparringSection: React.FC<SparringSectionProps> = ({ section }) => {
    const [open, setOpen] = useState(false);
    const toggleOpen = () => {
        setOpen(!open);
    };

    return (
        <Box>
            <Stack direction='row' alignItems='center'>
                <IconButton size='small' onClick={toggleOpen}>
                    {open ? (
                        <Icon name='menuUp' color='dojoOrange' />
                    ) : (
                        <Icon name='menuDown' color='primary' />
                    )}
                </IconButton>
                <Typography variant='h6' onClick={toggleOpen} sx={{ cursor: 'pointer' }}>
                    <>
                        <Icon
                            name={section.name as IconProps['name']}
                            color='primary'
                            fontSize='medium'
                            sx={{ marginRight: '0.3rem', verticalAlign: 'middle' }}
                        />{' '}
                        {section.name}
                    </>
                </Typography>
            </Stack>
            <Divider />

            <Collapse in={open} timeout='auto' unmountOnExit>
                <Stack spacing={2}>
                    {section.subsections.map((subsection) => {
                        if (subsection.requirements.length === 0) {
                            return null;
                        }

                        return <SparringSubsection key={subsection.name} subsection={subsection} />;
                    })}
                </Stack>
            </Collapse>
        </Box>
    );
};

interface Subsection {
    name: string;
    requirements: Requirement[];
    stacked?: boolean;
    hidden: number;
}

interface Section {
    name: string;
    subsections: Subsection[];
}

const sectionData = [
    {
        title: 'Middlegame Win Conversions',
        selector: (r: Requirement) =>
            r.category === 'Middlegames + Strategy' && r.name.startsWith('Win Conversion'),
    },
    {
        title: 'Middlegame Sparring',
        selector: (r: Requirement) =>
            r.category === 'Middlegames + Strategy' &&
            r.name.startsWith('Spar Middlegame Position'),
    },
    {
        title: 'Endgame Algorithms',
        stacked: true,
        selector: (r: Requirement) =>
            r.category === 'Endgame' && r.name.startsWith('Complete Algorithm'),
    },
    {
        title: 'Endgame Win Conversions',
        selector: (r: Requirement) =>
            r.category === 'Endgame' && r.name.startsWith('Win Conversion'),
    },
    {
        title: 'Endgame Sparring',
        selector: (r: Requirement) =>
            r.category === 'Endgame' && r.name.startsWith('Spar Position'),
    },
    {
        title: 'Rook Endgame Progression',
        subsections: Array.from(Array(12)).map((_, i) => ({
            title: `Match #${i + 1}`,
            selector: (r: Requirement) =>
                r.category === 'Endgame' && r.name === `Win REP Match #${i + 1}`,
        })),
    },
];

function AuthSparringPage() {
    const { requirements, request } = useRequirements(ALL_COHORTS, true);
    const isFreeTier = useFreeTier();

    const sections = useMemo(() => {
        const sections = [];
        for (const datum of sectionData) {
            const section: Section = {
                name: datum.title,
                subsections: [],
            };
            if (datum.subsections) {
                section.subsections = datum.subsections.map((s) => {
                    let reqs = requirements.filter(s.selector);
                    const originalCount = reqs.length;
                    if (isFreeTier) {
                        reqs = reqs.filter((r) => r.isFree);
                    }

                    return {
                        name: s.title,
                        requirements: reqs,
                        hidden: originalCount - reqs.length,
                    };
                });
            } else {
                section.subsections = dojoCohorts.map((cohort) => {
                    let reqs = requirements.filter((r) => datum.selector(r) && r.counts[cohort]);
                    const originalCount = reqs.length;
                    if (isFreeTier) {
                        reqs = reqs.filter((r) => r.isFree);
                    }

                    return {
                        name: cohort,
                        stacked: datum.stacked,
                        requirements: reqs,
                        hidden: originalCount - reqs.length,
                    };
                });
            }
            sections.push(section);
        }
        return sections;
    }, [requirements, isFreeTier]);

    if (request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Container sx={{ py: 4 }}>
            <Stack spacing={4}>
                <RequestSnackbar request={request} />
                <Typography variant='h5' align='center'>
                    ChessDojo Recommended Sparring Positions
                </Typography>
                <Typography>
                    Below are the recommended sparring positions per cohort. Ideally, you should
                    spar positions with someone within one cohort of you and discuss the games
                    afterward. Detailed instructions per position can be found in the training plan.
                </Typography>

                {sections.map((s) => (
                    <SparringSection key={s.name} section={s} />
                ))}
            </Stack>
        </Container>
    );
}

export function SparringPage() {
    const { status } = useAuth();

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    return <AuthSparringPage />;
}
