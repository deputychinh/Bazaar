import { Global, Module } from '@nestjs/common';

import { PrismaHealthIndicator } from './prisma-health.indicator.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService, PrismaHealthIndicator],
  exports: [PrismaService, PrismaHealthIndicator],
})
export class PrismaModule {}
