import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { PrismaClient } from '#prisma';

import { AppConfig } from '../../config/app-config.js';

/** The catalog database client. Only repositories use it (plan §6A.3). */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public constructor(config: AppConfig) {
    super({ datasourceUrl: config.env.CATALOG_DATABASE_URL });
  }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
