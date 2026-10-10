/** Keyset-paginated list (plan §6A.3 REST style). */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
