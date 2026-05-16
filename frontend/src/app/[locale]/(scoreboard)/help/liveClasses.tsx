import { Link } from '@/components/navigation/Link';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

const richTags = {
    calendarLink: (chunks: ReactNode) => <Link href='/calendar'>{chunks}</Link>,
    ratingsLink: (chunks: ReactNode) => <Link href='/learn/ratings'>{chunks}</Link>,
};

export function getLiveClassesFaq(t: ReturnType<typeof useTranslations<'help'>>) {
    return {
        title: t('liveClasses.title'),
        items: [
            {
                title: t('liveClasses.typesTitle'),
                content: t('liveClasses.typesContent'),
            },
            {
                title: t('liveClasses.calendarTitle'),
                content: t.rich('liveClasses.calendarContent', {
                    calendarLink: (chunks: ReactNode) => (
                        <Link target='_blank' href='/calendar'>
                            {chunks}
                        </Link>
                    ),
                }),
            },
            {
                title: t('liveClasses.moreClassesTitle'),
                content: t('liveClasses.moreClassesContent'),
            },
            {
                title: t('liveClasses.costTitle'),
                content: t('liveClasses.costContent'),
            },
            {
                title: t('liveClasses.ratingRangesTitle'),
                content: t.rich('liveClasses.ratingRangesContent', richTags),
            },
            {
                title: t('liveClasses.classSizeTitle'),
                content: t('liveClasses.classSizeContent'),
            },
            {
                title: t('liveClasses.joinTitle'),
                content: t.rich('liveClasses.joinContent', richTags),
            },
            {
                title: t('liveClasses.registerTitle'),
                content: t('liveClasses.registerContent'),
            },
            {
                title: t('liveClasses.missClassTitle'),
                content: t('liveClasses.missClassContent'),
            },
            {
                title: t('liveClasses.communicateTitle'),
                content: t('liveClasses.communicateContent'),
            },
        ],
    };
}
