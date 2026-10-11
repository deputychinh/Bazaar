import type { SellerApplicationStatus } from '@bazaar/contracts';

export interface SellerApplication {
  id: string;
  userId: string;
  shopName: string;
  status: SellerApplicationStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
}
