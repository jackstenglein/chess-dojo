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
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('tournaments.liga.filters');
    const labelT = useTranslations('eventLabels');

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
                            {t('filters')}
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
                                {t('types')}
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.tournamentTypes}
                                setSelected={onChangeTournamentType}
                                options={Object.values(TournamentType).map((tt) => ({
                                    value: tt,
                                    label: displayTournamentType(tt, labelT),
                                    icon: <Icon name={tt} color='liga' />,
                                }))}
                                displayEmpty={t('emptyNone')}
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
                                {t('timeControls')}
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.tournamentTimeControls}
                                setSelected={onChangeTournamentTimeControls}
                                options={Object.values(TimeControlType).map((tc) => ({
                                    value: tc,
                                    label: displayTimeControlType(tc, labelT),
                                    icon: <Icon name={tc} color={getColor(tc)} />,
                                }))}
                                displayEmpty={t('emptyNone')}
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
                                {t('startingPosition')}
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.tournamentPositions}
                                setSelected={onChangeTournamentPositions}
                                options={Object.values(PositionType).map((p) => ({
                                    value: p,
                                    label: displayPositionType(p, labelT),
                                    icon: <Icon name={p} color='warning' />,
                                }))}
                                displayEmpty={t('emptyNone')}
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
