'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState, type ReactElement } from 'react';

import { PRODUCT_GALLERY_SIZES } from '@/constants/catalog.constant';
import type { GalleryImage } from '@/interfaces/gallery-image.interface';
import { cx } from '@/utils/cx.util';

import './ProductGallery.css';

interface ProductGalleryProps {
  images: readonly GalleryImage[];
}

/** Main image with thumbnails; the first image is the page's LCP element, so it loads first. */
export const ProductGallery = ({ images }: ProductGalleryProps): ReactElement => {
  const t = useTranslations('product');
  const [selected, setSelected] = useState(0);
  const current = images[selected];
  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        {current === undefined ? (
          <div className="product-gallery__placeholder" aria-hidden="true" />
        ) : (
          <Image
            className="product-gallery__image"
            src={current.url}
            alt={current.alt}
            fill
            sizes={PRODUCT_GALLERY_SIZES}
            priority={selected === 0}
          />
        )}
      </div>
      {images.length > 1 && (
        <ul className="product-gallery__thumbs" aria-label={t('gallery')}>
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                className={cx('product-gallery__thumb', index === selected && 'is-selected')}
                aria-label={t('showImage', { index: index + 1, total: images.length })}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                <Image
                  className="product-gallery__image"
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
