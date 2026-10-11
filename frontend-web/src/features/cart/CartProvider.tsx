'use client';

import {
  createContext,
  type ReactElement,
  type ReactNode,
  useMemo,
  useSyncExternalStore,
} from 'react';

import type { CartContextValue } from '@/interfaces/cart.interface';
import { addLine, cartSubtotalUsdCents, setLineQuantity } from '@/utils/cart.util';

import { readCart, readServerCart, subscribeToCart, writeCart } from './cart-store';

export const CartContext = createContext<CartContextValue | null>(null);

const subscribeToNothing = (): (() => void) => () => undefined;

interface CartProviderProps {
  children: ReactNode;
}

/** Client-only cart (plan §6.2): server HTML stays cacheable and shows an empty cart until hydration. */
export const CartProvider = ({ children }: CartProviderProps): ReactElement => {
  const lines = useSyncExternalStore(subscribeToCart, readCart, readServerCart);
  const isReady = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      subtotalUsdCents: cartSubtotalUsdCents(lines),
      isReady,
      add: (line, quantity) => writeCart(addLine(readCart(), line, quantity)),
      setQuantity: (sku, quantity) => writeCart(setLineQuantity(readCart(), sku, quantity)),
      remove: (sku) => writeCart(setLineQuantity(readCart(), sku, 0)),
      clear: () => writeCart([]),
    }),
    [lines, isReady],
  );
  return <CartContext value={value}>{children}</CartContext>;
};
