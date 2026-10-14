import { OrderStatus } from '@bazaar/contracts';
import { MetricsRegistry } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { StatsRepository } from '../repositories/stats.repository.js';

/** Saga state counts (plan §9.3): orders by status, counted when Prometheus scrapes. */
@Injectable()
export class OrderMetrics {
  public constructor(metrics: MetricsRegistry, stats: StatsRepository) {
    metrics.gauge({
      name: 'orders_by_status',
      help: 'Orders by current status',
      labelNames: ['status'],
      collect: async function () {
        const counts = await stats.ordersByStatus();
        for (const status of Object.values(OrderStatus)) {
          this.set({ status }, counts[status] ?? 0);
        }
      },
    });
  }
}
