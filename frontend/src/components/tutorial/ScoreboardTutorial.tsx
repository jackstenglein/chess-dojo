import { useTranslations } from 'next-intl';
import { Step } from 'react-joyride';
import Tutorial from './Tutorial';
import { TutorialName } from './tutorialNames';

const ScoreboardTutorial = () => {
    const t = useTranslations('tutorial.scoreboard');

    const steps: Step[] = [
        {
            target: '#scoreboard-cohort-select',
            title: t('welcomeTitle'),
            content: t('welcomeContent'),
            skipBeacon: true,
        },
        {
            target: '.MuiDataGrid-columnHeaderTitleContainer',
            title: t('mainTitle'),
            content: t('mainContent'),
        },
        {
            target: '#graduation-scoreboard .MuiDataGrid-columnHeaderTitleContainer',
            title: t('graduationTitle'),
            content: t('graduationContent'),
        },
        {
            target: '.MuiDataGrid-columnHeader--sortable',
            title: t('sortingTitle'),
            content: t('sortingContent'),
        },
        {
            target: 'body',
            title: t('completeTitle'),
            content: t('completeContent'),
            placement: 'center',
        },
    ];

    return <Tutorial name={TutorialName.ScoreboardPage} steps={steps} />;
};

export default ScoreboardTutorial;
