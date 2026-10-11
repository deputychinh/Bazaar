import { SellerApplicationStatus } from '@bazaar/contracts';
import type { SellerApplication as SellerApplicationRow } from '@prisma/client';

import type { SellerApplication } from '../../../interfaces/seller-application.interface.js';
import { EnumUtil } from '../../../utils/enum.util.js';
import type { SellerApplicationResponse } from '../dto/seller-application.dto.js';

export class SellerApplicationMapper {
  public static toDomain(row: SellerApplicationRow): SellerApplication {
    return {
      id: row.id,
      userId: row.userId,
      shopName: row.shopName,
      status: EnumUtil.parse(SellerApplicationStatus, row.status),
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
    };
  }

  public static toResponse(application: SellerApplication): SellerApplicationResponse {
    return {
      id: application.id,
      userId: application.userId,
      shopName: application.shopName,
      status: application.status,
      rejectionReason: application.rejectionReason,
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
    };
  }
}
