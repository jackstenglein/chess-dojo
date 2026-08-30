import { Link } from '@/components/navigation/Link';
import { Chapter, Course } from '@/database/course';
import {
    Card,
    CardContent,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Stack,
    Typography,
} from '@mui/material';
import { Fragment } from 'react/jsx-runtime';

interface ChapterContentsProps {
    type: string;
    id: string;
    chapter: Chapter;
    index: number;
    selectedChapter?: number;
    selectedModule?: number;
    onSelect?: (chapterIndex: number, moduleIndex: number) => void;
    hideIndices?: boolean;
}

const ChapterContents = ({
    type,
    id,
    chapter,
    index,
    selectedChapter,
    selectedModule,
    onSelect,
    hideIndices,
}: ChapterContentsProps) => {
    return (
        <List component='div' disablePadding sx={{ width: 1 }}>
            {chapter.modules.map((m, idx) => {
                const selected = selectedChapter === index && selectedModule === idx;
                const label = m.name || `Module ${idx + 1}`;
                return (
                    <ListItemButton
                        key={m.id || idx}
                        component={onSelect ? 'button' : Link}
                        onClick={onSelect ? () => onSelect(index, idx) : undefined}
                        href={onSelect ? undefined : `/courses/${type}/${id}/${index}/${idx}`}
                        selected={selected}
                        disableGutters
                        sx={{ width: 1 }}
                    >
                        <ListItemIcon sx={{ minWidth: '40px' }}>
                            {!hideIndices && (
                                <Stack
                                    sx={{
                                        alignItems: 'center',
                                        width: 1,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: 'primary.main',
                                        }}
                                    >
                                        {idx + 1}
                                    </Typography>
                                </Stack>
                            )}
                        </ListItemIcon>
                        <ListItemText primary={label} />
                    </ListItemButton>
                );
            })}
        </List>
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
                    <List component='nav' disablePadding sx={{ width: 1 }}>
                        {course.chapters.map((c, idx) => (
                            <Fragment key={idx}>
                                <ListSubheader disableGutters>
                                    {!course.hideChapterIndices && <>{idx + 1}.</>} {c.name}
                                </ListSubheader>
                                <ChapterContents
                                    type={course.type}
                                    id={course.id}
                                    chapter={c}
                                    index={idx}
                                    selectedChapter={selectedChapter}
                                    selectedModule={selectedModule}
                                    onSelect={onSelect}
                                    hideIndices={course.hideModuleIndices}
                                />
                            </Fragment>
                        ))}
                    </List>
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
