import { NextRequireAuth } from '@/components/auth/NextRequireAuth';
import { ListFollowedPositionsPage } from './ListFollowedPositionsPage';

export default function Page() {
    return <NextRequireAuth Component={ListFollowedPositionsPage} />;
}
