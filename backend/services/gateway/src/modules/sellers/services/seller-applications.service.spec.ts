import { EventType, SellerApplicationStatus, UserRole } from '@bazaar/contracts';
import { ConflictError, FixedClock, NotFoundError } from '@bazaar/nest-common';

import {
  ImmediateTransactionManager,
  InMemorySellerApplicationsRepository,
  InMemoryUsersRepository,
  NOW,
  RecordingOutbox,
} from '../../../../test/fakes/auth.fakes.js';

import { SellerApplicationsService } from './seller-applications.service.js';

describe('SellerApplicationsService', () => {
  let applications: InMemorySellerApplicationsRepository;
  let users: InMemoryUsersRepository;
  let outbox: RecordingOutbox;
  let service: SellerApplicationsService;

  beforeEach(() => {
    applications = new InMemorySellerApplicationsRepository();
    users = new InMemoryUsersRepository();
    outbox = new RecordingOutbox();
    service = new SellerApplicationsService(
      applications,
      users,
      outbox,
      new ImmediateTransactionManager(),
      new FixedClock(NOW),
    );
  });

  it('accepts one pending application per shopper', async () => {
    const shopper = users.seed();

    const application = await service.apply(shopper.id, 'Gốm Bát Tràng');

    expect(application.status).toBe(SellerApplicationStatus.Pending);
    await expect(service.apply(shopper.id, 'Second shop')).rejects.toBeInstanceOf(ConflictError);
  });

  it('approving makes the user a seller and announces it', async () => {
    const shopper = users.seed();
    const application = await service.apply(shopper.id, 'Lụa Hà Đông');

    const approved = await service.approve('admin-1', application.id);

    expect(approved).toMatchObject({
      status: SellerApplicationStatus.Approved,
      reviewedBy: 'admin-1',
      reviewedAt: NOW,
    });
    expect(users.rows.get(shopper.id)?.role).toBe(UserRole.Seller);
    expect(outbox.events[0]).toMatchObject({
      type: EventType.SellerApproved,
      payload: { userId: shopper.id, applicationId: application.id, shopName: 'Lụa Hà Đông' },
    });
  });

  it('rejecting keeps the role and records the reason', async () => {
    const shopper = users.seed();
    const application = await service.apply(shopper.id, 'Shop');

    const rejected = await service.reject('admin-1', application.id, 'Please add a real address');

    expect(rejected).toMatchObject({
      status: SellerApplicationStatus.Rejected,
      rejectionReason: 'Please add a real address',
    });
    expect(users.rows.get(shopper.id)?.role).toBe(UserRole.Shopper);
    expect(outbox.events).toEqual([]);
  });

  it('refuses to review a missing or already reviewed application', async () => {
    const shopper = users.seed();
    const application = await service.apply(shopper.id, 'Shop');
    await service.approve('admin-1', application.id);

    await expect(service.approve('admin-1', application.id)).rejects.toBeInstanceOf(ConflictError);
    await expect(service.reject('admin-1', 'missing', 'reason')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('lists applications newest first with a cursor', async () => {
    for (const name of ['A', 'B', 'C']) {
      await service.apply(users.seed().id, name);
    }

    const first = await service.list({ limit: 2 });
    const second = await service.list({ limit: 2, cursor: first.nextCursor ?? undefined });

    expect(first.items.map((item) => item.shopName)).toEqual(['C', 'B']);
    expect(second).toMatchObject({ items: [{ shopName: 'A' }], nextCursor: null });
  });
});
