/** Port for the current time, so domain code and tests control "now" (plan §6A.3 DIP). */
export abstract class Clock {
  public abstract now(): Date;
}
