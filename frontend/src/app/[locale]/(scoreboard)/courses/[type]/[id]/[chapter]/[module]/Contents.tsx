import { Link } from '@/components/navigation/Link';
import { Chapter, Course } from '@/database/course';
import { Card, CardContent } from '@mui/material';

interface ChapterContentsProps {
    type: string;
    id: string;
    chapter: Chapter;
    index: number;
}

const ChapterContents = ({ type, id, chapter, index }: ChapterContentsProps) => {
    return (
        <ol>
            {chapter.modules.map((m, idx) => (
                <Link key={m.name} href={`/courses/${type}/${id}/${index}/${idx}`}>
                    <li>{m.name}</li>
                </Link>
            ))}
        </ol>
    );
};

interface ContentsProps {
    course: Course;
}

const Contents: React.FC<ContentsProps> = ({ course }) => {
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
                                {c.name}
                                <ChapterContents
                                    type={course.type}
                                    id={course.id}
                                    chapter={c}
                                    index={idx}
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
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default Contents;
