import type { ApiFailure } from '@/interfaces/api-failure.interface';

export const apiFailure = (code: string, details?: unknown): ApiFailure =>
  Object.assign(new Error(code), { code, details });

/** The problem code of a failed query or mutation (INTERNAL for anything unexpected). */
export const failureCode = (error: unknown): string =>
  error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'INTERNAL';
