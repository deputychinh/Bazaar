import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { StoredRefreshToken } from '../../../interfaces/token.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import {
  type NewRefreshTokenOptions,
  RefreshTokensRepository,
} from './refresh-tokens.repository.js';

const storedFields = { id: true, userId: true, familyId: true, expiresAt: true, revokedAt: true };

@Injectable()
export class PrismaRefreshTokensRepository extends RefreshTokensRepository {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {
    super();
  }

  public create(
    token: NewRefreshTokenOptions,
    transaction?: Transaction,
  ): Promise<StoredRefreshToken> {
    return (transaction ?? this.prisma).refreshToken.create({ data: token, select: storedFields });
  }

  public findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash }, select: storedFields });
  }

  public async markRotated(
    id: string,
    replacedById: string,
    transaction: Transaction,
  ): Promise<void> {
    await transaction.refreshToken.update({
      where: { id },
      data: { revokedAt: this.clock.now(), replacedById },
    });
  }

  public async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
  }

  public async revokeAllForUser(userId: string, transaction: Transaction): Promise<void> {
    await transaction.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
  }
}
