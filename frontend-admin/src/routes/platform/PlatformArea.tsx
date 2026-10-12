import type { ReactElement } from 'react';
import { Outlet } from 'react-router';

import { AREA_ROLES } from '@/constants/area.constant';
import { RequireRole } from '@/features/auth/components/RequireRole';

/** Lazily loaded platform area, for admins only. */
export const PlatformArea = (): ReactElement => (
  <RequireRole roles={AREA_ROLES.platform}>
    <Outlet />
  </RequireRole>
);
