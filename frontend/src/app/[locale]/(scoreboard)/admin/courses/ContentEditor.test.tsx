import { Coach, Course, CourseModule, CourseModuleType, CourseType } from '@/database/course';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentEditor } from './ContentEditor';

const theme = createTheme();

function makeModule(overrides: Partial<CourseModule> = {}): CourseModule {
    return {
        id: overrides.id ?? 'mod-1',
        name: 'Intro video',
        type: CourseModuleType.Video,
        description: 'Watch this first.',
        postscript: '',
        videoUrls: ['https://youtu.be/abc'],
        pgns: [],
        coach: Coach.Jesse,
        positions: [],
        boardOrientation: 'white',
        ...overrides,
    };
}

function makeCourse(overrides: Partial<Course> = {}): Course {
    return {
        owner: 'admin',
        ownerDisplayName: 'Admin',
        stripeId: '',
        type: CourseType.Opening,
        id: '',
        name: 'Test course',
        description: 'Desc',
        color: 'None',
        cohorts: [],
        cohortRange: '',
        includedWithSubscription: false,
        availableForFreeUsers: true,
        purchaseOptions: [],
        chapters: [
            { name: 'Introduction', modules: [makeModule({ id: 'mod-1', name: 'Video 1' })] },
        ],
        imageUrl: '',
        videoUrl: '',
        ...overrides,
    };
}

function Harness({ initial }: { initial: Course }) {
    const [course, setCourse] = useState(initial);
    return (
        <ThemeProvider theme={theme}>
            <ContentEditor
                course={course}
                onChange={(update) => setCourse((current) => ({ ...current, ...update }))}
            />
        </ThemeProvider>
    );
}

afterEach(cleanup);

describe('ContentEditor', () => {
    it('shows an empty state when there are no chapters', () => {
        render(<Harness initial={makeCourse({ chapters: [] })} />);
        expect(
            screen.getByText(
                'No chapters yet. Add a chapter to start building the course content.',
            ),
        ).toBeInTheDocument();
    });

    it('adds a chapter', () => {
        render(<Harness initial={makeCourse({ chapters: [] })} />);
        fireEvent.click(screen.getByRole('button', { name: 'Add chapter' }));
        expect(screen.getByText('Chapter 1: Unnamed Chapter')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /chapter name/i })).toHaveValue('');
    });

    it('renames a chapter', () => {
        render(<Harness initial={makeCourse()} />);
        fireEvent.change(screen.getByRole('textbox', { name: /chapter name/i }), {
            target: { value: 'Foundations' },
        });
        expect(screen.getByText('Chapter 1: Foundations')).toBeInTheDocument();
    });

    it('hides chapter indices when the checkbox is unchecked', () => {
        render(<Harness initial={makeCourse()} />);
        fireEvent.click(screen.getByLabelText('Show chapter indices in table of contents'));
        expect(screen.getByText('Introduction')).toBeInTheDocument();
        expect(screen.queryByText(/Chapter 1/)).not.toBeInTheDocument();
    });

    it('moves a chapter down and back up', () => {
        render(
            <Harness
                initial={makeCourse({
                    chapters: [
                        { name: 'First', modules: [makeModule({ id: 'a' })] },
                        { name: 'Second', modules: [makeModule({ id: 'b' })] },
                    ],
                })}
            />,
        );

        const firstSummary = screen.getByText('Chapter 1: First').closest('.MuiAccordion-root');
        expect(firstSummary).toBeTruthy();
        fireEvent.click(within(firstSummary as HTMLElement).getByLabelText('Move chapter down'));
        expect(screen.getByText('Chapter 1: Second')).toBeInTheDocument();
        expect(screen.getByText('Chapter 2: First')).toBeInTheDocument();

        const moved = screen.getByText('Chapter 2: First').closest('.MuiAccordion-root');
        fireEvent.click(within(moved as HTMLElement).getByLabelText('Move chapter up'));
        expect(screen.getByText('Chapter 1: First')).toBeInTheDocument();
        expect(screen.getByText('Chapter 2: Second')).toBeInTheDocument();
    });

    it('removes a chapter', () => {
        render(<Harness initial={makeCourse()} />);
        fireEvent.click(screen.getByLabelText('Remove chapter'));
        expect(
            screen.getByText(
                'No chapters yet. Add a chapter to start building the course content.',
            ),
        ).toBeInTheDocument();
    });

    it('adds a module to a chapter', () => {
        render(<Harness initial={makeCourse()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Add module' }));
        expect(screen.getByText(/Module 2 \(/)).toBeInTheDocument();
    });

    it('shows video URL fields for video modules', () => {
        render(<Harness initial={makeCourse()} />);
        fireEvent.click(screen.getByText(/Module 1: Video 1/));
        expect(screen.getByLabelText('Video URL 1')).toHaveValue('https://youtu.be/abc');
        expect(screen.queryByLabelText('PGN 1')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Coach')).not.toBeInTheDocument();
    });

    it('shows PGN and board orientation fields for PGN viewer modules', () => {
        render(
            <Harness
                initial={makeCourse({
                    chapters: [
                        {
                            name: 'Games',
                            modules: [
                                makeModule({
                                    id: 'pgn',
                                    name: 'Model',
                                    type: CourseModuleType.PgnViewer,
                                    pgns: ['1. e4 e5'],
                                }),
                            ],
                        },
                    ],
                })}
            />,
        );
        fireEvent.click(screen.getByText(/Module 1: Model/));
        expect(screen.getByLabelText('PGN 1')).toHaveValue('1. e4 e5');
        expect(screen.getByLabelText('Board orientation')).toBeInTheDocument();
        expect(screen.queryByLabelText('Video URL 1')).not.toBeInTheDocument();
    });

    it('shows coach and PGN fields for exercise modules', () => {
        render(
            <Harness
                initial={makeCourse({
                    chapters: [
                        {
                            name: 'Tactics',
                            modules: [
                                makeModule({
                                    id: 'ex',
                                    name: 'Puzzles',
                                    type: CourseModuleType.Exercises,
                                    pgns: ['1. e4'],
                                }),
                            ],
                        },
                    ],
                })}
            />,
        );
        fireEvent.click(screen.getByText(/Module 1: Puzzles/));
        expect(screen.getByLabelText('Coach')).toBeInTheDocument();
        expect(screen.getByLabelText('PGN 1')).toHaveValue('1. e4');
    });

    it('adds and removes a sparring position', () => {
        render(
            <Harness
                initial={makeCourse({
                    chapters: [
                        {
                            name: 'Sparring',
                            modules: [
                                makeModule({
                                    id: 'sp',
                                    name: 'Positions',
                                    type: CourseModuleType.SparringPositions,
                                    positions: [],
                                }),
                            ],
                        },
                    ],
                })}
            />,
        );
        fireEvent.click(screen.getByText(/Module 1: Positions/));
        fireEvent.click(screen.getByRole('button', { name: 'Add position' }));
        expect(screen.getByLabelText('FEN')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Italian' } });
        expect(screen.getByLabelText('Title')).toHaveValue('Italian');
        fireEvent.click(screen.getByLabelText('Remove position'));
        expect(screen.queryByLabelText('FEN')).not.toBeInTheDocument();
    });

    it('removes a module', () => {
        render(
            <Harness
                initial={makeCourse({
                    chapters: [
                        {
                            name: 'Intro',
                            modules: [
                                makeModule({ id: 'a', name: 'Keep' }),
                                makeModule({ id: 'b', name: 'Drop' }),
                            ],
                        },
                    ],
                })}
            />,
        );
        fireEvent.click(screen.getByText(/Module 2: Drop/));
        const dropAccordion = screen.getByText(/Module 2: Drop/).closest('.MuiAccordion-root');
        fireEvent.click(within(dropAccordion as HTMLElement).getByLabelText('Remove module'));
        expect(screen.queryByText(/Module 2: Drop/)).not.toBeInTheDocument();
        expect(screen.getByText(/Module 1: Keep/)).toBeInTheDocument();
    });
});
