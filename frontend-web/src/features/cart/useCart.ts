import { use } from 'react';

import type { CartContextValue } from '@/interfaces/cart.interface';

import { CartContext } from './CartProvider';

export const useCart = (): CartContextValue => {
  const value = use(CartContext);
  if (value === null) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return value;
};
