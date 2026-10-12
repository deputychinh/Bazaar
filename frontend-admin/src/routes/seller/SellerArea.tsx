import type { ReactElement } from 'react';
import { Outlet } from 'react-router';

import { AREA_ROLES } from '@/constants/area.constant';
import { RequireRole } from '@/features/auth/components/RequireRole';

/** Lazily loaded seller area, for sellers only. */
export const SellerArea = (): ReactElement => (
  <RequireRole roles={AREA_ROLES.seller}>
    <Outlet />
  </RequireRole>
);
