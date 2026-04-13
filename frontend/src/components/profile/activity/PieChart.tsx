import CircleIcon from '@mui/icons-material/Circle';
import { Box, Container, Stack, Typography } from '@mui/material';
import { useMemo, useState, type JSX, type ReactNode } from 'react';
import { PieChart as ReactPieChart } from 'react-minimal-pie-chart';
import Tooltip from 'react-tooltip';

const defaultLabelStyle = {
    fontSize: '5px',
    fontFamily: 'sans-serif',
};

export interface PieChartData {
    name: string;
    value: number;
    color: string;
    count?: number;
}

interface PieChartProps {
    id: string;
    title: string;
    data: PieChartData[];
    renderTotal: (value: number) => JSX.Element;
    getTooltip: (entry: PieChartData) => ReactNode;
    onClick: (event: React.MouseEvent, dataIndex: number) => void;
}

const PieChart: React.FC<PieChartProps> = ({
    id,
    title,
    data,
    renderTotal,
    getTooltip,
    onClick,
}) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const totalScore = useMemo(() => {
        return data.reduce((sum, curr) => sum + curr.value, 0);
    }, [data]);

    return (
        <Stack justifyContent='center' alignItems='center'>
            <Typography variant='h6' textAlign='center'>
                {title}
            </Typography>
            {renderTotal(totalScore)}

            {data.length === 0 && <Typography>No data</Typography>}

            {data.length > 0 && (
                <Container maxWidth='sm' sx={{ mt: 1 }}>
                    <Box data-tip='' data-for={id}>
                        <ReactPieChart
                            label={({ dataEntry }) => `${Math.round(dataEntry.percentage)}%`}
                            labelStyle={defaultLabelStyle}
                            labelPosition={65}
                            data={data}
                            onMouseOver={(_, index) => {
                                setHovered(index);
                            }}
                            onMouseOut={() => {
                                setHovered(null);
                            }}
                            onClick={onClick}
                        />
                        <Tooltip
                            id={id}
                            getContent={() =>
                                hovered === null ? undefined : (
                                    <div style={{ whiteSpace: 'pre-line' }}>
                                        {getTooltip(data[hovered])}
                                    </div>
                                )
                            }
                        />
                    </Box>
                    <Stack
                        direction='row'
                        spacing={2}
                        justifyContent='center'
                        mt={2}
                        flexWrap='wrap'
                        rowGap={1}
                    >
                        {data.map((d) => (
                            <Stack key={d.name} direction='row' alignItems='center'>
                                <CircleIcon sx={{ color: d.color }} />
                                <Typography ml={'2px'}>{d.name}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Container>
            )}
        </Stack>
    );
};

export default PieChart;
