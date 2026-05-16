import { Container, Divider, Link, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import ratingChart from './rating-chart.png';
import ratingsImage01 from './ratings-image01.png';
import ratingsImage02 from './ratings-image02.png';
import ratingsImage03 from './ratings-image03.png';
import ratingsImage04 from './ratings-image04.png';
import ratingsImage05 from './ratings-image05.png';
import ratingsImage06 from './ratings-image06.png';
import ratingsImage07 from './ratings-image07.png';
import ratingsImage08 from './ratings-image08.png';

export const metadata: Metadata = {
    title: 'Universal Rating Converter for 2024 | NoseKnowsAll',
    description: `NoseKnowsAll explains the math behind ChessDojo's new universal rating calculator.`,
};

export default function DojoTalksTop2025() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Header
                title='Universal Rating Converter for 2024'
                subtitle='NoseKnowsAll • September 24, 2024'
            />
            <Typography mb={3}>
                <strong>Have you ever wondered what your different OTB ratings would be?</strong>
            </Typography>
            <Typography>
                This month, I was tasked by{' '}
                <Link href='https://www.chessdojo.club/'>ChessDojo</Link> to improve their rating
                converter that maps the vast majority of classical chess ratings to each other. Most
                of us have heard about the FIDE rating boost that was applied in March 2024 to all
                players under 2000 FIDE. Because of the seismic shift this rating compression
                created in FIDE ratings, I decided to start from scratch and generate new ways to
                map all the ratings to each other. A key challenge in creating this universal rating
                converter was determining which ratings were stable and reliable, and which ratings
                should be largely ignored.
            </Typography>
            <br />
            <Typography mt={3} variant='h5'>
                <strong>The Universal Rating Converter</strong>
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>
                Without further ado, here is the universal rating converter, updated in September
                2024. If you have a classical chess rating either online or OTB, you should be able
                to look up your cohort and approximate what rating you would have in any other
                rating system*** by simply reading across the row!
            </Typography>
            <Image
                src={ratingChart}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                * The above ratings refer to your classical Lichess rating or rapid Chess.com
                rating. Blitz ratings do not apply.
                <br />
                <br />
                ** My CFC data sources are a bit lacking, so please take those numbers with a grain
                of salt.
                <br />
                <br />
                *** I cannot include every single classical rating system in this converter, but
                hopefully I have covered the majority of them.
            </Typography>
            <br />
            <Typography mt={3} variant='h5'>
                <strong>Determining The Converted Ratings</strong>
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>
                The ultimate goal of this converter is to be able to accurately compare a player's
                strength across all the rating systems even if they only have played classical games
                in one or two of these rating systems.
                <br />
                <br />
                In determining these numbers, I compared OTB ratings to other OTB ratings when
                available. I also compared OTB ratings to online ratings (with low rating deviation)
                when available.
                <br />
                <br />I took data from many sources: thousands of ChessDojo training program members
                who had low rating deviations in their classical Lichess ratings and/or rapid
                Chess.com ratings but also had an OTB rating, the FIDE player list, the ACF player
                list, the DWZ player list, and the ECF player list, all from September 1st 2024. I
                tried to only consider data that was reliable by basing the ratings mostly on
                online:OTB ratings for the lower rated cohorts and OTB:OTB ratings for the higher
                rated cohorts. Since the pool of online players thins out dramatically near the very
                top, I can only truly compare their OTB ratings to each other.
                <br />
                <br />
                As an example, consider someone who has a 1550 Lichess classical rating, 1050
                Chess.com rapid rating, and 1430 FIDE rating. They are much more likely to have
                accurate online ratings rather than OTB. In contrast, someone who has a 2300 Lichess
                classical rating and 1850 Chess.com rapid rating, but is 2100 FIDE and 2300 USCF is
                much more likely to have accurate OTB ratings. There are a variety of reasons why
                someone of that strength has a low Chess.com rating (they prefer Lichess, they use
                Chess.com just to try random openings, they don't care about that rating and so are
                happy to abort the occasional game, they don't like running into cheaters and so
                don't play often). Therefore, my model won't weigh them heavily when determining the
                FIDE:Lichess mapping, for instance.
                <br />
                <br /> Now let's play with the underlying data and create some interesting plots!
            </Typography>
            <br />

            <Image
                src={ratingsImage01}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot only includes accurate Lichess classical and accurate Chess.com rapid
                ratings of ChessDojo training program members.
            </Typography>
            <br />
            <Image
                src={ratingsImage02}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot only includes accurate Chess.com rapid ratings and FIDE standard
                ratings of ChessDojo training program members.
            </Typography>
            <br />

            <Image
                src={ratingsImage03}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot only includes accurate Lichess classical and accurate USCF regular
                ratings of ChessDojo training program members.
            </Typography>
            <br />

            <Image
                src={ratingsImage04}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot only includes accurate USCF regular ratings and FIDE standard ratings
                of ChessDojo training program members.
            </Typography>
            <br />

            <Image
                src={ratingsImage05}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot includes all active ECF members with a FIDE rating as of September
                1st, 2024.
            </Typography>
            <br />

            <Image
                src={ratingsImage06}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot only includes ECF ratings and accurate Chess.com rapid ratings of
                ChessDojo training program members.
            </Typography>
            <br />

            <Image
                src={ratingsImage07}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot includes all active DWZ members with a FIDE standard rating as of
                September 1st, 2024.
            </Typography>
            <br />

            <Image
                src={ratingsImage08}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <Typography>
                The above plot only includes representative ACF members, who were hand-picked by ACF
                for their accurate ratings, with a FIDE standard rating as of September 1st, 2024.
            </Typography>

            <br />
            <Typography mt={3} variant='h5'>
                Interesting Conclusions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>
                Based on my input data and the above plots (among others I generated - I did not
                want to burden readers with infinite plots!), we are able to draw some interesting
                conclusions.
            </Typography>
            <br />

            <ol>
                <li>
                    Even the absolute lowest OTB ratings don't correspond well to online ratings.
                    Anyone rated under 1250 Lichess classical or 550 Chess.com rapid is
                    characterized as a complete beginner according to most OTB ratings shown above.
                    That's practically 20% of all Lichess classical players and 42% of all Chess.com
                    rapid players. That gives you an idea of how much tougher OTB is compared to
                    online. You should be stronger than a decent amount of online players before it
                    makes any sense to even try for an OTB rating.
                </li>
                <br />
                <li>
                    The absolute top of the online rating pools do not provide reasonable estimates
                    for OTB ratings. I would personally draw the line at 2275 Chess.com rapid and
                    2310 Lichess classical ratings --- those are probably the highest online ratings
                    to provide an accurate estimate for OTB strength. Above that, you simply don't
                    have a player base on either website. These ratings corresponds to the 99.5
                    percentile on Lichess and the 99.9 percentile on Chess.com. According to my
                    estimator, gaining a measly 160 Lichess classical rating points takes you from a
                    good club player at 2000 FIDE to GM strength. That shouldn't make sense to you
                    because it doesn't make sense! There just aren't many titled players playing
                    classical time controls online for that rating to be meaningful.
                </li>
                <br />
                <li>
                    USCF players indeed do not have accurate FIDE ratings until roughly the 2000
                    FIDE mark. This is shown by the fact that the model comparing the ratings
                    underestimates the actual FIDE ratings of the players until near the top. This
                    effect has been noted by many people in the past - there simply are not enough
                    FIDE tournaments in the USA for players to get an accurate FIDE rating. To a
                    lesser extent, this is true when comparing the ECF to FIDE ratings as well.
                </li>
                <br />
                <li>
                    {' '}
                    <Link href='https://www.englishchess.org.uk/recommended-conversion-of-ecf-to-fide-ratings/'>
                        ECF has reported
                    </Link>{' '}
                    an easy way to compare ECF and FIDE ratings. Based on my results, I believe
                    their measurement underestimates a player's FIDE rating for the low end and
                    overestimates a player's FIDE rating for the high end. If you want an extremely
                    simple estimator, I think a more accurate estimate is ECF = 1.4 * FIDE - 715
                    under 1940 FIDE, and ECF = FIDE + 60 for players over 1940 FIDE. If you want to
                    flip the mapping around: FIDE = 1/(1.4) * ECF + 510 for players under 2000 ECF,
                    and FIDE = ECF - 60 for players over 2000 FIDE. Hopefully, this more accurate
                    mapping is clean enough for ECF members to prefer instead.
                </li>
                <br />
                <li>
                    The sad necessity to use Chess.com rapid ratings rather than a classical rating
                    is annoying. If Chess.com had a classical time control, then we would truly be
                    able to compare apples to apples. Unfortunately, they do not have a classical
                    time control. Therefore, this converter unfortunately is unevenly influenced by
                    comparing 10+0 games on Chess.com to 90+30 games OTB and on Lichess. There's no
                    way around that, and it makes for a less satisfying comparison with what is the
                    biggest player base: Chess.com users.
                </li>
                <br />
                <li>
                    I didn't have more than a few hundred (some of which were not accurate) data
                    points to work with when deriving the CFC rating comparisons. Please take those
                    numbers as broad approximations with a grain of salt.
                </li>
            </ol>

            <Typography mt={3} variant='h5'>
                Final Thoughts
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography>
                I hope you have gotten something useful out of this universal rating converter! Let
                me know in the comments if you see something else surprising that you think I should
                address.
                <br />
                <br />
                If you are looking for a structured training program for all levels from 0-2500
                along with an active and supportive community, please check out{' '}
                <Link href='https://www.chessdojo.club/'>the ChessDojo training program</Link>, for
                whom I was originally tasked with creating this converter. There is a free version
                if you're just looking for what training plan they suggest for each of the cohorts.
                Personally, I've been a paying member for more than 2 years now and couldn't be
                happier with the community and material they recommend.
            </Typography>

            <Divider sx={{ my: 6 }} />
            <Footer utmSource='new-ratings' utmCampaign='noseknowsall' />
        </Container>
    );
}
