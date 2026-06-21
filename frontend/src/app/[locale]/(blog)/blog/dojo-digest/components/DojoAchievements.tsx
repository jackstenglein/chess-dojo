import { Typography } from '@mui/material';

export const DojoAchievements = ({
    rating,
    hours,
    points,
    graduations,
}: {
    rating: string;
    hours: string;
    points: string;
    graduations: string;
}) => {
    return (
        <Typography textAlign='center' mt={4}>
            The Dojo has collectively achieved:
            <br />
            <br />
            <strong>{rating}</strong> rating points gained
            <br />
            <strong>{hours}</strong> training hours logged
            <br />
            <strong>{points}</strong> Dojo points earned
            <br />
            <strong>{graduations}</strong> graduations
            <br />
            <br />
            Keep up the great work!
        </Typography>
    );
};
