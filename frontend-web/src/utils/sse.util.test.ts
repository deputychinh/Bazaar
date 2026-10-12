import { parseSse } from './sse.util';

describe('parseSse', () => {
  it('returns complete events and keeps the unfinished rest', () => {
    const { events, rest } = parseSse(
      'event: order\ndata: {"a":1}\n\nevent: ping\ndata: \n\nevent: order\ndata: {"b"',
    );
    expect(events).toEqual([
      { event: 'order', data: '{"a":1}' },
      { event: 'ping', data: '' },
    ]);
    expect(rest).toBe('event: order\ndata: {"b"');
  });

  it('defaults the event name, joins data lines and skips comments', () => {
    expect(parseSse(': keep-alive\n\ndata: one\ndata: two\r\n\r\n').events).toEqual([
      { event: 'message', data: 'one\ntwo' },
    ]);
  });
});
