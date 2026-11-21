import { describe, expect, it } from 'vitest';
import { ShareDirectorySchema } from './directory';
import { SubscriptionTier } from './user';

const request = {
    owner: 'owner',
    id: '2bca0358-bbfc-46f0-b28d-e850ded0ba5c',
    access: {},
};

describe('ShareDirectorySchema', () => {
    it('accepts exact paid subscription tiers', () => {
        expect(
            ShareDirectorySchema.parse({
                ...request,
                subscriptionTiers: [SubscriptionTier.Basic, SubscriptionTier.GameReview],
            }),
        ).toEqual({
            ...request,
            subscriptionTiers: [SubscriptionTier.Basic, SubscriptionTier.GameReview],
        });
    });

    it('rejects Free as a directory audience', () => {
        expect(() =>
            ShareDirectorySchema.parse({
                ...request,
                subscriptionTiers: [SubscriptionTier.Free],
            }),
        ).toThrow();
    });

    it('allows old clients to omit subscriptionTiers', () => {
        expect(ShareDirectorySchema.parse(request)).toEqual(request);
    });
});
