/** Arithmetic on integer USD cents — the only money unit stored (plan §2B). */
export class MoneyUtil {
  public static lineTotal(unitPriceUsdCents: number, quantity: number): number {
    MoneyUtil.assertCents(unitPriceUsdCents);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new RangeError(`Quantity must be a positive integer, got ${quantity}`);
    }
    return MoneyUtil.assertCents(unitPriceUsdCents * quantity);
  }

  public static sum(amountsUsdCents: readonly number[]): number {
    return MoneyUtil.assertCents(
      amountsUsdCents.reduce((total, amount) => total + MoneyUtil.assertCents(amount), 0),
    );
  }

  public static assertCents(value: number): number {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`Amount must be a non-negative integer of cents, got ${value}`);
    }
    return value;
  }
}
