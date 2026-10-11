'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useActionState, type ReactElement } from 'react';

import { ErrorCode } from '@/api/gateway.schema';
import { Button } from '@/components/Button/Button';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { TextField } from '@/components/TextField/TextField';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/constants/auth.constant';
import { AlertTone } from '@/enums/alert-tone.enum';
import { Link } from '@/i18n/navigation';
import type { ApiResult } from '@/interfaces/api-result.interface';
import { formText } from '@/utils/form-data.util';

import { resetPassword } from '../auth-api';

type ResetState = ApiResult<undefined> | null;

export const ResetPasswordForm = (): ReactElement => {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const token = useSearchParams().get('token');
  const [state, submit, isPending] = useActionState(
    async (_previous: ResetState, form: FormData): Promise<ResetState> =>
      resetPassword(token ?? '', formText(form, 'password')),
    null,
  );
  if (token === null) {
    return (
      <FormAlert tone={AlertTone.Error}>
        <p>{tErrors(ErrorCode.INVALID_TOKEN)}</p>
        <Link href="/forgot-password">{t('requestNewLink')}</Link>
      </FormAlert>
    );
  }
  if (state !== null && state.errorCode === null) {
    return (
      <FormAlert tone={AlertTone.Success}>
        <p>{t('passwordChanged')}</p>
        <Link href="/login">{t('signIn')}</Link>
      </FormAlert>
    );
  }
  return (
    <form className="stack" action={submit}>
      {state?.errorCode != null && (
        <FormAlert tone={AlertTone.Error}>
          <p>{tErrors(state.errorCode)}</p>
        </FormAlert>
      )}
      <TextField
        label={t('newPassword')}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        hint={t('passwordHint', { min: PASSWORD_MIN_LENGTH })}
        required
      />
      <Button type="submit" isFullWidth disabled={isPending}>
        {t('setPassword')}
      </Button>
    </form>
  );
};
