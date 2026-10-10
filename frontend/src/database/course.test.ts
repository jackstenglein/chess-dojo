import { describe, expect, it } from 'vitest';
import { canOpenCourse, Course, CourseStatus, CourseType } from './course';
import { SubscriptionStatus, User } from './user';

function course(overrides: Partial<Course>): Course {
    return {
        owner: 'coach',
        ownerDisplayName: 'Coach',
        stripeId: '',
        type: CourseType.Opening,
        id: 'course-1',
        name: 'Course',
        description: '',
        color: 'None',
        cohorts: [],
        cohortRange: '',
        includedWithSubscription: true,
        availableForFreeUsers: false,
        status: CourseStatus.Published,
        ...overrides,
    };
}

function user(overrides: Partial<User>): User {
    return {
        username: 'student',
        subscriptionStatus: SubscriptionStatus.NotSubscribed,
        ...overrides,
    } as User;
}

describe('canOpenCourse', () => {
    it.each([
        {
            name: 'admin on an unpublished course',
            user: user({ isAdmin: true }),
            course: course({ status: CourseStatus.Draft }),
            expected: true,
        },
        {
            name: 'free user on a subscriber course',
            user: user({}),
            course: course({}),
            expected: false,
        },
        {
            name: 'lapsed subscriber with a purchase on a subscriber-only course',
            user: user({
                subscriptionStatus: SubscriptionStatus.Canceled,
                purchasedCourses: { 'course-1': true },
            }),
            course: course({}),
            expected: false,
        },
        {
            name: 'subscriber on an included course',
            user: user({ subscriptionStatus: SubscriptionStatus.Subscribed }),
            course: course({}),
            expected: true,
        },
        {
            name: 'free user on a purchased free-available course',
            user: user({ purchasedCourses: { 'course-1': true } }),
            course: course({ availableForFreeUsers: true, includedWithSubscription: false }),
            expected: true,
        },
        {
            name: 'subscriber on an unpublished course',
            user: user({ subscriptionStatus: SubscriptionStatus.Subscribed }),
            course: course({ status: CourseStatus.Draft }),
            expected: false,
        },
        {
            name: 'no user on a free-available course',
            user: undefined,
            course: course({ availableForFreeUsers: true }),
            expected: false,
        },
    ])('$name', ({ user, course, expected }) => {
        expect(canOpenCourse(user, course)).toBe(expected);
    });
});
