import type { ReactElement, ReactNode } from 'react';

import { ProductCard } from '@/components/ProductCard/ProductCard';
import { PRIORITY_IMAGE_COUNT } from '@/constants/catalog.constant';
import type { ProductSummary } from '@/interfaces/catalog.interface';
import { cx } from '@/utils/cx.util';

import './ProductGrid.css';

interface ProductGridProps {
  products: readonly ProductSummary[];
  /** Six columns on wide screens (full-width rows); five beside a sidebar otherwise. */
  isWide?: boolean;
  /** Corner ribbon on every card. */
  ribbon?: ReactNode;
}

export const ProductGrid = ({
  products,
  isWide = false,
  ribbon,
}: ProductGridProps): ReactElement => (
  <ul className={cx('product-grid', isWide && 'product-grid--wide')}>
    {products.map((product, index) => (
      <li key={product.id} className="product-grid__item">
        <ProductCard product={product} isPriority={index < PRIORITY_IMAGE_COUNT} ribbon={ribbon} />
      </li>
    ))}
  </ul>
);
