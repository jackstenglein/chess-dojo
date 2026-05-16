import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import daily from './daily.png';
import dojoai from './dojoai.png';
import spytool from './spytool.png';

export const metadata: Metadata = {
    title: 'Dojo 4.0 is live! | ChessDojo Blog',
    description: `Our yearly update to the Dojo Training Program is here! Here's all the (major) changes from 3.0 to 4.0`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Games', 'Repertoire'],
};

export default function CustomTasks() {
    return (
        <Container>
            <Header title='Dojo 4.0 is live!' subtitle='Dojo Blog • May 16, 2025' />

            <Stack mt={3}>
                <Typography mt={2}>
                    Not a member? Use code DOJO at checkout to get 40% off your first month at{' '}
                    <Link href='https://chessdojo.club/' target='_blank'>
                        chessdojo.club!
                    </Link>
                </Typography>

                <Typography mt={2} variant='h5'>
                    Weekly Training Planner + Algo 🗓️
                </Typography>

                <Typography mt={2}>
                    Introduced several weeks ago, you can now set a weekly training goal (in terms
                    of hours) and the new Dojo algorithm will populate your schedule with tasks from
                    your training plan. The tasks it suggests will be based on the buckets you have
                    the most to do in. You can also pin tasks to have them show up every day. Don't
                    set your goal too high! The heatmap will reflect if you hit your weekly goal or
                    not with a ✅ or ❌.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={daily}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={2}>
                    Folks who preferred the old way can still use the 'Full Training Plan' tab and
                    mark progress in their tasks accordingly.
                </Typography>

                <Typography mt={4}>
                    Check out Jesse's vid on the new training algo{' '}
                    <Link href='https://www.youtube.com/watch?v=PznFV_3EMdE' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>

                <Typography mt={2} variant='h5'>
                    Updated Training Plan 📚
                </Typography>

                <Typography mt={4}>
                    Based on member feedback, some books were moved, a few were taken out, and a few
                    were added to the program in various sections (Tactics, Middlegames, Endgames).
                    In general we have tried not to change things too dramatically as we continue to
                    hone in the plan.
                </Typography>
                <Typography mt={4}>
                    Very soon (like today or tomorrow), you'll be able to pin any task, including
                    tasks in other cohorts. So if the book you're reading is in a different cohort,
                    you can select that cohort from the dropdown menu under training plan, locate
                    the task, and pin it 📌 so that it shows up for you at the top. Your time &
                    progress logged will still count for your heatmap/activity tracker.
                </Typography>

                <Typography mt={2} variant='h5'>
                    Dojo Points Adjustment 📊
                </Typography>

                <Typography mt={4}>
                    New formula for points! Here is the new amount of time each cohort needs to log
                    to earn a Dojo Point:
                </Typography>

                <Typography mt={4}>
                    0-400 - 30 minutes <br></br>
                    400-800 - 45 minutes <br></br>
                    800-1200 - 1 hour <br></br>
                    1200-1600 - 2 hours <br></br>
                    1600-2000 - 3 hours <br></br>
                    2000+ - 4 hours
                </Typography>

                <Typography mt={2} variant='h5'>
                    Yearly Games Requirement ⏱
                </Typography>

                <Typography mt={4}>
                    Every cohort now has a minimum req to play 40 classical games per year. This is
                    regardless of level. So if you play 20 games this year and then graduate, you
                    will only have 20 games left to complete the requirement, rather than resetting
                    your progress to 0 and having to log another 40 games.
                </Typography>

                <Typography mt={4}>
                    Keep in mind that this is a suggested minimum, more is better! You will continue
                    to earn credit for any games played past 40. The same goes for the Review w/
                    plus, minus, & equal tasks -- you can do more than the suggested minimum and
                    still earn credit.
                </Typography>
                <Typography mt={4}>
                    The goal is to encourage folks to play and review their games as much as
                    possible. Recently I heard that Indian juniors are told to play 150 games per
                    year!
                </Typography>

                <Typography mt={2} variant='h5'>
                    Bots for Sparring 🤼
                </Typography>

                <Typography mt={4}>
                    We've decided that it is OK to spar against bots to fulfill certain sparring
                    requirements. Note that we still 100% recommend doing as much of your training
                    against a real person 🧍‍♂️, but if you have no other option, you can check out
                    Jesse's guide{' '}
                    <Link href='https://www.chessdojo.club/material/guides' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>

                <Typography mt={2} variant='h5'>
                    Repertoire Spy Tool 🔍
                </Typography>

                <Typography mt={4}>
                    Prepping for a game? Use our new tool to lookup any opponent on
                    Chess.com/Lichess. Stay tuned for Jesse's vid coming up. You can find the tool
                    by going{' '}
                    <Link href='https://www.chessdojo.club/games/analysis' target='_blank'>
                        here
                    </Link>
                    . and then selecting the '👨 Player' tab.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={spytool}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={2} variant='h5'>
                    DojoAI 🤖
                </Typography>

                <Typography mt={4}>
                    Got a question about the program? Ask our new{' '}
                    <Link href='https://www.chessdojo.club/help/chat' target='_blank'>
                        DojoAI
                    </Link>
                    ! Engineered by Jalp to answer all of your Dojo related questions.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={dojoai}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    That's all for now! Reminder that you can use code DOJO at checkout to get 40%
                    off your first month at{' '}
                    <Link href='https://chessdojo.club/' target='_blank'>
                        chessdojo.club.
                    </Link>
                </Typography>

                <Typography mt={4}>
                    <strong>
                        Thanks to all for making this the best chess training program out there!
                    </strong>{' '}
                </Typography>

                <Footer utmCampaign='digest17' />
            </Stack>
        </Container>
    );
}
