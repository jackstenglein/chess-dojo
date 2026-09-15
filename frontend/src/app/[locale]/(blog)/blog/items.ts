import chessandfitness from './dojo-blog/chess-and-fitness/chess-fitness.png';
import customtask from './dojo-blog/custom-tasks/custom-tasks.png';
import mastersImage from './dojo-digest/vol-10/masters.png';
import dojoDigestVol11Image from './dojo-digest/vol-11/kraai.jpg';
import dojoDigestVol12Image from './dojo-digest/vol-12/dojo-files.png';
import stockfishImage from './dojo-digest/vol-13/stockfish.png';
import fileSharingImage from './dojo-digest/vol-14/share-directory.png';
import heatmap from './dojo-digest/vol-15/Finochess.jpg';
import freemonth from './dojo-digest/vol-16/freemonth.webp';
import yearstats from './dojo-digest/vol-17/2024+stats.png';
import masteringtime from './dojo-digest/vol-18/mastering-time.jpg';
import weeklyplanner from './dojo-digest/vol-19/weekly-planner.png';
import openingscout from './dojo-digest/vol-20/openingscout.png';
import dojo4 from './dojo-digest/vol-21/Dojo4.png';
import youtubeaward from './dojo-digest/vol-22/youtube.webp';
import kraaichamp from './dojo-digest/vol-23/kraaichamp.jpg';
import UIUpgrade from './dojo-digest/vol-24/UI+Upgrade.jpg';
import solitairechess from './dojo-digest/vol-25/solitairechess.jpg';
import danya from './dojo-digest/vol-26/danya.jpg';
import dojoDigestVol8Image from './dojo-digest/vol-8/dojo_3-0.webp';
import dojoDigestVol9Image from './dojo-digest/vol-9/newTests.png';
import worldrapid from './dojo-talks/2024-world-rapid-blitz/2024-rapid.png';
import talkstop2025 from './dojo-talks/top-10-2025/image.webp';
import top10tournaments from './dojo-talks/top-10-tournaments/tournaments.jpg';
import ratingConverter from './new-ratings/noseknowsall/ratings-image05.png';
import olympiadImage from './olympiad-2024/olympiad.jpg';
import dandeerImage from './player-spotlight/dandeer/opengraph-image.jpg';
import tacticsTestImage from './tactics-test/image.png';

export interface BlogItem {
    title: string;
    subtitle?: string;
    body: string;
    href: string;
    image?: {
        src: string;
        alt: string;
    };
}

const items: BlogItem[] = [
    {
        title: 'The Top 10 Greatest Chess Tournaments Ever',
        subtitle: 'Dojo Talks • January 12, 2026',
        body: `In this episode of Dojo Talks, we rank and debate the 10 greatest chess tournaments of all time`,
        href: '/blog/dojo-talks/top-10-tournaments',
        image: {
            src: top10tournaments,
            alt: '',
        },
    },
    {
        title: 'Chess and Fitness',
        subtitle: 'Dojo Blog • January 5, 2026',
        body: `In the New Year spirit of resetting goals, GM Kraai explores how fitness and chess improvement are similar in needing structure but fundamentally different because fitness is measurable while chess and mental growth are far more slippery.`,
        href: '/blog/dojo-blog/chess-and-fitness',
        image: {
            src: chessandfitness,
            alt: '',
        },
    },
    {
        title: 'Dojo Core and Live Classes',
        subtitle: 'Dojo Digest • January 1, 2026',
        body: `Get a Free Month of Dojo Core and 10% off Live Classes`,
        href: '/blog/dojo-digest/vol-28',
    },
    {
        title: '24 hours left for 25% Off ChessDojo',
        subtitle: 'Dojo Digest • December 1, 2025',
        body: `Live class tiers and Black Friday sale end December 2nd!`,
        href: '/blog/dojo-digest/vol-27',
    },
    {
        title: 'Remembering Daniel Naroditsky',
        subtitle: 'Dojo Digest • November 1, 2025',
        body: `The Dojo was rocked by the news of Danya's passing.`,
        href: '/blog/dojo-digest/vol-26',
        image: {
            src: danya,
            alt: '',
        },
    },
    {
        title: 'ChessDojo Launches Live Group Classes',
        subtitle: 'November 24, 2025',
        body: "ChessDojo's interactive group classes start January 1st. Join before December 2nd and get 25% off with the code BLACKFRIDAY!",
        href: '/blog/live-classes',
    },
    {
        title: 'CoachChamps, Solitaire Chess & More',
        subtitle: 'Dojo Digest • October 1, 2025',
        body: `Solitaire Chess (Guess the Move)!`,
        href: '/blog/dojo-digest/vol-25',
        image: {
            src: solitairechess,
            alt: '',
        },
    },
    {
        title: 'New UI, Performance Stats & Annotation Workshop',
        subtitle: 'Dojo Digest • September 1, 2025',
        body: `New Training Plan UI!`,
        href: '/blog/dojo-digest/vol-24',
        image: {
            src: UIUpgrade,
            alt: '',
        },
    },
    {
        title: 'My Games Folder, Annotation Workshop, & Other News',
        subtitle: 'Dojo Digest • August 1, 2025',
        body: `All Dojo users now have a default folder called My Games.`,
        href: '/blog/dojo-digest/vol-23',
        image: {
            src: kraaichamp,
            alt: '',
        },
    },
    {
        title: '100,000 YouTube Subscribers!',
        subtitle: 'Dojo Digest • July 1, 2025',
        body: `It’s been a long journey!`,
        href: '/blog/dojo-digest/vol-22',
        image: {
            src: youtubeaward,
            alt: '',
        },
    },
    {
        title: '40% Off ChessDojo, New Features, & More!',
        subtitle: 'Dojo Digest • June 1, 2025',
        body: `We launched Dojo 4.0!`,
        href: '/blog/dojo-digest/vol-21',
        image: {
            src: dojo4,
            alt: '',
        },
    },
    {
        title: 'Dojo 4.0 is live!',
        subtitle: 'Dojo Blog • May 16, 2025',
        body: `Our yearly update to the Dojo Training Program is here! Here's all the (major) changes from 3.0 to 4.0`,
        href: '/blog/dojo-blog/4-0',
    },
    {
        title: 'Annotation Workshop, Dojo Opening Scout & more!',
        subtitle: 'Dojo Digest • May 1, 2025',
        body: `Sensei Kraai is reviving the Dojo's coaching workshops!`,
        href: '/blog/dojo-digest/vol-20',
        image: {
            src: openingscout,
            alt: '',
        },
    },
    {
        title: 'Tournament Prizes, New Course, Weekly Planner & more!',
        subtitle: 'Dojo Digest • April 1, 2025',
        body: `Dojo tournaments now have prizes!`,
        href: '/blog/dojo-digest/vol-19',
        image: {
            src: weeklyplanner,
            alt: '',
        },
    },
    {
        title: 'New Courses, Badges, & more!',
        subtitle: 'Dojo Digest • March 1, 2025',
        body: `Mastering Time in Chess is finally out on Chessable!`,
        href: '/blog/dojo-digest/vol-18',
        image: {
            src: masteringtime,
            alt: '',
        },
    },
    {
        title: 'Custom Tasks Are Here!',
        subtitle: 'Dojo Blog • February 14, 2025',
        body: `Huge update for the Dojo! It is now possible to add custom tasks to the Training Program!`,
        href: '/blog/dojo-blog/custom-tasks',
        image: {
            src: customtask,
            alt: '',
        },
    },
    {
        title: 'Round Robin Tournaments, Custom Tasks, & more! | Dojo Digest',
        subtitle: 'Dojo Digest • February 1, 2025',
        body: `Round robin tournaments are open for non-members, and you can now create custom tasks in your training plan!`,
        href: '/blog/dojo-digest/vol-17',
        image: {
            src: yearstats,
            alt: '',
        },
    },
    {
        title: '2024 World Rapid & Blitz w/ GM Hammer | Dojo Talks',
        subtitle: 'DojoTalks • January 3, 2025',
        body: `The senseis are joined by GM Jon Ludvig Hammer to discuss the 2024 World Rapid & Blitz Championship.`,
        href: '/blog/dojo-talks/2024-world-rapid-blitz',
        image: {
            src: worldrapid,
            alt: '',
        },
    },
    {
        title: 'Free Month at the Dojo',
        subtitle: 'Dojo Digest Vol 16 • January 1, 2025',
        body: `Make your New Year’s resolution and join the Dojo for the month of January at no cost!`,
        href: '/blog/dojo-digest/vol-16',
        image: {
            src: freemonth,
            alt: '',
        },
    },
    {
        title: 'The Heatmap has evolved',
        subtitle: 'Dojo Digest Vol 15 • December 1, 2024',
        body: `The heatmap has evolved! Many thanks to Jalp aka Noobmaster for making a vision into a reality.`,
        href: '/blog/dojo-digest/vol-15',
        image: {
            src: heatmap,
            alt: '',
        },
    },
    {
        title: 'New Folder Sharing and Other Updates',
        subtitle: 'Dojo Digest Vol 14 • November 1, 2024',
        body: `Two months ago, we announced our file system for organizing your games and repertoires. Today, we're releasing a major update, which allows you to share folders with other users.`,
        href: '/blog/dojo-digest/vol-14',
        image: {
            src: fileSharingImage,
            alt: '',
        },
    },
    {
        title: 'Stockfish Now Available in Game Annotator',
        subtitle: 'Dojo Digest Vol 13 • October 1, 2024',
        body: 'Stockfish 17 (desktop version) and Stockfish 16 (mobile version) are now both available in our game annotator. Both engines run locally in your browser, although...',
        href: '/blog/dojo-digest/vol-13',
        image: {
            src: stockfishImage,
            alt: '',
        },
    },
    {
        title: 'Dandeer',
        subtitle: 'Dojo Player Spotlight • September 30, 2024',
        body: 'Dandeer is a member of the 1300-1400 cohort and plays classical OTB at his club in Hungary.',
        href: '/blog/player-spotlight/dandeer',
        image: {
            src: dandeerImage,
            alt: 'Dandeer (with the black pieces) playing a 90+30 tournament at his club in Hungary in April 2024',
        },
    },
    {
        title: 'Universal Rating Converter for 2024',
        subtitle: 'NoseKnowsAll • September 24, 2024',
        body: `Explaining the math behind ChessDojo's new universal rating converter.`,
        href: '/blog/new-ratings/noseknowsall',
        image: {
            src: ratingConverter,
            alt: '',
        },
    },
    {
        title: 'The New Dojo Rating Translator',
        subtitle: 'Jesse Kraai • September 15, 2024',
        body: `One of the first and essential building stones of the Dojo Training Program was the creation of a universal rating system...`,
        href: '/blog/new-ratings',
    },
    {
        title: 'Dojo at the Olympiad',
        subtitle: 'September 12, 2024',
        body: `Jan (LifeCanBeSoNice) got the party started with an amazing AI driven hype video, and Sensei David covers German #1 Vincent Keymer's streak in the 2024 Akiba Rubinstein Memorial.`,
        href: '/blog/olympiad-2024',
        image: {
            src: olympiadImage,
            alt: '',
        },
    },
    {
        title: 'Will LifeCanBeSoNice Reach 2000?',
        subtitle: 'Dojo Player Spotlight • September 2, 2024',
        body: `Jan, aka LifeCanBeSoNice, is going for it. Since joining the Dojo last year, he has gained 279 points and has started his own chess improvement channel with his coach IM Jurica Srbis. His goal is 2000 Lichess. It’s a magical number! Will he be able to make it?`,
        href: '/blog/player-spotlight/lifecanbesonice',
    },
    {
        title: 'Introducing the Dojo File System',
        subtitle: 'Dojo Digest Vol 12 • September 1, 2024',
        body: `The Dojo has a new file system to help you organize and manage your games! A new files tab has been added to your profile. You'll start out with an empty Home folder, where you can add games or nested folders...`,
        href: '/blog/dojo-digest/vol-12',
        image: {
            src: dojoDigestVol12Image,
            alt: '',
        },
    },
    {
        title: 'Jesse Kraai Scores Clear Second at the US Senior',
        subtitle: 'Dojo Digest Vol 11 • August 1, 2024',
        body: `Sensei Kraai trusted the program and the results finally came. In a field of legends, 9 GMs and one IM, the sensei won his last four games and scored his fifth GM norm...`,
        href: '/blog/dojo-digest/vol-11',
        image: {
            src: dojoDigestVol11Image,
            alt: '',
        },
    },
    {
        title: 'Introducing the Dojo Masters Database',
        subtitle: 'Dojo Digest Vol 10 • July 1, 2024',
        body: `We now have a database of master-level games, filterable by time control! We currently have 250,000 games available and are in the process of uploading another 5 million...`,
        href: '/blog/dojo-digest/vol-10',
        image: {
            src: mastersImage,
            alt: '',
        },
    },
    {
        title: 'Who Will Be Top 10 in 2025? | Dojo Talks',
        subtitle: 'Jesse, Kostya, and David • June 7, 2024',
        body: `GM Jesse Kraai, IM David Pruess, and IM Kostya Kavutskiy forecast who will be the top 10 FIDE rated chess players in June 2025 in today's episode of Dojo Talks, the ChessDojo podcast.`,
        href: '/blog/dojo-talks/top-10-2025',
        image: {
            src: talkstop2025,
            alt: '',
        },
    },
    {
        title: 'Rolling out Additional Tactics Tests',
        subtitle: 'Dojo Digest Vol 9 • June 1, 2024',
        body: 'May has been all about the development of our three trainers: tactics, endgame, and positional. On May 1st we posted our tests for 1500-2000 and 2000+. June 1st will see the rollout of tests for all cohorts...',
        href: '/blog/dojo-digest/vol-9',
        image: {
            src: dojoDigestVol9Image,
            alt: '',
        },
    },
    {
        title: 'Introducing Dojo Tactics Tests – A New Way to Assess Your Skills',
        subtitle: 'Kostya Kavutskiy • May 15, 2024',
        body: `The Dojo has released a new training skill designed to test tactical skill, attempting to improve on the most popular existing "tactics trainers" and provide players a much more realistic "tactics rating"...`,
        href: '/blog/tactics-test',
        image: {
            src: tacticsTestImage,
            alt: 'Graph of tactics test results',
        },
    },
    {
        title: 'Welcome to Dojo 3.0!',
        subtitle: 'Dojo Digest Vol 8 • May 1, 2024',
        body: "We launched the training program 2 years ago with a Google doc and a couple of paper clips. Since then, we've made great technical improvements and learned a lot about what chess improvement involves across the rating spectrum...",
        href: '/blog/dojo-digest/vol-8',
        image: {
            src: dojoDigestVol8Image,
            alt: '',
        },
    },
];

export default items;
