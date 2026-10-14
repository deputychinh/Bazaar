import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { TraceContext } from './trace-context.js';
import { Tracing } from './tracing.js';

describe('Tracing.start', () => {
  it('stays off without an OTLP endpoint', () => {
    expect(Tracing.start({ serviceName: 'order', env: {} })).toBe(false);
  });
});

describe('TraceContext', () => {
  const exporter = new InMemorySpanExporter();

  beforeAll(() => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
    trace.setGlobalTracerProvider(
      new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }),
    );
  });

  afterAll(() => {
    trace.disable();
    propagation.disable();
    context.disable();
  });

  beforeEach(() => exporter.reset());

  it('writes the current span into message headers and continues it on the other side', async () => {
    let headers: Record<string, string> = {};
    await TraceContext.inSpan('order.events publish', () => {
      headers = TraceContext.headers();
      return Promise.resolve();
    });
    expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

    await TraceContext.inSpan('order.events process', () => Promise.resolve(), { parent: headers });

    const [producer, consumer] = exporter.getFinishedSpans();
    expect(consumer?.spanContext().traceId).toBe(producer?.spanContext().traceId);
    expect(consumer?.parentSpanContext?.spanId).toBe(producer?.spanContext().spanId);
  });

  it('marks the span as failed and rethrows', async () => {
    await expect(
      TraceContext.inSpan('saga.settle-payment', () => Promise.reject(new Error('declined'))),
    ).rejects.toThrow('declined');
    const [span] = exporter.getFinishedSpans();
    expect(span?.status.code).toBe(2);
    expect(span?.events[0]?.name).toBe('exception');
  });

  it('returns no headers while tracing is off', () => {
    trace.disable();
    propagation.disable();
    expect(TraceContext.headers()).toEqual({});
  });
});
