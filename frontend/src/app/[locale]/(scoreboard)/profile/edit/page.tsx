import { NextRequireAuth } from '@/components/auth/NextRequireAuth';
import { ProfileEditorPage } from './ProfileEditorPage';

export default function Page() {
    return <NextRequireAuth Component={ProfileEditorPage} />;
}
