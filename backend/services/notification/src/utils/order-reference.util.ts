/** The short order number people read in emails and on the site (last 8 chars, upper case). */
export class OrderReferenceUtil {
  public static of(orderId: string): string {
    return orderId.slice(-8).toUpperCase();
  }
}
