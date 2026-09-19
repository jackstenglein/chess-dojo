import { Chapter, Coach, coaches, Course, CourseModule, CourseModuleType } from '@/database/course';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    emptyChapter,
    emptyModule,
    emptyPosition,
    MODULE_TYPE_LABELS,
    moveItem,
    removeItem,
    replaceItem,
} from './courseEditor';

export function ContentEditor({
    course,
    onChange,
}: {
    course: Course;
    onChange: (update: Partial<Course>) => void;
}) {
    const chapters = course.chapters ?? [];

    return (
        <Stack spacing={2}>
            <FormControlLabel
                label='Show chapter indices in table of contents'
                control={
                    <Checkbox
                        checked={!course.hideChapterIndices}
                        onChange={(e) => onChange({ hideChapterIndices: !e.target.checked })}
                    />
                }
            />
            <FormControlLabel
                label='Show module indices in table of contents'
                control={
                    <Checkbox
                        checked={!course.hideModuleIndices}
                        onChange={(e) => onChange({ hideModuleIndices: !e.target.checked })}
                    />
                }
            />

            <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='h6'>Chapters</Typography>
                <Button onClick={() => onChange({ chapters: [...chapters, emptyChapter()] })}>
                    Add chapter
                </Button>
            </Stack>
            {chapters.length === 0 && (
                <Typography sx={{ color: 'text.secondary' }}>
                    No chapters yet. Add a chapter to start building the course content.
                </Typography>
            )}
            {chapters.map((chapter, index) => (
                <Accordion key={index} defaultExpanded={index === 0} variant='outlined'>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 600 }}>
                            {!course.hideChapterIndices && (
                                <>
                                    Chapter {index + 1}
                                    {': '}
                                </>
                            )}
                            {chapter.name || 'Unnamed Chapter'}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <ChapterEditor
                            chapter={chapter}
                            index={index}
                            total={chapters.length}
                            onChange={(next) =>
                                onChange({ chapters: replaceItem(chapters, index, next) })
                            }
                            onMove={(delta) =>
                                onChange({ chapters: moveItem(chapters, index, delta) })
                            }
                            onRemove={() => onChange({ chapters: removeItem(chapters, index) })}
                        />
                    </AccordionDetails>
                </Accordion>
            ))}
        </Stack>
    );
}

function ChapterEditor({
    chapter,
    index,
    total,
    onChange,
    onMove,
    onRemove,
}: {
    chapter: Chapter;
    index: number;
    total: number;
    onChange: (chapter: Chapter) => void;
    onMove: (delta: number) => void;
    onRemove: () => void;
}) {
    return (
        <Stack spacing={2}>
            <Stack direction='row' sx={{ gap: 1, justifyContent: 'flex-end' }}>
                <IconButton
                    aria-label='Move chapter up'
                    disabled={index === 0}
                    onClick={() => onMove(-1)}
                >
                    <ArrowUpwardIcon />
                </IconButton>
                <IconButton
                    aria-label='Move chapter down'
                    disabled={index === total - 1}
                    onClick={() => onMove(1)}
                >
                    <ArrowDownwardIcon />
                </IconButton>
                <IconButton aria-label='Remove chapter' onClick={onRemove}>
                    <DeleteIcon />
                </IconButton>
            </Stack>
            <TextField
                label='Chapter name'
                value={chapter.name}
                onChange={(e) => onChange({ ...chapter, name: e.target.value })}
                fullWidth
                required
            />

            <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='subtitle1'>Modules</Typography>
                <Button
                    size='small'
                    onClick={() =>
                        onChange({ ...chapter, modules: [...chapter.modules, emptyModule()] })
                    }
                >
                    Add module
                </Button>
            </Stack>
            {chapter.modules.map((module, moduleIndex) => (
                <Accordion key={module.id || moduleIndex} variant='outlined'>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>
                            Module {moduleIndex + 1}
                            {module.name ? `: ${module.name}` : ''}
                            {` (${MODULE_TYPE_LABELS[module.type] ?? module.type})`}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <ModuleEditor
                            module={module}
                            index={moduleIndex}
                            total={chapter.modules.length}
                            onChange={(next) =>
                                onChange({
                                    ...chapter,
                                    modules: replaceItem(chapter.modules, moduleIndex, next),
                                })
                            }
                            onMove={(delta) =>
                                onChange({
                                    ...chapter,
                                    modules: moveItem(chapter.modules, moduleIndex, delta),
                                })
                            }
                            onRemove={() =>
                                onChange({
                                    ...chapter,
                                    modules: removeItem(chapter.modules, moduleIndex),
                                })
                            }
                        />
                    </AccordionDetails>
                </Accordion>
            ))}
        </Stack>
    );
}

function ModuleEditor({
    module,
    index,
    total,
    onChange,
    onMove,
    onRemove,
}: {
    module: CourseModule;
    index: number;
    total: number;
    onChange: (module: CourseModule) => void;
    onMove: (delta: number) => void;
    onRemove: () => void;
}) {
    const showVideos = module.type === CourseModuleType.Video;
    const showPgns =
        module.type === CourseModuleType.PgnViewer ||
        module.type === CourseModuleType.ModelGames ||
        module.type === CourseModuleType.Exercises;
    const showPositions =
        module.type === CourseModuleType.SparringPositions ||
        module.type === CourseModuleType.Themes;
    const showCoach = module.type === CourseModuleType.Exercises;

    return (
        <Stack spacing={2}>
            <Stack direction='row' sx={{ gap: 1, justifyContent: 'flex-end' }}>
                <IconButton
                    aria-label='Move module up'
                    disabled={index === 0}
                    onClick={() => onMove(-1)}
                >
                    <ArrowUpwardIcon />
                </IconButton>
                <IconButton
                    aria-label='Move module down'
                    disabled={index === total - 1}
                    onClick={() => onMove(1)}
                >
                    <ArrowDownwardIcon />
                </IconButton>
                <IconButton aria-label='Remove module' onClick={onRemove}>
                    <DeleteIcon />
                </IconButton>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                    label='Module name'
                    value={module.name}
                    onChange={(e) => onChange({ ...module, name: e.target.value })}
                    fullWidth
                    required
                />
                <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel id={`module-type-${module.id}`}>Type</InputLabel>
                    <Select
                        labelId={`module-type-${module.id}`}
                        label='Type'
                        value={module.type}
                        onChange={(e) => onChange({ ...module, type: e.target.value })}
                    >
                        {Object.values(CourseModuleType).map((type) => (
                            <MenuItem key={type} value={type}>
                                {MODULE_TYPE_LABELS[type]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>
            <TextField
                label='Description'
                value={module.description}
                onChange={(e) => onChange({ ...module, description: e.target.value })}
                fullWidth
                multiline
                minRows={2}
            />
            {showCoach && (
                <FormControl sx={{ maxWidth: 280 }}>
                    <InputLabel id={`module-coach-${module.id}`}>Coach</InputLabel>
                    <Select
                        labelId={`module-coach-${module.id}`}
                        label='Coach'
                        value={module.coach || Coach.Jesse}
                        onChange={(e) => onChange({ ...module, coach: e.target.value })}
                    >
                        {coaches.map((coach) => (
                            <MenuItem key={coach} value={coach}>
                                {coach[0] + coach.substring(1).toLowerCase()}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
            {showVideos && (
                <StringListField
                    label='Video URL'
                    addLabel='Add video URL'
                    values={module.videoUrls}
                    onChange={(videoUrls) => onChange({ ...module, videoUrls })}
                    helperText='YouTube watch, share, or embed URL'
                />
            )}
            {(showPositions || showPgns) && (
                <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id={`module-orient-${module.id}`}>Board orientation</InputLabel>
                    <Select
                        labelId={`module-orient-${module.id}`}
                        label='Board orientation'
                        value={module.boardOrientation}
                        onChange={(e) =>
                            onChange({
                                ...module,
                                boardOrientation: e.target.value,
                            })
                        }
                    >
                        <MenuItem value='white'>White</MenuItem>
                        <MenuItem value='black'>Black</MenuItem>
                    </Select>
                </FormControl>
            )}
            {showPgns && (
                <StringListField
                    label='PGN'
                    addLabel='Add PGN'
                    values={module.pgns}
                    onChange={(pgns) => onChange({ ...module, pgns })}
                    multiline
                />
            )}
            {showPositions && (
                <Stack spacing={1.5}>
                    <Stack
                        direction='row'
                        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <Typography variant='subtitle2'>Positions</Typography>
                        <Button
                            size='small'
                            onClick={() =>
                                onChange({
                                    ...module,
                                    positions: [...(module.positions ?? []), emptyPosition()],
                                })
                            }
                        >
                            Add position
                        </Button>
                    </Stack>
                    {module.positions?.map((position, posIndex) => (
                        <Stack
                            key={posIndex}
                            spacing={1.5}
                            sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
                        >
                            <Stack direction='row' sx={{ justifyContent: 'flex-end' }}>
                                <IconButton
                                    aria-label='Remove position'
                                    onClick={() =>
                                        onChange({
                                            ...module,
                                            positions: removeItem(module.positions, posIndex),
                                        })
                                    }
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Stack>
                            <TextField
                                label='Title'
                                value={position.title}
                                onChange={(e) =>
                                    onChange({
                                        ...module,
                                        positions: replaceItem(module.positions, posIndex, {
                                            ...position,
                                            title: e.target.value,
                                        }),
                                    })
                                }
                                fullWidth
                            />
                            <TextField
                                label='FEN'
                                value={position.fen}
                                onChange={(e) =>
                                    onChange({
                                        ...module,
                                        positions: replaceItem(module.positions, posIndex, {
                                            ...position,
                                            fen: e.target.value,
                                        }),
                                    })
                                }
                                fullWidth
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label='Limit (seconds)'
                                    type='number'
                                    value={position.limitSeconds || ''}
                                    onChange={(e) =>
                                        onChange({
                                            ...module,
                                            positions: replaceItem(module.positions, posIndex, {
                                                ...position,
                                                limitSeconds: Number(e.target.value) || 0,
                                            }),
                                        })
                                    }
                                    fullWidth
                                />
                                <TextField
                                    label='Increment (seconds)'
                                    type='number'
                                    value={position.incrementSeconds || ''}
                                    onChange={(e) =>
                                        onChange({
                                            ...module,
                                            positions: replaceItem(module.positions, posIndex, {
                                                ...position,
                                                incrementSeconds: Number(e.target.value) || 0,
                                            }),
                                        })
                                    }
                                    fullWidth
                                />
                                <TextField
                                    label='Result'
                                    value={position.result}
                                    onChange={(e) =>
                                        onChange({
                                            ...module,
                                            positions: replaceItem(module.positions, posIndex, {
                                                ...position,
                                                result: e.target.value,
                                            }),
                                        })
                                    }
                                    placeholder='1-0'
                                    fullWidth
                                />
                            </Stack>
                            <TextField
                                label='Position video URL'
                                value={position.videoUrl ?? ''}
                                onChange={(e) =>
                                    onChange({
                                        ...module,
                                        positions: replaceItem(module.positions, posIndex, {
                                            ...position,
                                            videoUrl: e.target.value,
                                        }),
                                    })
                                }
                                fullWidth
                            />
                        </Stack>
                    ))}
                </Stack>
            )}
            <TextField
                label='Postscript'
                value={module.postscript}
                onChange={(e) => onChange({ ...module, postscript: e.target.value })}
                fullWidth
                multiline
                minRows={2}
                helperText='Optional text shown after the module content'
            />
        </Stack>
    );
}

function StringListField({
    label,
    addLabel,
    values,
    onChange,
    multiline,
    helperText,
}: {
    label: string;
    addLabel: string;
    values?: string[];
    onChange: (values: string[]) => void;
    multiline?: boolean;
    helperText?: string;
}) {
    const items = values && values.length > 0 ? values : [''];
    return (
        <Stack spacing={1.5}>
            {items.map((value, index) => (
                <Stack key={index} direction='row' sx={{ alignItems: 'flex-start', gap: 1 }}>
                    <TextField
                        label={`${label} ${index + 1}`}
                        value={value}
                        onChange={(e) => onChange(replaceItem(items, index, e.target.value))}
                        fullWidth
                        multiline={multiline}
                        minRows={multiline ? 6 : undefined}
                        helperText={index === 0 ? helperText : undefined}
                    />
                    <IconButton
                        aria-label={`Remove ${label.toLowerCase()}`}
                        onClick={() => onChange(removeItem(items, index))}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Stack>
            ))}
            <Button
                size='small'
                onClick={() => onChange([...items, ''])}
                sx={{ alignSelf: 'flex-start' }}
            >
                {addLabel}
            </Button>
        </Stack>
    );
}
