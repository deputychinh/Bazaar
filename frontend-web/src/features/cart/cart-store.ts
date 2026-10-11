import { CART_STORAGE_KEY } from '@/constants/cart.constant';
import type { CartLine } from '@/interfaces/cart.interface';
import { parseStoredCart } from '@/utils/cart.util';

// The cart lives in localStorage; this store lets React subscribe to it and keeps tabs in sync.
const listeners = new Set<() => void>();
const EMPTY: readonly CartLine[] = [];
let cached: { raw: string | null; lines: readonly CartLine[] } = { raw: null, lines: EMPTY };

const notify = (): void => listeners.forEach((listener) => listener());

const onStorage = (event: StorageEvent): void => {
  if (event.key === CART_STORAGE_KEY) notify();
};

export const subscribeToCart = (listener: () => void): (() => void) => {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
};

/** Same array while the stored text is unchanged, as useSyncExternalStore requires. */
export const readCart = (): readonly CartLine[] => {
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (raw !== cached.raw) cached = { raw, lines: parseStoredCart(raw) };
  return cached.lines;
};

export const readServerCart = (): readonly CartLine[] => EMPTY;

export const writeCart = (lines: readonly CartLine[]): void => {
  if (lines.length === 0) window.localStorage.removeItem(CART_STORAGE_KEY);
  else window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  notify();
};
