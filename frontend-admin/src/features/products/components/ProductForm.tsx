import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactElement } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/Button/Button';
import { TextField } from '@/components/TextField/TextField';
import { ButtonVariant } from '@/enums/button-variant.enum';
import type { Category, ProductFormValues } from '@/interfaces/product.interface';
import { dollarsToCents } from '@/utils/money.util';

import './ProductForm.css';

const optionalText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || (value.length >= min && value.length <= max), 'length');

/** Same limits as the catalog (it validates again). Messages are i18n keys. */
const productFormSchema = z.object({
  titleEn: z.string().trim().min(3, 'length').max(120, 'length'),
  titleVi: optionalText(3, 120),
  descriptionEn: z.string().trim().min(10, 'length').max(5000, 'length'),
  descriptionVi: optionalText(10, 5000),
  categoryId: z.string().regex(/^[0-9a-f]{24}$/, 'required'),
  variants: z
    .array(
      z.object({
        sku: z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9-]{3,40}$/, 'sku'),
        price: z.string().refine((value) => (dollarsToCents(value) ?? 0) > 0, 'price'),
        stock: z.coerce.number().int().min(0, 'stock'),
        colourEn: z.string(),
        colourVi: z.string(),
      }),
    )
    .min(1),
});

interface ProductFormProps {
  defaultValues: ProductFormValues;
  categories: readonly Category[];
  isSaving: boolean;
  onSubmit: (values: ProductFormValues) => void;
}

/** Product text in both languages, category and variants (presentational: no fetching). */
export const ProductForm = ({
  defaultValues,
  categories,
  isSaving,
  onSubmit,
}: ProductFormProps): ReactElement => {
  const { t, i18n } = useTranslation();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as never,
    defaultValues,
  });
  const variants = useFieldArray({ control: form.control, name: 'variants' });
  const errors = form.formState.errors;
  const message = (code: string | undefined): string | undefined =>
    code === undefined ? undefined : t(`productForm.errors.${code}`);
  const options = categories.flatMap((category) => [category, ...category.children]);

  return (
    <form
      className="product-form stack"
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      noValidate
    >
      <div className="product-form__pair">
        <TextField
          label={t('productForm.titleEn')}
          hint={message(errors.titleEn?.message)}
          {...form.register('titleEn')}
        />
        <TextField
          label={t('productForm.titleVi')}
          hint={message(errors.titleVi?.message)}
          {...form.register('titleVi')}
        />
      </div>
      <div className="product-form__pair">
        <div className="product-form__label">
          <label htmlFor="descriptionEn">{t('productForm.descriptionEn')}</label>
          <textarea
            id="descriptionEn"
            className="product-form__textarea"
            rows={4}
            aria-describedby={errors.descriptionEn ? 'descriptionEn-error' : undefined}
            {...form.register('descriptionEn')}
          />
          {errors.descriptionEn && (
            <span id="descriptionEn-error" className="product-form__error">
              {message(errors.descriptionEn.message)}
            </span>
          )}
        </div>
        <div className="product-form__label">
          <label htmlFor="descriptionVi">{t('productForm.descriptionVi')}</label>
          <textarea
            id="descriptionVi"
            className="product-form__textarea"
            rows={4}
            aria-describedby={errors.descriptionVi ? 'descriptionVi-error' : undefined}
            {...form.register('descriptionVi')}
          />
          {errors.descriptionVi && (
            <span id="descriptionVi-error" className="product-form__error">
              {message(errors.descriptionVi.message)}
            </span>
          )}
        </div>
      </div>
      <div className="product-form__label">
        <label htmlFor="categoryId">{t('productForm.category')}</label>
        <select
          id="categoryId"
          className="product-form__select"
          aria-describedby={errors.categoryId ? 'categoryId-error' : undefined}
          {...form.register('categoryId')}
        >
          <option value="">{t('productForm.chooseCategory')}</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {i18n.language === 'vi' && category.name.vi ? category.name.vi : category.name.en}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <span id="categoryId-error" className="product-form__error">
            {message(errors.categoryId.message)}
          </span>
        )}
      </div>

      <fieldset className="product-form__variants">
        <legend className="product-form__legend">{t('productForm.variants')}</legend>
        {variants.fields.map((field, index) => (
          <div key={field.id} className="product-form__variant">
            <TextField
              label={t('productForm.sku')}
              hint={message(errors.variants?.[index]?.sku?.message)}
              {...form.register(`variants.${index}.sku`)}
            />
            <TextField
              label={t('productForm.price')}
              inputMode="decimal"
              hint={message(errors.variants?.[index]?.price?.message)}
              {...form.register(`variants.${index}.price`)}
            />
            <TextField
              label={t('productForm.stock')}
              type="number"
              min={0}
              hint={message(errors.variants?.[index]?.stock?.message)}
              {...form.register(`variants.${index}.stock`)}
            />
            <TextField
              label={t('productForm.colourEn')}
              {...form.register(`variants.${index}.colourEn`)}
            />
            <TextField
              label={t('productForm.colourVi')}
              {...form.register(`variants.${index}.colourVi`)}
            />
            {variants.fields.length > 1 && (
              <Button variant={ButtonVariant.Ghost} onClick={() => variants.remove(index)}>
                {t('productForm.removeVariant')}
              </Button>
            )}
          </div>
        ))}
        <Button
          variant={ButtonVariant.Secondary}
          onClick={() =>
            variants.append({ sku: '', price: '', stock: 0, colourEn: '', colourVi: '' })
          }
        >
          {t('productForm.addVariant')}
        </Button>
      </fieldset>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? t('productForm.saving') : t('productForm.save')}
      </Button>
    </form>
  );
};
