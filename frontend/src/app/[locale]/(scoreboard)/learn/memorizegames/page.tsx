import { NextRequireAuth } from '@/components/auth/NextRequireAuth';
import { MemorizeGamesPage } from './MemorizeGamesPage';

export default function Page() {
    return <NextRequireAuth Component={MemorizeGamesPage} />;
}
