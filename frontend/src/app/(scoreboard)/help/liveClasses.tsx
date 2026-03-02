import { Link } from '@/components/navigation/Link';

export const liveClassesFaq = {
    title: 'Live Classes',
    items: [
        {
            title: 'What types of live classes are offered?',
            content: (
                <>
                    There are two types of classes: larger lectures and smaller, more personal Game
                    and Profile Review classes. The lectures cover a variety of different
                    specialized topics (for example endgame fundamentals, calculation or the
                    Najdorf) and rotate monthly. In the Game and Profile Review classes, the sensei
                    focuses on a single player each week, analyzing their training habits and (at
                    least) one of their annotated games.
                </>
            ),
        },
        {
            title: 'Where can I view the class calendar?',
            content: (
                <>
                    The class calendar is available{' '}
                    <Link target='_blank' href='/calendar'>
                        here
                    </Link>
                    .
                </>
            ),
        },
        {
            title: 'Are these the only classes being offered?',
            content: (
                <>
                    We will add further classes and different time slots as we get more students.
                    This applies to both the lectures and the Game and Profile Review classes. The
                    topics of the lectures will also rotate monthly.
                </>
            ),
        },
        {
            title: 'How much do the classes cost?',
            content: (
                <>
                    The lectures are available on the $75/month subscription tier. The Game and
                    Profile Review classes are available on the $200/month subscription tier. The
                    $200/month subscription tier also provides access to the lecture classes. Both
                    subscription tiers provide full access to the rest of the ChessDojo training
                    plan and website.
                </>
            ),
        },
        {
            title: 'What rating ranges are the classes for?',
            content: (
                <>
                    The Game and Profile Review classes are split into the following rating ranges:
                    0-600, 600-1000, 1000-1400, 1400-1800, 1800+ (these ratings all use the{' '}
                    <Link href='/learn/ratings'>ChessDojo rating scale</Link>). For the Game and
                    Profile Review classes, you can only join the class for your specific cohort.
                    The lectures are roughly split among the same rating ranges but may cover
                    broader or more targeted ranges for a given class. Each class will specify its
                    recommended rating range. Any subscriber can join the lecture classes, even if
                    they are outside the recommended rating range. However, the class material will
                    be designed for the recommended rating range.
                </>
            ),
        },
        {
            title: 'How many students can join each class?',
            content: (
                <>
                    The lecture classes have no limit on the amount of students that can join each
                    class. The Game and Profile Review classes will be limited to approximately 10
                    students. As more students join a given cohort range, they will be split into
                    additional sections. For example, there might be two sections of the 600-1000
                    Game and Profile Review, each with 7 students.
                </>
            ),
        },
        {
            title: 'How do I join the classes?',
            content: (
                <>
                    All classes will be conducted through Google Meet. This allows us to
                    automatically record and upload the classes for viewing on demand. The Google
                    Meet links will be available in the{' '}
                    <Link href='/calendar'>ChessDojo calendar</Link> after you have subscribed. No
                    special software is required to join. All you need is a standard web browser.
                </>
            ),
        },
        {
            title: 'Do I have to additionally register for specific classes after subscribing?',
            content: (
                <>
                    No, all subscribers can join any of the lecture classes using the Google Meet
                    links in the calendar. Game and Profile Review subscribers will automatically
                    have access to their specific cohort's section of the class through the Google
                    Meet link in the calendar as well.
                </>
            ),
        },
        {
            title: `What if I can't make a class?`,
            content: (
                <>
                    All classes will be recorded and uploaded to Google Drive. Subscribers will be
                    able to view the recordings of all classes.
                </>
            ),
        },
        {
            title: 'How do I communicate with other students?',
            content: (
                <>
                    Subscribers will get access to a private section of Discord channels. There will
                    be a channel for each lecture class, as well as channels specifically for each
                    Game and Profile Review cohort. Subscribers will have access to all lecture
                    channels, but only the members in a specific Game and Profile Review cohort will
                    have access to the corresponding Discord channel.
                </>
            ),
        },
    ],
};
