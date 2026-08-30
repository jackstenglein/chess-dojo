import { Link } from '@/components/navigation/Link';
import { Chapter, Course } from '@/database/course';
import { Box, Card, CardContent } from '@mui/material';

interface ChapterContentsProps {
    type: string;
    id: string;
    chapter: Chapter;
    index: number;
    selectedChapter?: number;
    selectedModule?: number;
    onSelect?: (chapterIndex: number, moduleIndex: number) => void;
}

const ChapterContents = ({
    type,
    id,
    chapter,
    index,
    selectedChapter,
    selectedModule,
    onSelect,
}: ChapterContentsProps) => {
    return (
        <ol>
            {chapter.modules.map((m, idx) => {
                const selected = selectedChapter === index && selectedModule === idx;
                const label = m.name || `Module ${idx + 1}`;
                if (onSelect) {
                    return (
                        <li key={m.id || idx}>
                            <Box
                                component='button'
                                type='button'
                                onClick={() => onSelect(index, idx)}
                                sx={{
                                    all: 'unset',
                                    cursor: 'pointer',
                                    fontWeight: selected ? 700 : undefined,
                                    color: selected ? 'primary.main' : 'inherit',
                                    '&:hover': { textDecoration: 'underline' },
                                }}
                            >
                                {label}
                            </Box>
                        </li>
                    );
                }
                return (
                    <Link key={m.name || idx} href={`/courses/${type}/${id}/${index}/${idx}`}>
                        <li>{m.name}</li>
                    </Link>
                );
            })}
        </ol>
    );
};

interface ContentsProps {
    course: Course;
    selectedChapter?: number;
    selectedModule?: number;
    onSelect?: (chapterIndex: number, moduleIndex: number) => void;
}

const Contents = ({ course, selectedChapter, selectedModule, onSelect }: ContentsProps) => {
    if (!course.chapters) {
        return null;
    }

    return (
        <Card variant='outlined'>
            <CardContent>
                {course.chapters.length > 1 && (
                    <ol style={{ paddingLeft: '16px' }}>
                        {course.chapters.map((c, idx) => (
                            <li key={idx}>
                                <Box
                                    component='span'
                                    sx={{
                                        fontWeight: selectedChapter === idx ? 600 : undefined,
                                    }}
                                >
                                    {c.name}
                                </Box>
                                <ChapterContents
                                    type={course.type}
                                    id={course.id}
                                    chapter={c}
                                    index={idx}
                                    selectedChapter={selectedChapter}
                                    selectedModule={selectedModule}
                                    onSelect={onSelect}
                                />
                            </li>
                        ))}
                    </ol>
                )}

                {course.chapters.length === 1 && (
                    <ChapterContents
                        type={course.type}
                        id={course.id}
                        chapter={course.chapters[0]}
                        index={0}
                        selectedChapter={selectedChapter}
                        selectedModule={selectedModule}
                        onSelect={onSelect}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default Contents;
