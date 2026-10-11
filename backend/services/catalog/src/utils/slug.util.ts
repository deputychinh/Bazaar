/** URL slugs from English or Vietnamese text: "Gốm Minh Long" → "gom-minh-long". */
export class SlugUtil {
  public static from(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** `base`, then `base-2`, `base-3`… until `isTaken` says no. */
  public static async unique(
    base: string,
    isTaken: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    let candidate = base;
    for (let suffix = 2; await isTaken(candidate); suffix += 1) {
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}
