import type { Page, SellerApplicationStatus } from '@bazaar/contracts';

import type { SellerApplication } from '../../../interfaces/seller-application.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export interface ListApplicationsOptions {
  status?: SellerApplicationStatus;
  cursor?: string;
  limit: number;
}

export interface ReviewOptions {
  status: SellerApplicationStatus;
  reviewedBy: string;
  reviewedAt: Date;
  rejectionReason?: string;
}

export abstract class SellerApplicationsRepository {
  public abstract create(
    userId: string,
    shopName: string,
    status: SellerApplicationStatus,
  ): Promise<SellerApplication>;

  public abstract findById(id: string): Promise<SellerApplication | null>;

  public abstract findByUser(userId: string): Promise<SellerApplication[]>;

  public abstract list(options: ListApplicationsOptions): Promise<Page<SellerApplication>>;

  public abstract review(
    id: string,
    review: ReviewOptions,
    transaction: Transaction,
  ): Promise<SellerApplication>;
}
