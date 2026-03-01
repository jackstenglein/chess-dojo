import { EngineName } from '@/stockfish/engine/engine';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
    Alarm,
    AllInclusiveRounded,
    AutoStories,
    Backup,
    Biotech,
    BorderColor,
    CalendarMonth,
    ControlCamera,
    Create,
    CrisisAlert,
    DashboardCustomize,
    DoDisturb,
    Download,
    Dvr,
    EditCalendar,
    ElectricBolt,
    EmojiObjects,
    Event,
    EventAvailable,
    EventAvailableOutlined,
    Explore,
    FlashOn,
    GridView,
    Group,
    Groups,
    Info,
    KeyboardArrowDown,
    KeyboardArrowUp,
    KeyboardDoubleArrowDown,
    KeyboardDoubleArrowUp,
    Leaderboard,
    Link,
    LiveTv,
    LocalHospital,
    LocationOn,
    Login,
    MenuBook,
    MilitaryTech,
    Notes,
    PeopleOutline,
    Person,
    PersonOutline,
    PhoneAndroid,
    PunchClock,
    QueryBuilder,
    RestartAlt,
    RocketLaunch,
    Save,
    School,
    Science,
    Search,
    Speed,
    SportsScore,
    Stadium,
    ThumbUp,
    Today,
    Troubleshoot,
    Visibility,
    WavingHand,
    Whatshot,
    ZoomOutMap,
} from '@mui/icons-material';
import PublishIcon from '@mui/icons-material/Publish';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { SvgIcon, SvgIconProps } from '@mui/material';
import React, { forwardRef } from 'react';
import {
    AvailabilityType,
    CalendarSessionType,
    EventType,
    PositionType,
    TimeControlType,
    TournamentType,
} from '../database/event';
import { RequirementCategory } from '../database/requirement';
import { ChessDojoIcon } from './ChessDojoIcon';
import { RookIcon } from './ChessIcons';
import { PresenterIcon } from './PresenterIcon';
import { DiscordIcon, TwitchIcon, YoutubeIcon } from './SocialMediaIcons';

export const icons = {
    [RequirementCategory.SuggestedTasks]: Today,
    [RequirementCategory.Welcome]: WavingHand,
    [RequirementCategory.Games]: Biotech,
    [RequirementCategory.Tactics]: Speed,
    [RequirementCategory.Middlegames]: MenuBook,
    [RequirementCategory.Endgame]: SportsScore,
    [RequirementCategory.Opening]: CrisisAlert,
    [RequirementCategory.NonDojo]: LiveTv,
    [RequirementCategory.Graduation]: School,
    Annotations: BorderColor,
    Followers: ThumbUp,
    followers: ThumbUp,
    'All Categories': AllInclusiveRounded,
    warning: ReportProblemIcon,
    submit: PublishIcon,
    clubs: Groups,
    search: Search,
    explore: Explore,
    cohort: Group,
    player: Person,
    upload: Backup,
    line: PeopleOutline,
    download: Download,
    eye: Visibility,
    clock: QueryBuilder,
    eventCheck: EventAvailable,
    liga: MilitaryTech,
    meet: Event,
    all: AllInclusiveRounded,
    'All Types': AllInclusiveRounded,
    Blitz: Whatshot,
    Rapid: FlashOn,
    Classical: PunchClock,
    [TimeControlType.Blitz]: Whatshot,
    [TimeControlType.Rapid]: FlashOn,
    [TimeControlType.Classical]: PunchClock,
    [TimeControlType.AllTimeContols]: AllInclusiveRounded,
    'Classical Game': PunchClock,
    'Dojo Events': LiveTv,
    'Coaching Sessions': RocketLaunch,
    avilb: EditCalendar,
    [AvailabilityType.ClassicalGame]: PunchClock,
    [AvailabilityType.OpeningSparring]: CrisisAlert,
    [AvailabilityType.MiddlegameSparring]: MenuBook,
    [AvailabilityType.EndgameSparring]: SportsScore,
    [AvailabilityType.RookEndgameProgression]: RookIcon,
    [AvailabilityType.ClassicAnalysis]: Science,
    [AvailabilityType.AnalyzeOwnGame]: Biotech,
    [AvailabilityType.BookStudy]: AutoStories,
    [AvailabilityType.AllTypes]: AllInclusiveRounded,
    [AvailabilityType.Lesson]: School,
    'Opening Sparring': CrisisAlert,
    'Middlegame Sparring': MenuBook,
    'Endgame Sparring': SportsScore,
    'Analyze Classic Game': Science,
    'Analyze Own Game': Biotech,
    'Book Study': AutoStories,
    'Rook Endgame Progression': RookIcon,
    discord: DiscordIcon,
    twitch: TwitchIcon,
    youtube: YoutubeIcon,
    'Middlegame Win Conversions': ControlCamera,
    'Endgame Win Conversions': ZoomOutMap,
    'Endgame Algorithms': EmojiObjects,
    reset: RestartAlt,
    cancel: DoDisturb,
    save: Save,
    location: LocationOn,
    write: Create,
    join: Login,
    notes: Notes,
    participant: PersonOutline,
    [TournamentType.Arena]: Stadium,
    [TournamentType.Swiss]: LocalHospital,
    [TournamentType.AllTournamentTypes]: AllInclusiveRounded,
    Swiss: LocalHospital,
    Arena: Stadium,
    tc: Alarm,
    [PositionType.Standard]: GridView,
    [PositionType.Custom]: DashboardCustomize,
    [PositionType.AllPositions]: AllInclusiveRounded,
    ligaCalendar: CalendarMonth,
    leaderboard: Leaderboard,
    info: Info,
    [EventType.Availability]: Event,
    [EventType.Coaching]: RocketLaunch,
    [EventType.Dojo]: ChessDojoIcon,
    [EventType.LigaTournament]: MilitaryTech,
    [CalendarSessionType.AllSessions]: AllInclusiveRounded,
    [CalendarSessionType.Availabilities]: Event,
    [CalendarSessionType.CoachingSessions]: RocketLaunch,
    [CalendarSessionType.DojoEvents]: LiveTv,
    [CalendarSessionType.Meetings]: EventAvailableOutlined,
    [CalendarSessionType.Lectures]: PresenterIcon,
    [CalendarSessionType.GameReviews]: Troubleshoot,
    menuUp: KeyboardDoubleArrowUp,
    menuDown: KeyboardDoubleArrowDown,
    innerMenuUp: KeyboardArrowUp,
    innerMenuDown: KeyboardArrowDown,
    spar: Link,
    [EngineName.Stockfish11]: ElectricBolt,
    [EngineName.Stockfish16]: PhoneAndroid,
    [EngineName.Stockfish17]: Dvr,
    [EngineName.Stockfish18]: Dvr,
};

export type IconName = keyof typeof icons;

export interface IconProps extends SvgIconProps {
    name?: IconName;
}

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
    if (!name || !icons[name]) {
        return null;
    }

    const InternalIcon = icons[name];
    return <InternalIcon {...props} />;
};

export default Icon;

type FontAwesomeSvgIconProps = SvgIconProps & {
    icon: IconDefinition;
};

export const FontAwesomeSvgIcon = forwardRef<SVGSVGElement, FontAwesomeSvgIconProps>(
    (props, ref) => {
        const { icon, ...others } = props;

        const {
            icon: [width, height, , , svgPathData],
        } = icon;

        return (
            <SvgIcon
                ref={ref}
                viewBox={`0 0 ${width} ${height}`}
                fontSize='small'
                className='MuiChip-icon'
                {...others}
            >
                {typeof svgPathData === 'string' ? (
                    <path d={svgPathData} />
                ) : (
                    /**
                     * A multi-path Font Awesome icon seems to imply a duotune icon. The 0th path seems to
                     * be the faded element (referred to as the "secondary" path in the Font Awesome docs)
                     * of a duotone icon. 40% is the default opacity.
                     *
                     * @see https://fontawesome.com/how-to-use/on-the-web/styling/duotone-icons#changing-opacity
                     */
                    svgPathData.map((d: string, i: number) => (
                        <path key={i} style={{ opacity: i === 0 ? 0.4 : 1 }} d={d} />
                    ))
                )}
            </SvgIcon>
        );
    },
);
FontAwesomeSvgIcon.displayName = 'FontAwesomeSvgIcon';
