import {
  context,
  propagation,
  type Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';

import { TRACER_NAME } from '../constants/tracing.constant.js';

/**
 * Trace context across process boundaries that no library instruments: Kafka headers (also via the
 * outbox) and manual spans for business steps. Everything is a no-op while tracing is off.
 */
export class TraceContext {
  /** W3C `traceparent`/`tracestate` of the current span, to store with an outgoing message. */
  public static headers(): Record<string, string> {
    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);
    return carrier;
  }

  /** Runs `work` in a span (`kind` producer/consumer/internal), continuing `parent` headers if given. */
  public static async inSpan<T>(
    name: string,
    work: (span: Span) => Promise<T>,
    options: {
      kind?: SpanKind;
      parent?: Record<string, string>;
      attributes?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const parentContext =
      options.parent === undefined
        ? context.active()
        : propagation.extract(context.active(), options.parent);
    return trace.getTracer(TRACER_NAME).startActiveSpan(
      name,
      {
        kind: options.kind ?? SpanKind.INTERNAL,
        ...(options.attributes ? { attributes: options.attributes } : {}),
      },
      parentContext,
      async (span) => {
        try {
          return await work(span);
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
