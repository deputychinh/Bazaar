import { useEffect, useRef, useState } from 'react';

import type { OrderStreamEvent } from '@/interfaces/order-event.interface';
import { parseSse } from '@/utils/sse.util';

/**
 * Listens to the shopper's live order events (GET /api/v1/orders/stream). EventSource cannot send
 * the in-memory access token, so this reads the stream with fetch. Returns whether it is live;
 * callers fall back to polling while it is not.
 */
export const useOrderEvents = (
  accessToken: string,
  onEvent: (event: OrderStreamEvent) => void,
): boolean => {
  const [isLive, setIsLive] = useState(false);
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const controller = new AbortController();
    const listen = async (): Promise<void> => {
      const response = await fetch(`${window.location.origin}/api/v1/orders/stream`, {
        headers: { authorization: `Bearer ${accessToken}`, accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!response.ok || response.body === null) return;
      setIsLive(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const parsed = parseSse(buffer + decoder.decode(value, { stream: true }));
        buffer = parsed.rest;
        parsed.events
          .filter((event) => event.event === 'order')
          .forEach((event) => handlerRef.current(JSON.parse(event.data) as OrderStreamEvent));
      }
    };
    listen()
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsLive(false);
      });
    return () => controller.abort();
  }, [accessToken]);

  return isLive;
};
