import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ErrorCode } from '@/api/gateway.schema';
import { serverEnv } from '@/config/env.server';
import { LOCALES } from '@/constants/locale.constant';
import { REVALIDATE_SECRET_HEADER } from '@/constants/revalidate.constant';
import { secretsMatch } from '@/utils/secret.util';

const bodySchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) });

/**
 * On-demand ISR: the catalog calls this after a product changes so buyers see it at once
 * instead of after the 5-minute window. Server-to-server only, guarded by a shared secret.
 */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const expected = serverEnv.REVALIDATE_SECRET;
  if (expected === undefined)
    return NextResponse.json({ code: ErrorCode.NOT_FOUND }, { status: 404 });
  if (!secretsMatch(request.headers.get(REVALIDATE_SECRET_HEADER) ?? '', expected)) {
    return NextResponse.json({ code: ErrorCode.UNAUTHENTICATED }, { status: 401 });
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ code: ErrorCode.VALIDATION_FAILED }, { status: 400 });
  const paths = LOCALES.map((locale) => `/${locale}/p/${body.data.slug}`);
  paths.forEach((path) => revalidatePath(path));
  return NextResponse.json({ revalidated: paths });
};
