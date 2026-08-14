import { useTranslations } from 'next-intl';
import { Step } from 'react-joyride';
import Tutorial from './Tutorial';
import { TutorialName } from './tutorialNames';

const CalendarTutorial = () => {
    const t = useTranslations('tutorial.calendar');

    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center',
            title: t('welcomeTitle'),
            content: t('welcomeContent'),
            skipBeacon: true,
        },
        {
            target: '[data-testid=calendar-settings-button]',
            title: t('timezoneTitle'),
            content: t('timezoneContent'),
        },
        {
            target: '[data-testid=calendar-filters-button]',
            title: t('filtersTitle'),
            content: t('filtersContent'),
        },
        {
            target: '.rs__cell.rs__today_cell:not(.rs__header)',
            title: t('createTitle'),
            content: t('createContent'),
        },
        {
            target: '[data-testid="view-navigator"]',
            title: t('viewTitle'),
            content: t('viewContent'),
        },
        {
            target: 'body',
            placement: 'center',
            title: t('completeTitle'),
            content: t('completeContent'),
        },
    ];

    return <Tutorial name={TutorialName.CalendarPage} steps={steps} zIndex={1000} />;
};

export default CalendarTutorial;
