import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

export const { Link, useRouter, redirect, usePathname, getPathname } = createNavigation(routing);
