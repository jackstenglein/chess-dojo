import { MastersCohort } from '@/database/game';
import { ALL_COHORTS } from '@/database/user';
import { AllInclusive } from '@mui/icons-material';
import { SvgIconProps, Tooltip, tooltipClasses } from '@mui/material';
import { SxProps } from '@mui/material/styles';
import Image from 'next/image';
import { CSSProperties } from 'react';

export const cohortIcons: Record<string, string> = {
    '0-300': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/0-300.png',
    '300-400': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/300-400.png',
    '400-500': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/400-500.png',
    '500-600': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/500-600.png',
    '600-700': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/600-700.png',
    '700-800': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/700-800.png',
    '800-900': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/800-900.png',
    '900-1000': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/900-1000.png',
    '1000-1100': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1000-1100.png',
    '1100-1200': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1100-1200.png',
    '1200-1300': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1200-1300.png',
    '1300-1400': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1300-1400.png',
    '1400-1500': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1400-1500.png',
    '1500-1600': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1500-1600.png',
    '1600-1700': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1600-1700.png',
    '1700-1800': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1700-1800.png',
    '1800-1900': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1800-1900.png',
    '1900-2000': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/1900-2000.png',
    '2000-2100': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/2000-2100.png',
    '2100-2200': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/2100-2200.png',
    '2200-2300': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/2200-2300.png',
    '2300-2400': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/2300-2400.png',
    '2400+': 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/2300-2400.png',
    [MastersCohort]: 'https://chess-dojo-images.s3.amazonaws.com/icons/v3/2300-2400.png',
};

interface CohortIconProps {
    cohort?: string;
    size?: number;
    sx?: SxProps;
    tooltip?: string;
    skipCache?: boolean;
}

const CohortIcon: React.FC<CohortIconProps & SvgIconProps> = ({
    cohort,
    size = 40,
    sx,
    tooltip,
    skipCache,
    ...svgProps
}) => {
    if (!cohort) {
        return null;
    }

    if (cohort === ALL_COHORTS) {
        return <AllInclusive sx={sx} {...svgProps} />;
    }

    const url = cohortIcons[cohort];
    if (!url) {
        return null;
    }

    return (
        <Tooltip
            title={tooltip !== undefined ? tooltip : `Graduated from ${cohort}`}
            sx={{
                [`& .${tooltipClasses.tooltip}`]: {
                    zIndex: 1301,
                },
            }}
        >
            <Image
                data-testid='graduation-icon'
                src={`${url}${skipCache ? `?bypassCache=${new Date().getTime()}` : ''}`}
                alt=''
                width={size}
                height={size}
                style={{
                    ...(sx as CSSProperties),

                    ...(cohort === '2300-2400'
                        ? { filter: `drop-shadow(0px 0px ${size / 8}px silver)` }
                        : {}),
                    ...(cohort === '2400+'
                        ? { filter: `drop-shadow(0px 0px ${size / 8}px #fedf53` }
                        : {}),
                    ...(cohort === MastersCohort
                        ? { filter: `drop-shadow(0px 0px ${size / 8}px #22a2f2` }
                        : {}),
                }}
            />
        </Tooltip>
    );
};

export default CohortIcon;
