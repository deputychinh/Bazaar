/** Port: asks the customer site to rebuild a product page now (on-demand ISR). */
export abstract class WebRevalidator {
  public abstract revalidateProduct(slug: string): Promise<void>;
}
