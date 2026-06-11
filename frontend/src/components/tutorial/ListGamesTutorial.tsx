import { Step } from 'react-joyride';
import Tutorial from './Tutorial';
import { TutorialName } from './tutorialNames';

const steps: Step[] = [
    {
        target: 'body',
        placement: 'center',
        title: 'Games Database',
        content:
            'Welcome to the Dojo Game Database! Here you can find annotated games submitted by other members of the Dojo.',
        skipBeacon: true,
    },
    {
        target: '#import-game-button',
        title: 'Analyzing a Game',
        content:
            'To analyze a game, click this button. You can import games from a variety of sources, and you can choose to keep them private if you want.',
    },
    {
        target: '.MuiDataGrid-row',
        title: 'Public Games',
        content: 'Public games appear in this table. Click on a row to view that game.',
    },
    {
        target: '#search-by-cohort',
        title: 'Searching Games',
        content:
            "By default, you see your current cohort's games, but if you want to view another cohort, you can use this dropdown. You can also search for games within a specific date range.",
    },
    {
        target: '#search-by-player',
        title: 'Searching By Player',
        content:
            'You can use this section to search by a specific player name. When searching by this method, your search query must exactly match the name as it was written in the PGN.',
    },
    {
        target: '#download-full-database',
        title: 'Downloading the Database',
        content:
            'If you want to download the full Dojo Database as one large PGN file, you can do so with this link.',
    },
    {
        target: 'body',
        placement: 'center',
        title: 'Tutorial Complete',
        content:
            'Great job completing this tutorial! If you ever need to go through it again, check the help page in the navbar.',
    },
];

const ListGamesTutorial = () => {
    return <Tutorial name={TutorialName.ListGamesPage} steps={steps} />;
};

export default ListGamesTutorial;
