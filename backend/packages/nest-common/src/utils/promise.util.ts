export class PromiseUtil {
  /** Rejects with `label timed out after Nms` if `promise` does not settle in time. */
  public static async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  public static errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
