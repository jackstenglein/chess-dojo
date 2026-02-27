import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Filters,
} from '@/components/calendar/filters/CalendarFilters';
import TimezoneFilter from '@/components/calendar/filters/TimezoneFilter';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import {
    PositionType,
    TimeControlType,
    TournamentType,
    displayPositionType,
    displayTimeControlType,
    displayTournamentType,
} from '@/database/event';
import { RequirementCategory } from '@/database/requirement';
import Icon from '@/style/Icon';
import { Stack, Theme, Typography, useMediaQuery } from '@mui/material';
import { useState } from 'react';

export function getColor(timeControlType: TimeControlType) {
    switch (timeControlType) {
        case TimeControlType.AllTimeContols:
            return 'primary';
        case TimeControlType.Blitz:
            return 'warning';
        case TimeControlType.Rapid:
            return 'info';
        case TimeControlType.Classical:
            return 'success';
    }
}

interface TournamentCalendarFiltersProps {
    filters: Filters;
}

export const TournamentCalendarFilters: React.FC<TournamentCalendarFiltersProps> = ({
    filters,
}) => {
    const [expanded, setExpanded] = useState<boolean>(false);
    const forceExpansion = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

    const onChangeTournamentTimeControls = (tcTypes: string[]) => {
        const addedTcTypes = tcTypes.filter(
            (tc) => !filters.tournamentTimeControls.includes(tc as TimeControlType),
        );

        let finalTcTypes = [];
        if (addedTcTypes.includes(TimeControlType.AllTimeContols)) {
            finalTcTypes = [TimeControlType.AllTimeContols];
        } else {
            finalTcTypes = tcTypes.filter((tc) => tc !== TimeControlType.AllTimeContols);
        }

        filters.setTournamentTimeControls(finalTcTypes as TimeControlType[]);
    };

    const onChangeTournamentType = (tourneyTypes: string[]) => {
        const addedTourney = tourneyTypes.filter(
            (tu) => !filters.tournamentTypes.includes(tu as TournamentType),
        );

        let finalTourneyTypes = [];
        if (addedTourney.includes(TournamentType.AllTournamentTypes)) {
            finalTourneyTypes = [TournamentType.AllTournamentTypes];
        } else {
            finalTourneyTypes = tourneyTypes.filter(
                (tu) => tu !== TournamentType.AllTournamentTypes,
            );
        }

        filters.setTournamentTypes(finalTourneyTypes as TournamentType[]);
    };

    const onChangeTournamentPositions = (posTypes: string[]) => {
        const addedpos = posTypes.filter(
            (pos) => !filters.tournamentPositions.includes(pos as PositionType),
        );

        let finalPosTypes = [];
        if (addedpos.includes(PositionType.AllPositions)) {
            finalPosTypes = [PositionType.AllPositions];
        } else {
            finalPosTypes = posTypes.filter((pos) => pos !== PositionType.AllPositions);
        }

        filters.setTournamentPositions(finalPosTypes as PositionType[]);
    };

    return (
        <Stack
            data-testid='calendar-filters'
            sx={{ pt: 0.5, pb: 2, position: { md: 'sticky' }, top: { md: '88px' } }}
        >
            <Accordion expanded={forceExpansion || expanded} onChange={(_, e) => setExpanded(e)}>
                {!forceExpansion && (
                    <AccordionSummary forceExpansion={forceExpansion}>
                        <Typography variant='h6' color='text.secondary'>
                            Filters
                        </Typography>
                    </AccordionSummary>
                )}

                <AccordionDetails sx={{ border: 'none' }}>
                    <Stack sx={{ mt: 2, pb: 2 }} spacing={3}>
                        <TimezoneFilter filters={filters} />

                        <Stack>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name='liga'
                                    sx={{
                                        marginRight: '0.4rem',
                                        verticalAlign: 'middle',
                                    }}
                                    fontSize='medium'
                                    color='liga'
                                />
                                Types
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.tournamentTypes}
                                setSelected={onChangeTournamentType}
                                options={Object.values(TournamentType).map((t) => ({
                                    value: t,
                                    label: displayTournamentType(t),
                                    icon: <Icon name={t} color='liga' />,
                                }))}
                                displayEmpty='None'
                                size='small'
                                data-testid='tournament-types'
                            />
                        </Stack>

                        <Stack>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name='tc'
                                    sx={{
                                        marginRight: '0.4rem',
                                        verticalAlign: 'middle',
                                    }}
                                    fontSize='medium'
                                    color='primary'
                                />
                                Time Controls
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.tournamentTimeControls}
                                setSelected={onChangeTournamentTimeControls}
                                options={Object.values(TimeControlType).map((t) => ({
                                    value: t,
                                    label: displayTimeControlType(t),
                                    icon: <Icon name={t} color={getColor(t)} />,
                                }))}
                                displayEmpty='None'
                                size='small'
                                data-testid='time-controls'
                            />
                        </Stack>

                        <Stack>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name={RequirementCategory.Endgame}
                                    sx={{
                                        marginRight: '0.4rem',
                                        verticalAlign: 'middle',
                                    }}
                                    fontSize='medium'
                                    color='warning'
                                />
                                Starting Position
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.tournamentPositions}
                                setSelected={onChangeTournamentPositions}
                                options={Object.values(PositionType).map((t) => ({
                                    value: t,
                                    label: displayPositionType(t),
                                    icon: <Icon name={t} color='warning' />,
                                }))}
                                displayEmpty='None'
                                size='small'
                                data-testid='starting-position'
                            />
                        </Stack>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
};

export default TournamentCalendarFilters;
