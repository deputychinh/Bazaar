import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { ProductStatus } from '@/api/catalog.schema';
import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { AlertTone } from '@/enums/alert-tone.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { ProductForm } from '@/features/products/components/ProductForm';
import { ProductImages } from '@/features/products/components/ProductImages';
import {
  useCategories,
  useProductAction,
  useSaveProduct,
  useSellerProduct,
} from '@/features/products/hooks/useSellerProducts';
import { failureCode } from '@/utils/api-error.util';
import { emptyProductForm, formToRequest, productToForm } from '@/utils/product-form.util';

/** Create a product (/seller/products/new) or edit one, with publishing and images. */
export const ProductEditorPage = (): ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const productId = id === 'new' ? undefined : id;
  const product = useSellerProduct(productId);
  const categories = useCategories();
  const save = useSaveProduct(productId);
  const action = useProductAction(productId ?? '');

  if ((productId !== undefined && product.isPending) || categories.isPending) {
    return <p role="status">{t('common.loading')}</p>;
  }
  if (product.isError)
    return <ErrorState error={product.error} onRetry={() => void product.refetch()} />;
  if (categories.isError)
    return <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />;

  const current = productId === undefined ? undefined : product.data;
  const failure = save.error ?? action.error;

  return (
    <main id="main" className="container stack">
      <header className="stack">
        <h1>{current === undefined ? t('productForm.newTitle') : t('productForm.editTitle')}</h1>
        {current !== undefined && <StatusBadge status={current.status} />}
        {current?.hiddenReason != null && (
          <FormAlert tone={AlertTone.Error}>
            <p>{t('productForm.hidden', { reason: current.hiddenReason })}</p>
          </FormAlert>
        )}
      </header>
      {failure !== null && (
        <FormAlert tone={AlertTone.Error}>
          <p>{t(`errors.${failureCode(failure)}`, { defaultValue: t('errors.INTERNAL') })}</p>
        </FormAlert>
      )}
      {save.isSuccess && (
        <FormAlert tone={AlertTone.Success}>
          <p>{t('productForm.saved')}</p>
        </FormAlert>
      )}
      <ProductForm
        key={current?.updatedAt ?? 'new'}
        defaultValues={current === undefined ? emptyProductForm() : productToForm(current)}
        categories={categories.data}
        isSaving={save.isPending}
        onSubmit={(values) =>
          save.mutate(formToRequest(values), {
            onSuccess: (saved) => {
              if (productId === undefined)
                void navigate(`/seller/products/${saved.id}`, { replace: true });
            },
          })
        }
      />
      {current !== undefined && (
        <>
          <div className="cluster">
            {current.status === ProductStatus.PUBLISHED ? (
              <Button
                variant={ButtonVariant.Secondary}
                disabled={action.isPending}
                onClick={() => action.mutate('unpublish')}
              >
                {t('productForm.unpublish')}
              </Button>
            ) : current.status === ProductStatus.DRAFT ? (
              <Button disabled={action.isPending} onClick={() => action.mutate('publish')}>
                {t('productForm.publish')}
              </Button>
            ) : null}
          </div>
          <ProductImages
            images={current.images}
            isBusy={action.isPending}
            onUpload={(file) => action.mutate({ upload: file })}
            onRemove={(key) => action.mutate({ remove: key })}
          />
        </>
      )}
    </main>
  );
};
