import { RatingSystem } from '@/database/user';
import Image from 'next/image';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import { SlGraph } from 'react-icons/sl';

import type { JSX } from 'react';

export const AcfIcon = ({ size = 'medium' }: { size?: 'small' | 'medium' }) => (
    <Image
        src='https://raw.githubusercontent.com/jalpp/DojoIcons/c9970eecc0bb27b7a85182d73fbd322787920e79/newIcons/Screen%20Shot%202024-07-18%20at%209.37.44%20PM.png'
        alt=''
        width={size === 'small' ? 20 : 40}
        height={size === 'small' ? 20 : 40}
    />
);

export const CfcIcon = ({ size = 'medium' }: { size?: 'small' | 'medium' }) => (
    <Image
        src='https://raw.githubusercontent.com/jalpp/DojoIcons/main/newIcons/Screen_Shot_2024-07-18_at_8.59.55_PM-removebg-preview.png'
        alt=''
        width={size === 'small' ? 22 : 45}
        height={size === 'small' ? 22 : 45}
    />
);

export const DwzIcon = ({ size = 'medium' }: { size?: 'small' | 'medium' }) => (
    <Image
        src='https://raw.githubusercontent.com/jalpp/DojoIcons/4e2551463c660c15d3623f82ee4075a17acf6b4f/newIcons/Screen_Shot_2024-07-18_at_9.34.32_PM-removebg-preview.png'
        alt=''
        width={size === 'small' ? 20 : 40}
        height={size === 'small' ? 20 : 40}
    />
);

export const EcfIcon = ({ size = 'medium' }: { size?: 'small' | 'medium' }) => (
    <Image
        src='https://raw.githubusercontent.com/jalpp/DojoIcons/4e2551463c660c15d3623f82ee4075a17acf6b4f/newIcons/ecf.jpeg'
        alt=''
        width={size === 'small' ? 20 : 40}
        height={size === 'small' ? 20 : 40}
    />
);

export const FideIcon = ({ size = 'medium' }: { size?: 'small' | 'medium' }) => (
    <Image
        src='https://raw.githubusercontent.com/jalpp/DojoIcons/main/newIcons/Fidelogo.svg.png'
        alt=''
        width={size === 'small' ? 20 : 40}
        height={size === 'small' ? 15 : 30}
    />
);

export const UscfIcon = ({ size = 'medium' }: { size?: 'small' | 'medium' }) => (
    <Image
        src='https://raw.githubusercontent.com/jalpp/DojoIcons/main/newIcons/uscf-removebg-preview(1).png'
        alt=''
        width={size === 'small' ? 22 : 45}
        height={size === 'small' ? 22 : 45}
    />
);

export const KnsbIcon = ({ size = 'medium' }: { size?: 'small' | 'medium' }) => (
    <Image
        src='https://raw.githubusercontent.com/jalpp/DojoIcons/7ea7378b821e00cac0bb17d073c2ae1eaf6cf5a1/newIcons/Screen%20Shot%202024-07-18%20at%209.46.50%20PM.png'
        alt=''
        width={size === 'small' ? 20 : 40}
        height={size === 'small' ? 20 : 40}
    />
);

export const RatingSystemIcon = ({
    system,
    size = 'medium',
}: {
    system: RatingSystem;
    size?: 'small' | 'medium';
}): JSX.Element => {
    switch (system) {
        case RatingSystem.Lichess:
            return <SiLichess size={size === 'small' ? 15 : 30} />;
        case RatingSystem.Chesscom:
            return <SiChessdotcom size={size === 'small' ? 15 : 30} style={{ color: '#81b64c' }} />;
        case RatingSystem.Fide:
            return <FideIcon size={size} />;
        case RatingSystem.Uscf:
            return <UscfIcon size={size} />;
        case RatingSystem.Cfc:
            return <CfcIcon size={size} />;
        case RatingSystem.Dwz:
            return <DwzIcon size={size} />;
        case RatingSystem.Acf:
            return <AcfIcon size={size} />;
        case RatingSystem.Ecf:
            return <EcfIcon size={size} />;
        case RatingSystem.Knsb:
            return <KnsbIcon size={size} />;
        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return <SlGraph size={size === 'small' ? 15 : 30} />;
    }
};
