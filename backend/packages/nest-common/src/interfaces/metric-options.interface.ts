import type { Gauge } from 'prom-client';

export interface MetricOptions {
  name: string;
  help: string;
  labelNames?: readonly string[];
}

export interface HistogramOptions extends MetricOptions {
  /** Upper bounds of the buckets, in the metric's unit. */
  buckets: number[];
}

export interface GaugeOptions extends MetricOptions {
  /** Computes the value at scrape time; `this` is the gauge. */
  collect?: (this: Gauge) => void | Promise<void>;
}
