import { ChartColors } from '@/style/ThemeProvider';
import { LineChart } from '@mui/x-charts';

interface RatingHistoryChartProps {
    data: { date: Date; rating: number }[];
    label?: string;
}

export function RatingHistoryChart({ data, label }: RatingHistoryChartProps) {
    return (
        <LineChart
            colors={ChartColors}
            hideLegend
            grid={{ horizontal: true, vertical: true }}
            xAxis={[
                {
                    scaleType: 'time',
                    data: data.map((d) => d.date),
                    valueFormatter: (date: Date, context) =>
                        context.location === 'tick'
                            ? context.defaultTickLabel
                            : date.toLocaleDateString(),
                    tickLabelStyle: { fontSize: 10 },
                },
            ]}
            yAxis={[
                {
                    valueFormatter: (value: number) => `${value}`,
                    tickNumber: 8,
                    tickMinStep: 1,
                    width: 'auto',
                    tickLabelStyle: { fontSize: 10 },
                },
            ]}
            series={[
                {
                    label,
                    data: data.map((d) => d.rating),
                    showMark: false,
                    valueFormatter: (value) => `${value ?? ''}`,
                },
            ]}
        />
    );
}
