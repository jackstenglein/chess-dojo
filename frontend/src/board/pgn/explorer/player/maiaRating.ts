import { MAIA_RATINGS, MaiaRating } from '@/components/playbot/maiaengine';

export function getNearestMaiaRating(rating?: number): MaiaRating {
    if (rating === undefined || Number.isNaN(rating)) {
        return 1500;
    }

    return MAIA_RATINGS.reduce<MaiaRating>((nearest, candidate) => {
        const nearestDistance = Math.abs(nearest - rating);
        const candidateDistance = Math.abs(candidate - rating);
        return candidateDistance < nearestDistance ? candidate : nearest;
    }, 1500);
}
