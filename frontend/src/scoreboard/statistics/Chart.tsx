import CircleIcon from '@mui/icons-material/Circle';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { AxisOptions, Chart as ReactChart } from 'react-charts';

import { useAuth } from '../../auth/Auth';

export interface Datum {
    cohort: string;
    value: number;
}

export interface Series {
    label: string;
    data: Datum[];
}

interface ChartProps {
    title: string;
    series: Series[];
    primaryAxis: AxisOptions<Datum>;
    secondaryAxes: AxisOptions<Datum>[];
    hideSums?: boolean;
    sumFormatter?: (sum: number) => string;
}

const colors = [
    'rgb(15, 131, 171)',
    'rgb(250, 164, 58)',
    'rgb(253, 104, 104)',
    'rgb(83, 207, 201)',
    'rgb(162, 217, 37)',
    'rgb(222, 207, 63)',
    'rgb(115, 79, 233)',
    'rgb(205, 130, 173)',
];

const Chart: React.FC<ChartProps> = ({
    title,
    series,
    primaryAxis,
    secondaryAxes,
    hideSums,
    sumFormatter,
}) => {
    const user = useAuth().user;

    return (
        <Stack>
            <Typography data-testid='chart-title' variant='subtitle1'>
                {title}
            </Typography>
            {!hideSums && (
                <Stack direction='row' spacing={1} mb={1} rowGap={1} flexWrap='wrap'>
                    {series.map((s, i) => {
                        const sum = s.data.reduce((sum, d) => sum + d.value, 0);
                        const formattedSum = sumFormatter ? sumFormatter(sum) : sum;
                        return (
                            <Chip
                                key={s.label}
                                label={`${formattedSum} ${s.label}`}
                                size='small'
                                icon={
                                    <CircleIcon
                                        sx={{
                                            color: `${colors[i % colors.length]} !important`,
                                        }}
                                    />
                                }
                            />
                        );
                    })}
                </Stack>
            )}
            <Box height='200px'>
                <ReactChart
                    options={{
                        data: series,
                        primaryAxis,
                        secondaryAxes,
                        dark: !user?.enableLightMode,
                    }}
                />
            </Box>
        </Stack>
    );
};

export default Chart;
