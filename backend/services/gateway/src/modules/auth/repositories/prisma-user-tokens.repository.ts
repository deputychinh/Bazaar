import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { UserTokenPurpose } from '../../../enums/user-token-purpose.enum.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { StoredUserToken } from '../../../interfaces/token.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { type NewUserTokenOptions, UserTokensRepository } from './user-tokens.repository.js';

@Injectable()
export class PrismaUserTokensRepository extends UserTokensRepository {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {
    super();
  }

  public async create(token: NewUserTokenOptions, transaction: Transaction): Promise<void> {
    await transaction.userToken.create({ data: token });
  }

  public findByHash(tokenHash: string, purpose: UserTokenPurpose): Promise<StoredUserToken | null> {
    return this.prisma.userToken.findFirst({
      where: { tokenHash, purpose },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
  }

  public async markUsed(id: string, transaction: Transaction): Promise<void> {
    await transaction.userToken.update({ where: { id }, data: { usedAt: this.clock.now() } });
  }
}
