import { Module } from '@nestjs/common';

import { StatsController } from './controllers/stats.controller.js';
import { PrismaStatsRepository } from './repositories/prisma-stats.repository.js';
import { StatsRepository } from './repositories/stats.repository.js';
import { OrderMetrics } from './services/order-metrics.js';
import { StatsService } from './services/stats.service.js';

@Module({
  controllers: [StatsController],
  providers: [
    StatsService,
    OrderMetrics,
    { provide: StatsRepository, useClass: PrismaStatsRepository },
  ],
})
export class StatsModule {}
