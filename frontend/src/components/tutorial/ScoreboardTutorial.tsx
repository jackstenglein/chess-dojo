import { Step } from 'react-joyride';
import Tutorial from './Tutorial';
import { TutorialName } from './tutorialNames';

const steps: Step[] = [
    {
        target: '#scoreboard-cohort-select',
        title: 'Welcome to the Scoreboard',
        content:
            'By default, the scoreboard opens to your cohort, but you can use this select box to switch between cohorts.',
        skipBeacon: true,
    },
    {
        target: '.MuiDataGrid-columnHeaderTitleContainer',
        title: 'Scoreboard',
        content:
            "This is the main scoreboard, which shows you the active participants in your cohort. If you don't update any of your training plan tasks in a month, you will be considered inactive and taken off the scoreboard, so make sure to keep your tasks up to date!",
    },
    {
        target: '#graduation-scoreboard .MuiDataGrid-columnHeaderTitleContainer',
        title: 'Graduation Scoreboard',
        content:
            'Below the main scoreboard is the graduation scoreboard. This shows you the stats of everyone who has graduated from your cohort, at the time of their graduation. You can use this to compare your progress with prior graduates.',
    },
    {
        target: '.MuiDataGrid-columnHeader--sortable',
        title: 'Sorting & Searching',
        content:
            'You can click on a column header to sort by that column. When hovering on the column header, click the menu icon to search the column or to hide it.',
    },
    {
        target: 'body',
        title: 'Tutorial Complete',
        content:
            'Great job completing this tutorial! If you ever need to go through it again, check the help page in the navbar.',
        placement: 'center',
    },
];

const ScoreboardTutorial = () => {
    return <Tutorial name={TutorialName.ScoreboardPage} steps={steps} />;
};

export default ScoreboardTutorial;
