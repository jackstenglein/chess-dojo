import { Box, Card, Container, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type JSX, type ReactNode } from 'react';
import { PieChart as ReactPieChart } from 'react-minimal-pie-chart';

const defaultLabelStyle = {
    fontSize: '5.5px',
    fontFamily: 'inherit',
    fontWeight: 500,
    fill: '#fff',
    // A soft shadow (not a hard outline) keeps the white text legible against every slice
    // color without looking like a heavy stencil.
    filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.85))',
    pointerEvents: 'none' as const,
};

/** Below this slice share there's rarely room to read the percentage label cleanly. */
const MIN_LABEL_PERCENT = 5;

export interface PieChartData {
    name: string;
    value: number;
    color: string;
    count?: number;
}

interface PieChartProps {
    title: string;
    data: PieChartData[];
    renderTotal: (value: number) => JSX.Element;
    getTooltip: (entry: PieChartData) => ReactNode;
    onClick: (event: React.MouseEvent, dataIndex: number) => void;
}

const PieChart: React.FC<PieChartProps> = ({ title, data, renderTotal, getTooltip, onClick }) => {
    const t = useTranslations('profile.activity');
    const [hovered, setHovered] = useState<number | null>(null);
    const totalScore = useMemo(() => {
        return data.reduce((sum, curr) => sum + curr.value, 0);
    }, [data]);

    return (
        <Card
            variant='outlined'
            sx={{
                borderRadius: 3,
                py: 3,
                px: 2,
            }}
        >
            <Stack
                sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Typography
                    variant='h6'
                    sx={{
                        textAlign: 'center',
                        fontWeight: 600,
                    }}
                >
                    {title}
                </Typography>
                {renderTotal(totalScore)}

                {data.length === 0 && <Typography>{t('noData')}</Typography>}

                {data.length > 0 && (
                    <Container maxWidth='sm' sx={{ mt: 2 }}>
                        <Tooltip
                            arrow
                            followCursor
                            title={
                                <div style={{ whiteSpace: 'pre-line' }}>
                                    {hovered !== null ? getTooltip(data[hovered]) : null}
                                </div>
                            }
                            slotProps={{
                                tooltip: {
                                    sx: {
                                        bgcolor: 'background.paper',
                                        color: 'text.primary',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: 4,
                                        borderRadius: 2,
                                        p: 1.5,
                                        maxWidth: 280,
                                        fontSize: '0.8125rem',
                                    },
                                },
                                arrow: {
                                    sx: {
                                        color: 'background.paper',
                                        '&::before': {
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        },
                                    },
                                },
                            }}
                        >
                            <Box>
                                <ReactPieChart
                                    data={data}
                                    animate
                                    animationDuration={400}
                                    label={({ dataEntry }) =>
                                        dataEntry.percentage >= MIN_LABEL_PERCENT
                                            ? `${Math.round(dataEntry.percentage)}%`
                                            : ''
                                    }
                                    labelStyle={defaultLabelStyle}
                                    labelPosition={65}
                                    segmentsStyle={{ cursor: 'pointer' }}
                                    onMouseOver={(_, index) => {
                                        setHovered(index);
                                    }}
                                    onMouseOut={() => {
                                        setHovered(null);
                                    }}
                                    onClick={onClick}
                                />
                            </Box>
                        </Tooltip>
                        <Stack
                            direction='row'
                            spacing={1}
                            sx={{
                                justifyContent: 'center',
                                mt: 1,
                                flexWrap: 'wrap',
                                rowGap: 1,
                            }}
                        >
                            {data.map((d) => (
                                <Stack
                                    key={d.name}
                                    direction='row'
                                    spacing={0.75}
                                    sx={{
                                        alignItems: 'center',
                                        py: 0.5,
                                        px: 1.25,
                                        borderRadius: 5,
                                        bgcolor: `${d.color}1f`,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            bgcolor: d.color,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                        {d.name}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Container>
                )}
            </Stack>
        </Card>
    );
};

export default PieChart;
