import { HealthIndicator } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  public readonly name = 'mongodb';

  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async check(): Promise<void> {
    await this.prisma.$runCommandRaw({ ping: 1 });
  }
}
