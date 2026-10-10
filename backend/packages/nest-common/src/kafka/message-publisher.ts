import type { OutgoingMessage } from '../interfaces/kafka-message.interface.js';

/** Port for sending raw messages; the Kafka adapter is EventProducer (plan §6A.3 DIP). */
export abstract class MessagePublisher {
  public abstract send(message: OutgoingMessage): Promise<void>;
}
