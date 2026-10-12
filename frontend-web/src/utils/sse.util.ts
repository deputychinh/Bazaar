import type { ParsedSse } from '@/interfaces/order-event.interface';

/**
 * Splits buffered SSE text into complete events; returns them with the unfinished rest, which
 * the caller keeps until more bytes arrive.
 */
export const parseSse = (buffer: string): { events: ParsedSse[]; rest: string } => {
  const blocks = buffer.replaceAll('\r\n', '\n').split('\n\n');
  const rest = blocks.pop() ?? '';
  const events = blocks.flatMap((block) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    return data.length === 0 ? [] : [{ event, data: data.join('\n') }];
  });
  return { events, rest };
};
