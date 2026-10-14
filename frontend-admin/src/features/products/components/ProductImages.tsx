import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { ButtonVariant } from '@/enums/button-variant.enum';
import type { SellerProduct } from '@/interfaces/product.interface';

import './ProductImages.css';

interface ProductImagesProps {
  images: SellerProduct['images'];
  isBusy: boolean;
  onUpload: (file: File) => void;
  /** Receives the storage key of the image. */
  onRemove: (key: string) => void;
}

/** Product photos: JPEG/PNG/WebP up to 5 MB, uploaded straight to storage. */
export const ProductImages = ({
  images,
  isBusy,
  onUpload,
  onRemove,
}: ProductImagesProps): ReactElement => {
  const { t } = useTranslation();
  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file !== undefined) onUpload(file);
    event.target.value = '';
  };
  return (
    <section className="product-images stack" aria-labelledby="product-images-title">
      <h2 id="product-images-title" className="product-images__title">
        {t('productImages.title')}
      </h2>
      {images.length === 0 ? (
        <p className="product-images__empty">{t('productImages.none')}</p>
      ) : (
        <ul className="product-images__list">
          {images.map((image) => (
            <li key={image.url} className="product-images__item">
              <img className="product-images__image" src={image.url} alt="" />
              <Button
                variant={ButtonVariant.Ghost}
                disabled={isBusy}
                onClick={() => onRemove(image.key)}
              >
                {t('productImages.remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <label className="product-images__upload">
        {t('productImages.add')}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isBusy}
          onChange={handleFile}
        />
      </label>
    </section>
  );
};
