import { useTranslations } from 'next-intl';
import { Step } from 'react-joyride';
import Tutorial from './Tutorial';
import { TutorialName } from './tutorialNames';

const ListGamesTutorial = () => {
    const t = useTranslations('tutorial.listGames');

    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center',
            title: t('welcomeTitle'),
            content: t('welcomeContent'),
            skipBeacon: true,
        },
        {
            target: '#import-game-button',
            title: t('analyzeTitle'),
            content: t('analyzeContent'),
        },
        {
            target: '.MuiDataGrid-row',
            title: t('publicTitle'),
            content: t('publicContent'),
        },
        {
            target: '#search-games',
            title: t('searchGamesTitle'),
            content: t('searchGamesContent'),
        },
        {
            target: '#download-full-database',
            title: t('downloadTitle'),
            content: t('downloadContent'),
        },
        {
            target: 'body',
            placement: 'center',
            title: t('completeTitle'),
            content: t('completeContent'),
        },
    ];

    return <Tutorial name={TutorialName.ListGamesPage} steps={steps} />;
};

export default ListGamesTutorial;
