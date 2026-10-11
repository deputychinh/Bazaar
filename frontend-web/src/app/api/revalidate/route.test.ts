// @vitest-environment node
import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

const env = vi.hoisted((): { REVALIDATE_SECRET: string | undefined } => ({
  REVALIDATE_SECRET: 's'.repeat(32),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/config/env.server', () => ({ serverEnv: env }));

const { POST } = await import('./route');

const call = (body: unknown, secret?: string): Promise<Response> =>
  POST(
    new NextRequest('http://localhost/api/revalidate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: secret === undefined ? {} : { 'x-revalidate-secret': secret },
    }),
  );

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
    env.REVALIDATE_SECRET = 's'.repeat(32);
  });

  it('revalidates the product page in every language', async () => {
    const response = await call({ slug: 'silk-lantern' }, 's'.repeat(32));

    expect(response.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith('/en/p/silk-lantern');
    expect(revalidatePath).toHaveBeenCalledWith('/vi/p/silk-lantern');
  });

  it('rejects a wrong secret and a bad slug', async () => {
    expect((await call({ slug: 'x' }, 'wrong')).status).toBe(401);
    expect((await call({ slug: 'x' })).status).toBe(401);
    expect((await call({ slug: '../etc' }, 's'.repeat(32))).status).toBe(400);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('does not exist when no secret is configured', async () => {
    env.REVALIDATE_SECRET = undefined;
    expect((await call({ slug: 'x' }, 's'.repeat(32))).status).toBe(404);
  });
});
