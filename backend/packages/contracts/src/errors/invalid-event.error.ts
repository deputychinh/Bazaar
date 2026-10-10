import { ErrorCode } from '../enums/error-code.enum';

/** Thrown when a Kafka message does not match its contract. */
export class InvalidEventError extends Error {
  public readonly code = ErrorCode.InvalidEvent;

  public constructor(
    message: string,
    public readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'InvalidEventError';
  }
}
