import type { ReactElement, ReactNode } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/interfaces/catalog.interface';

import './ProductRow.css';

interface ProductRowProps {
  id: string;
  title: string;
  products: readonly ProductSummary[];
  more?: { href: string; label: string };
  ribbon?: ReactNode;
  /** Wide button under the grid, e.g. "See more". */
  moreButton?: { href: string; label: string };
}

/** A titled home row ("Top sales", "Daily discover") on a white panel. */
export const ProductRow = ({
  id,
  title,
  products,
  more,
  ribbon,
  moreButton,
}: ProductRowProps): ReactElement => (
  <section className="panel" aria-labelledby={id}>
    <div className="panel__head">
      <h2 id={id} className="panel__title panel__title--brand">
        {title}
      </h2>
      {more !== undefined && (
        <Link className="panel__more" href={more.href}>
          {more.label}
          <Icon name={IconName.ChevronRight} />
        </Link>
      )}
    </div>
    <div className="panel__body">
      <ProductGrid products={products} isWide ribbon={ribbon} />
      {moreButton !== undefined && (
        <div className="product-row__footer">
          <Link className="button button--ghost product-row__more" href={moreButton.href}>
            {moreButton.label}
          </Link>
        </div>
      )}
    </div>
  </section>
);
