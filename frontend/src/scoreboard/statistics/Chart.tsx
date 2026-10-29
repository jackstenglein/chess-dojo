import { ChartColors } from '@/style/ThemeProvider';
import CircleIcon from '@mui/icons-material/Circle';
import { Chip, Stack, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts';

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
    valueFormatter?: (value: number) => string;
    integerTicks?: boolean;
    stacked?: boolean;
    hideSums?: boolean;
    sumFormatter?: (sum: number) => string;
}

const Chart: React.FC<ChartProps> = ({
    title,
    series,
    valueFormatter,
    integerTicks,
    stacked,
    hideSums,
    sumFormatter,
}) => {
    return (
        <Stack>
            <Typography data-testid='chart-title' variant='subtitle1'>
                {title}
            </Typography>
            {!hideSums && (
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        mb: 1,
                        rowGap: 1,
                        flexWrap: 'wrap',
                    }}
                >
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
                                            color: `${ChartColors[i % ChartColors.length]} !important`,
                                        }}
                                    />
                                }
                            />
                        );
                    })}
                </Stack>
            )}
            <BarChart
                height={200}
                colors={ChartColors}
                hideLegend
                margin={{ top: 10 }}
                grid={{ horizontal: true, vertical: true }}
                xAxis={[
                    {
                        scaleType: 'band',
                        data: series[0]?.data.map((d) => d.cohort) ?? [],
                        height: 60,
                        tickLabelStyle: { angle: -60, textAnchor: 'end', fontSize: 10 },
                    },
                ]}
                yAxis={[
                    {
                        valueFormatter,
                        width: 'auto',
                        tickNumber: 5,
                        tickMinStep: integerTicks ? 1 : undefined,
                        tickLabelStyle: { fontSize: 10 },
                    },
                ]}
                series={series.map((s) => ({
                    label: s.label,
                    data: s.data.map((d) => d.value),
                    stack: stacked ? 'total' : undefined,
                    ...(valueFormatter && {
                        valueFormatter: (value: number | null) =>
                            value === null ? '' : valueFormatter(value),
                    }),
                }))}
            />
        </Stack>
    );
};

export default Chart;
