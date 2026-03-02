import { Step } from 'react-joyride-react19-compat';
import Tutorial from './Tutorial';
import { TutorialName } from './tutorialNames';

const steps: Step[] = [
    {
        target: 'body',
        placement: 'center',
        title: 'Calendar',
        content: "Welcome to the calendar! Let's take a quick tour to learn how to use it.",
        disableBeacon: true,
    },
    {
        target: '[data-testid=timezone-selector]',
        title: 'Timezone',
        content:
            'By default, the calendar displays events in your current timezone. If you want to change timezones, you can use this dropdown.',
    },
    {
        target: '[data-testid=calendar-filters-selectors]',
        title: 'Filters',
        content:
            'The filters in this section allow you to hide certain events and meetings from the calendar.',
    },
    {
        target: '.rs__cell.rs__today_cell:not(.rs__header)',
        title: 'Calendar',
        content:
            "To create a new event, click a time slot in the calendar. Your event can span multiple time slots. To book someone else's event, click on the event.",
    },
    {
        target: '[data-testid="view-navigator"]',
        title: 'View',
        content:
            'The calendar is shown in week view by default, but you can use these buttons to switch to month or day views as well.',
    },
    {
        target: 'body',
        placement: 'center',
        title: 'Tutorial Complete',
        content:
            'Great job completing this tutorial! If you ever need to go through it again, check the help page in the navbar.',
    },
];

const CalendarTutorial = () => {
    return <Tutorial name={TutorialName.CalendarPage} steps={steps} zIndex={1000} />;
};

export default CalendarTutorial;
