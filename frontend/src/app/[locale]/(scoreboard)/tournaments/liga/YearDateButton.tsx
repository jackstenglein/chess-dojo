import { Button, Popover, Stack } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LocaleArrow, MIN_DATE, MIN_YEAR } from './MonthDateButton';

interface YearDateButtonProps {
    selectedDate: DateTime;
    onChange: (value: DateTime) => void;
}

const YearDateButton = ({ selectedDate, onChange }: YearDateButtonProps) => {
    const currentYear = selectedDate.year;
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const t = useTranslations('tournaments.liga.dateButtons');

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleChange = (e: DateTime | null) => {
        onChange(e || DateTime.now());
        handleClose();
    };
    const handlePrev = () => {
        onChange(selectedDate.minus({ years: 1 }));
    };
    const handleNext = () => {
        onChange(selectedDate.plus({ years: 1 }));
    };

    return (
        <Stack direction='row' alignItems='center'>
            <LocaleArrow
                type='prev'
                onClick={handlePrev}
                aria-label={t('previousYear')}
                disabled={currentYear <= MIN_YEAR}
            />
            <Button style={{ padding: 4 }} onClick={handleOpen} aria-label={t('selectedYear')}>
                {selectedDate.toFormat('yyyy')}
            </Button>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <DateCalendar
                    openTo='year'
                    views={['year']}
                    value={selectedDate}
                    onChange={handleChange}
                    disableFuture
                    minDate={DateTime.fromISO(MIN_DATE)}
                />
            </Popover>
            <LocaleArrow
                type='next'
                onClick={handleNext}
                aria-label={t('nextYear')}
                disabled={currentYear >= DateTime.now().year}
            />
        </Stack>
    );
};

export default YearDateButton;
