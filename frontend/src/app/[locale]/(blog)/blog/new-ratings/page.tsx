import { Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import { Container } from '../common/Container';
import { Footer } from '../common/Footer';
import { Header } from '../common/Header';

export const metadata: Metadata = {
    title: 'The New Dojo Rating Translator',
    description: `One of the first and essential building stones of the Dojo Training Program was the creation of a universal rating system...`,
};

export default function NewRatings() {
    return (
        <Container>
            <Header
                title='The New Dojo Rating Translator'
                subtitle='Jesse Kraai • September 15, 2024'
            />

            <Stack mt={3}>
                <iframe
                    width='560'
                    height='315'
                    src='https://www.youtube.com/embed/WUlLQ7MiFrw'
                    title='YouTube video player'
                    frameBorder='0'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    referrerPolicy='strict-origin-when-cross-origin'
                    allowFullScreen
                ></iframe>

                <Typography mt={3}>
                    One of the first and essential building stones of the Dojo Training Program was
                    the creation of a universal rating system. It was a bit like creating a
                    universal currency from about eight national currencies. Obviously some of these
                    currencies will inflate and some will deflate, so there will never be a fixed
                    rate of exchange. And if you'll let me play this analogy out a little further:
                    in March the central bank of Fide dramatically loosened its key interest rate.
                    And it was this action which forced us to reevaluate our exchange rates.
                </Typography>

                <Typography mt={2}>
                    Let me describe what happened. When I was a kid (in the last millennium), you
                    had to have a rating of 2200 to get a Fide rating. But then, partly out of
                    democratic impulse, Fide gradually lowered its floor to 1000. The problem with
                    1000 is that several young and quickly improving players can achieve it. Imagine
                    thousands of young Indian kids, all rapidly improving. If they mostly play each
                    other, they will all remain around 1000 despite being around 1600 strength. And
                    if that 1000 rated player plays a game against a 1900, then deflation will
                    start. So, if Fide had kept the minimum rating at 2200 there would not have been
                    an inflationary impulse in the first place.
                </Typography>

                <Typography mt={2}>
                    Their controversial solution is the following formula: (0.4) x (2000-rating). So
                    if you are 2000+ you get nothing, whereas if you are 1000 you get catapulted to
                    1400. This is how we end up with the new floor (1400). It's controversial as it
                    adds a ton of points into the system and we don't know how it will play out,
                    especially at the top. Will Magnus eventually be 3100 now?
                </Typography>

                <Typography mt={2}>
                    For the Dojo rating system it's a real problem. We based our rating system on
                    the currency of Fide to begin with, but now our cohorts from 1000-2000 can't use
                    Fide as its base currency anymore because that 1000 point range has been
                    compressed to a 600 point range (1400-2000).
                </Typography>

                <Typography mt={2}>
                    So, what we've done (potentially as a temporary measure) is to base the currency
                    of the u/2000 cohorts on chess.com ratings. If the Fide ratings eventually sort
                    themselves by points trickling up the ladder, we may switch back to using Fide.
                </Typography>

                <Typography mt={2}>
                    We knew about this Fide problem when we decided to redo the translator. We did
                    not realize however how severe the inflation problem with Lichess had become.
                    Lichess gives every player who shows up on their site an initial rating of 1500
                    and this has driven those ratings up significantly since we did our first rating
                    translator several years ago. And the vast majority of the “demotions” that will
                    be taking place inside the Dojo are associated with this Lichess inflation.
                </Typography>

                <Typography mt={2}>
                    This is all a layman's conversation about this difficult topic. You can delve
                    deeper into the details on our{' '}
                    <Link
                        target='_blank'
                        href='https://discord.com/channels/951958534113886238/1283775011982934036'
                    >
                        Discord
                    </Link>{' '}
                    and you can see the complete new rating table{' '}
                    <Link target='_blank' href='/material/ratings'>
                        here
                    </Link>
                    .
                </Typography>

                <Typography mt={4}>
                    The Dojo heartily thanks Michael Franco, AKA{' '}
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/profile/google_114391023466287136398'
                    >
                        NoseKnowsAll
                    </Link>
                    , for running the numbers for us!
                </Typography>

                <Footer utmCampaign='new-ratings' />
            </Stack>
        </Container>
    );
}
