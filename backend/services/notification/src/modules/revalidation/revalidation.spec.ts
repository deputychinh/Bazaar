import { EventFactory, EventType } from '@bazaar/contracts';
import type { PinoLogger } from 'nestjs-pino';

import { testConfig } from '../../../test/fakes/notification.fakes.js';
import { AppConfig } from '../../config/app-config.js';

import { HttpWebRevalidator } from './http-web-revalidator.js';
import { RevalidationReaction } from './revalidation.reaction.js';
import type { WebRevalidator } from './web-revalidator.js';

const logger = { setContext: vi.fn(), warn: vi.fn() } as unknown as PinoLogger;
const SECRET = 's'.repeat(40);

describe('web revalidation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('refreshes the product page for product changes and new ratings only', async () => {
    const web = { revalidateProduct: vi.fn(() => Promise.resolve()) };
    const reaction = new RevalidationReaction(web, logger);

    await reaction.react(
      EventFactory.create({
        type: EventType.RatingUpdated,
        aggregateId: 'p1',
        payload: { productId: 'p1', slug: 'vase', average: 5, count: 1 },
      }),
    );
    await reaction.react(
      EventFactory.create({
        type: EventType.ProductHidden,
        aggregateId: 'p2',
        payload: { productId: 'p2', shopId: 's', slug: 'lamp' },
      }),
    );
    await reaction.react(
      EventFactory.create({
        type: EventType.StockReserved,
        aggregateId: 'o1',
        payload: { orderId: 'o1' },
      }),
    );

    expect(web.revalidateProduct.mock.calls).toEqual([['vase'], ['lamp']]);
  });

  it('never fails the event when the web is down', async () => {
    const web = { revalidateProduct: vi.fn(() => Promise.reject(new Error('down'))) };
    await expect(
      new RevalidationReaction(web as unknown as WebRevalidator, logger).react(
        EventFactory.create({
          type: EventType.ProductUpdated,
          aggregateId: 'p1',
          payload: { productId: 'p1', shopId: 's', slug: 'vase' },
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it('posts the slug with the shared secret, and stays quiet without one', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);

    await new HttpWebRevalidator(testConfig()).revalidateProduct('vase');
    expect(fetchMock).not.toHaveBeenCalled();

    await new HttpWebRevalidator(
      new AppConfig({ ...testConfig().env, REVALIDATE_SECRET: SECRET }),
    ).revalidateProduct('vase');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:3100/api/revalidate');
    expect(init.headers).toMatchObject({ 'x-revalidate-secret': SECRET });
    expect(init.body).toBe(JSON.stringify({ slug: 'vase' }));

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(
      new HttpWebRevalidator(
        new AppConfig({ ...testConfig().env, REVALIDATE_SECRET: SECRET }),
      ).revalidateProduct('vase'),
    ).rejects.toThrow('401');
  });
});
