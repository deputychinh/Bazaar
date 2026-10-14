import { Inject, Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

import { METRICS_MODULE_OPTIONS } from '../constants/injection-token.constant.js';
import type {
  GaugeOptions,
  HistogramOptions,
  MetricOptions,
} from '../interfaces/metric-options.interface.js';
import type { MetricsModuleOptions } from '../interfaces/metrics-module-options.interface.js';

/**
 * The only file that knows the metrics library (prom-client). One registry per service, with the
 * Node.js defaults and a `service` label on every series; metrics are created once by name.
 */
@Injectable()
export class MetricsRegistry {
  private readonly registry = new Registry();
  private readonly created = new Map<string, Counter | Gauge | Histogram>();

  public constructor(@Inject(METRICS_MODULE_OPTIONS) options: MetricsModuleOptions) {
    this.registry.setDefaultLabels({ service: options.serviceName });
    if (options.collectDefaults !== false) {
      collectDefaultMetrics({ register: this.registry });
    }
  }

  public counter({ name, help, labelNames = [] }: MetricOptions): Counter {
    return this.once(
      name,
      () => new Counter({ name, help, labelNames, registers: [this.registry] }),
    );
  }

  public histogram({ name, help, labelNames = [], buckets }: HistogramOptions): Histogram {
    return this.once(
      name,
      () => new Histogram({ name, help, labelNames, buckets, registers: [this.registry] }),
    );
  }

  /** A gauge; pass `collect` to compute its value at scrape time. */
  public gauge({ name, help, labelNames = [], collect }: GaugeOptions): Gauge {
    return this.once(
      name,
      () =>
        new Gauge({
          name,
          help,
          labelNames,
          registers: [this.registry],
          ...(collect === undefined ? {} : { collect }),
        }),
    );
  }

  public get contentType(): string {
    return this.registry.contentType;
  }

  public scrape(): Promise<string> {
    return this.registry.metrics();
  }

  private once<T extends Counter | Gauge | Histogram>(name: string, create: () => T): T {
    const existing = this.created.get(name);
    if (existing !== undefined) {
      return existing as T;
    }
    const metric = create();
    this.created.set(name, metric);
    return metric;
  }
}
