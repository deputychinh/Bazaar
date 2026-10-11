/** Card number checks; numbers never leave the payment module. */
export class CardUtil {
  /** Luhn checksum, as every card network uses. */
  public static isValidNumber(number: string): boolean {
    if (!/^\d{12,19}$/.test(number)) return false;
    let sum = 0;
    [...number].reverse().forEach((char, index) => {
      let digit = Number(char);
      if (index % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    });
    return sum % 10 === 0;
  }

  public static last4(number: string): string {
    return number.slice(-4);
  }
}
