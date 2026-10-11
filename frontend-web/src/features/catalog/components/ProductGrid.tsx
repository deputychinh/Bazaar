import type { ReactElement } from 'react';

import { ProductCard } from '@/components/ProductCard/ProductCard';
import { PRIORITY_IMAGE_COUNT } from '@/constants/catalog.constant';
import type { ProductSummary } from '@/interfaces/catalog.interface';

import './ProductGrid.css';

interface ProductGridProps {
  products: readonly ProductSummary[];
}

export const ProductGrid = ({ products }: ProductGridProps): ReactElement => (
  <ul className="product-grid">
    {products.map((product, index) => (
      <li key={product.id} className="product-grid__item">
        <ProductCard product={product} isPriority={index < PRIORITY_IMAGE_COUNT} />
      </li>
    ))}
  </ul>
);
