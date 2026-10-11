import type { EventReaction } from '../../interfaces/event-reaction.interface.js';

/**
 * DI token: every reaction, in the order they run (log first). Feature modules add theirs in
 * EventsModule; the pipeline handlers call them all for each event.
 */
export abstract class EventReactions {
  public abstract readonly all: readonly EventReaction[];
}
