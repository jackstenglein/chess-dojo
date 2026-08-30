import {
    Coach,
    Course,
    CourseModule,
    CourseModuleType,
    CourseStatus,
    CourseType,
} from '@/database/course';
import { ALL_COHORTS, dojoCohorts, User } from '@/database/user';
import { describe, expect, it, vi } from 'vitest';
import {
    cohortRangeFromCohorts,
    emptyChapter,
    emptyCourse,
    emptyModule,
    emptyPosition,
    emptyPurchaseOption,
    emptySellingPoint,
    MODULE_TYPE_LABELS,
    moveItem,
    prepareCourseForSave,
    publishValidationError,
    removeItem,
    replaceItem,
    STARTING_FEN,
} from './courseEditor';

vi.mock('uuid', () => ({ v4: () => 'test-module-id' }));

function adminUser(): User {
    return {
        username: 'admin',
        displayName: 'Admin User',
    } as User;
}

function validModule(overrides: Partial<CourseModule> = {}): CourseModule {
    return {
        id: 'm1',
        name: 'Intro video',
        type: CourseModuleType.Video,
        description: '',
        postscript: '',
        videoUrls: ['https://youtu.be/abc'],
        pgns: [],
        coach: Coach.Jesse,
        positions: [],
        boardOrientation: 'white',
        ...overrides,
    };
}

function validCourse(overrides: Partial<Course> = {}): Course {
    return {
        owner: 'admin',
        ownerDisplayName: 'Admin User',
        stripeId: '',
        type: CourseType.Opening,
        id: 'course-1',
        name: 'Italian Game',
        description: 'A complete repertoire.',
        whatsIncluded: ['Videos', 'PGNs'],
        color: 'White',
        cohorts: ['1200-1300'],
        cohortRange: '1200-1300',
        includedWithSubscription: false,
        availableForFreeUsers: true,
        purchaseOptions: [
            { name: 'Full course', fullPrice: 4900, currentPrice: 0, sellingPoints: [] },
        ],
        chapters: [{ name: 'Introduction', modules: [validModule()] }],
        imageUrl: 'https://example.com/thumb.png',
        videoUrl: 'https://youtu.be/intro',
        status: CourseStatus.Draft,
        ...overrides,
    };
}

describe('empty factories', () => {
    it('emptyCourse uses the current user and draft defaults', () => {
        expect(emptyCourse(adminUser())).toEqual({
            owner: 'admin',
            ownerDisplayName: 'Admin User',
            stripeId: '',
            type: CourseType.Opening,
            id: '',
            name: '',
            description: '',
            whatsIncluded: [],
            color: 'None',
            cohorts: [],
            cohortRange: '',
            includedWithSubscription: false,
            availableForFreeUsers: true,
            purchaseOptions: [],
            chapters: [],
            imageUrl: '',
            videoUrl: '',
            status: CourseStatus.Draft,
        });
    });

    it('emptyChapter includes a single empty module', () => {
        expect(emptyChapter()).toEqual({
            name: '',
            modules: [emptyModule()],
        });
    });

    it('emptyModule uses a generated id and video defaults', () => {
        expect(emptyModule()).toEqual({
            id: 'test-module-id',
            name: '',
            type: CourseModuleType.Video,
            description: '',
            postscript: '',
            videoUrls: [''],
            pgns: [],
            coach: Coach.Jesse,
            positions: [],
            boardOrientation: 'white',
        });
    });

    it('emptyPurchaseOption, emptySellingPoint, and emptyPosition use empty defaults', () => {
        expect(emptyPurchaseOption()).toEqual({
            name: '',
            fullPrice: 0,
            currentPrice: 0,
            sellingPoints: [],
        });
        expect(emptySellingPoint()).toEqual({ description: '', included: true });
        expect(emptyPosition()).toEqual({
            title: '',
            fen: STARTING_FEN,
            limitSeconds: 0,
            incrementSeconds: 0,
            result: '',
            videoUrl: '',
        });
    });

    it('labels every module type', () => {
        expect(Object.keys(MODULE_TYPE_LABELS).sort()).toEqual(
            Object.values(CourseModuleType).sort(),
        );
    });
});

describe('moveItem', () => {
    it('moves an item by delta', () => {
        expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
        expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    });

    it('returns the original array when the move would go out of bounds', () => {
        const items = ['a', 'b'];
        expect(moveItem(items, 0, -1)).toBe(items);
        expect(moveItem(items, 1, 1)).toBe(items);
    });
});

describe('replaceItem', () => {
    it('replaces the item at the given index', () => {
        expect(replaceItem(['a', 'b', 'c'], 1, 'x')).toEqual(['a', 'x', 'c']);
    });

    it('treats a missing list as a single-item list', () => {
        expect(replaceItem(undefined, 0, 'x')).toEqual(['x']);
    });
});

describe('removeItem', () => {
    it('removes the item at the given index', () => {
        expect(removeItem(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
    });

    it('returns an empty list when the input is missing', () => {
        expect(removeItem(undefined, 0)).toEqual([]);
    });
});

describe('cohortRangeFromCohorts', () => {
    it('returns an empty string when no cohorts are selected', () => {
        expect(cohortRangeFromCohorts([])).toBe('');
    });

    it('returns the cohort itself when only one is selected', () => {
        expect(cohortRangeFromCohorts(['1500-1600'])).toBe('1500-1600');
    });

    it('sorts and formats a contiguous range', () => {
        expect(cohortRangeFromCohorts(['1400-1500', '1200-1300'])).toBe('1200-1500');
    });

    it('uses a plus suffix when the range includes the top cohort', () => {
        expect(cohortRangeFromCohorts(['2300-2400', '2400+'])).toBe('2300+');
    });

    it('expands ALL_COHORTS to the full range', () => {
        expect(cohortRangeFromCohorts([ALL_COHORTS])).toBe('0+');
    });
});

describe('prepareCourseForSave', () => {
    it('sets status, resolves cohorts, and computes the cohort range', () => {
        const saved = prepareCourseForSave(
            validCourse({ cohorts: [ALL_COHORTS], status: CourseStatus.Draft }),
            CourseStatus.Published,
        );

        expect(saved.status).toBe(CourseStatus.Published);
        expect(saved.cohorts).toEqual([...dojoCohorts]);
        expect(saved.cohortRange).toBe('0+');
    });

    it('trims whats-included items and drops blanks', () => {
        const saved = prepareCourseForSave(
            validCourse({ whatsIncluded: ['  Videos  ', '', '  ', 'PGNs'] }),
            CourseStatus.Draft,
        );
        expect(saved.whatsIncluded).toEqual(['Videos', 'PGNs']);
    });

    it('trims image and video URLs and drops blanks', () => {
        expect(
            prepareCourseForSave(
                validCourse({ imageUrl: '  https://img  ', videoUrl: '  https://vid  ' }),
                CourseStatus.Draft,
            ),
        ).toMatchObject({
            imageUrl: 'https://img',
            videoUrl: 'https://vid',
        });
        expect(
            prepareCourseForSave(
                validCourse({ imageUrl: '   ', videoUrl: '' }),
                CourseStatus.Draft,
            ),
        ).toMatchObject({
            imageUrl: undefined,
            videoUrl: undefined,
        });
    });

    it('trims and drops empty video URLs and PGNs', () => {
        const saved = prepareCourseForSave(
            validCourse({
                chapters: [
                    {
                        name: 'Ch',
                        modules: [
                            validModule({
                                videoUrls: ['  https://a  ', '', 'https://b'],
                                pgns: ['  1. e4  ', '  ', '1. d4'],
                            }),
                        ],
                    },
                ],
            }),
            CourseStatus.Draft,
        );
        expect(saved.chapters?.[0].modules[0].videoUrls).toEqual(['https://a', 'https://b']);
        expect(saved.chapters?.[0].modules[0].pgns).toEqual(['1. e4', '1. d4']);
    });

    it('drops selling points with empty descriptions', () => {
        const saved = prepareCourseForSave(
            validCourse({
                purchaseOptions: [
                    {
                        name: 'Full',
                        fullPrice: 4900,
                        currentPrice: 0,
                        sellingPoints: [
                            { description: 'Videos', included: true },
                            { description: '   ', included: true },
                            { description: '', included: false },
                        ],
                    },
                ],
            }),
            CourseStatus.Draft,
        );
        expect(saved.purchaseOptions?.[0].sellingPoints).toEqual([
            { description: 'Videos', included: true },
        ]);
    });
});

describe('publishValidationError', () => {
    it('returns undefined for a valid course', () => {
        expect(publishValidationError(validCourse())).toBeUndefined();
    });

    it('requires a name and description', () => {
        expect(publishValidationError(validCourse({ name: '   ' }))).toBe(
            'Name is required to publish',
        );
        expect(publishValidationError(validCourse({ description: '' }))).toBe(
            'Description is required to publish',
        );
    });

    it('requires at least one cohort', () => {
        expect(publishValidationError(validCourse({ cohorts: [] }))).toBe(
            'Select at least one cohort to publish',
        );
    });

    it('requires a purchase option unless the course is subscribers-only', () => {
        expect(publishValidationError(validCourse({ purchaseOptions: [] }))).toBe(
            'Add a purchase option, or include the course with a subscription and hide it from free-tier users',
        );
        expect(
            publishValidationError(
                validCourse({
                    purchaseOptions: [],
                    includedWithSubscription: true,
                    availableForFreeUsers: true,
                }),
            ),
        ).toBe(
            'Add a purchase option, or include the course with a subscription and hide it from free-tier users',
        );
        expect(
            publishValidationError(
                validCourse({
                    purchaseOptions: [],
                    includedWithSubscription: true,
                    availableForFreeUsers: false,
                }),
            ),
        ).toBeUndefined();
    });

    it('requires a full price of at least $1', () => {
        expect(
            publishValidationError(
                validCourse({
                    purchaseOptions: [{ name: 'Full', fullPrice: 99, currentPrice: 0 }],
                }),
            ),
        ).toBe('Each purchase option must have a full price of at least $1');
    });

    it('requires a sale price of at least $1 when set', () => {
        expect(
            publishValidationError(
                validCourse({
                    purchaseOptions: [{ name: 'Full', fullPrice: 4900, currentPrice: 50 }],
                }),
            ),
        ).toBe('Sale price must be at least $1 if set');
    });

    it('requires the sale price to be less than the full price', () => {
        expect(
            publishValidationError(
                validCourse({
                    purchaseOptions: [{ name: 'Full', fullPrice: 4900, currentPrice: 4900 }],
                }),
            ),
        ).toBe('Sale price must be less than the full price if set');
    });

    it('allows a zero sale price to mean no sale', () => {
        expect(
            publishValidationError(
                validCourse({
                    purchaseOptions: [{ name: 'Full', fullPrice: 4900, currentPrice: 0 }],
                }),
            ),
        ).toBeUndefined();
    });

    it('requires at least one chapter', () => {
        expect(publishValidationError(validCourse({ chapters: [] }))).toBe(
            'Add at least one chapter to publish',
        );
        expect(publishValidationError(validCourse({ chapters: undefined }))).toBe(
            'Add at least one chapter to publish',
        );
    });

    it('requires each chapter to have a named module', () => {
        expect(
            publishValidationError(validCourse({ chapters: [{ name: 'Empty', modules: [] }] })),
        ).toBe('Add at least one module to each chapter to publish');
        expect(
            publishValidationError(
                validCourse({
                    chapters: [{ name: 'Intro', modules: [validModule({ name: '  ' })] }],
                }),
            ),
        ).toBe('Add a name to each module to publish');
    });
});
