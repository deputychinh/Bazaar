import {
  EventFactory,
  EventType,
  type Page,
  SellerApplicationStatus,
  UserRole,
} from '@bazaar/contracts';
import { Clock, ConflictError, NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import type { SellerApplication } from '../../../interfaces/seller-application.interface.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import type { ListApplicationsQuery } from '../dto/seller-application.dto.js';
import { SellerApplicationsRepository } from '../repositories/seller-applications.repository.js';

/** Shoppers apply to sell; admins approve (role becomes SELLER) or reject (plan F4, FR-09). */
@Injectable()
export class SellerApplicationsService {
  public constructor(
    private readonly applications: SellerApplicationsRepository,
    private readonly users: UsersRepository,
    private readonly outbox: EventOutbox,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  public async apply(userId: string, shopName: string): Promise<SellerApplication> {
    const existing = await this.applications.findByUser(userId);
    if (existing.some((application) => application.status === SellerApplicationStatus.Pending)) {
      throw new ConflictError('You already have an application waiting for review');
    }
    return this.applications.create(userId, shopName, SellerApplicationStatus.Pending);
  }

  public mine(userId: string): Promise<SellerApplication[]> {
    return this.applications.findByUser(userId);
  }

  public list(query: ListApplicationsQuery): Promise<Page<SellerApplication>> {
    return this.applications.list(query);
  }

  public async approve(adminId: string, applicationId: string): Promise<SellerApplication> {
    const application = await this.pending(applicationId);
    return this.transactions.run(async (transaction) => {
      const approved = await this.applications.review(
        application.id,
        {
          status: SellerApplicationStatus.Approved,
          reviewedBy: adminId,
          reviewedAt: this.clock.now(),
        },
        transaction,
      );
      await this.users.update(application.userId, { role: UserRole.Seller }, transaction);
      await this.outbox.add(
        EventFactory.create({
          type: EventType.SellerApproved,
          aggregateId: application.userId,
          payload: {
            userId: application.userId,
            applicationId: application.id,
            shopName: application.shopName,
          },
        }),
        transaction,
      );
      return approved;
    });
  }

  public async reject(
    adminId: string,
    applicationId: string,
    reason: string,
  ): Promise<SellerApplication> {
    const application = await this.pending(applicationId);
    return this.transactions.run((transaction) =>
      this.applications.review(
        application.id,
        {
          status: SellerApplicationStatus.Rejected,
          reviewedBy: adminId,
          reviewedAt: this.clock.now(),
          rejectionReason: reason,
        },
        transaction,
      ),
    );
  }

  private async pending(applicationId: string): Promise<SellerApplication> {
    const application = await this.applications.findById(applicationId);
    if (application === null) {
      throw new NotFoundError('Seller application', applicationId);
    }
    if (application.status !== SellerApplicationStatus.Pending) {
      throw new ConflictError(`This application is already ${application.status.toLowerCase()}`);
    }
    return application;
  }
}
