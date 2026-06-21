import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { Button, IconButton, IconButtonProps, Popover, Stack } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { MouseEvent, useState } from 'react';

export const MIN_YEAR = 2023;
export const MIN_MONTH = 7;
export const MIN_DATE = '2023-07-11';

interface LocaleArrowProps extends Omit<IconButtonProps, 'type'> {
    type: 'prev' | 'next';
    onClick?: (e?: MouseEvent) => void;
}

export const LocaleArrow = ({ type, onClick, ...props }: LocaleArrowProps) => {
    let Arrow = NavigateNextRoundedIcon;
    if (type === 'prev') {
        Arrow = NavigateBeforeRoundedIcon;
    }

    return (
        <IconButton
            onClick={onClick}
            onDragOver={(e) => {
                e.preventDefault();
                if (onClick) {
                    onClick();
                }
            }}
            {...props}
        >
            <Arrow />
        </IconButton>
    );
};

interface MonthDateButtonProps {
    selectedDate: DateTime;
    onChange: (value: DateTime) => void;
}

const MonthDateButton = ({ selectedDate, onChange }: MonthDateButtonProps) => {
    const currentMonth = selectedDate.month;
    const currentYear = selectedDate.year;
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const now = DateTime.now();
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
        onChange(selectedDate.minus({ months: 1 }));
    };
    const handleNext = () => {
        onChange(selectedDate.plus({ months: 1 }));
    };

    return (
        <Stack direction='row' alignItems='center'>
            <LocaleArrow
                type='prev'
                onClick={handlePrev}
                aria-label={t('previousMonth')}
                disabled={currentMonth <= MIN_MONTH && currentYear === MIN_YEAR}
            />
            <Button style={{ padding: 4 }} onClick={handleOpen} aria-label={t('selectedMonth')}>
                {selectedDate.toFormat('MMMM yyyy')}
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
                    openTo='month'
                    views={['year', 'month']}
                    value={selectedDate}
                    onChange={handleChange}
                    disableFuture
                    minDate={DateTime.fromISO(MIN_DATE)}
                />
            </Popover>
            <LocaleArrow
                type='next'
                onClick={handleNext}
                aria-label={t('nextMonth')}
                disabled={currentMonth >= now.month && currentYear >= now.year}
            />
        </Stack>
    );
};

export default MonthDateButton;
