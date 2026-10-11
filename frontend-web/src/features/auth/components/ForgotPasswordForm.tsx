'use client';

import { useTranslations } from 'next-intl';
import { useActionState, type ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { TextField } from '@/components/TextField/TextField';
import { AlertTone } from '@/enums/alert-tone.enum';
import type { ApiResult } from '@/interfaces/api-result.interface';
import { formText } from '@/utils/form-data.util';

import { forgotPassword } from '../auth-api';

type ForgotState = ApiResult<undefined> | null;

/** Always answers the same way, whether or not the email has an account (no account probing). */
export const ForgotPasswordForm = (): ReactElement => {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const [state, submit, isPending] = useActionState(
    async (_previous: ForgotState, form: FormData): Promise<ForgotState> =>
      forgotPassword(formText(form, 'email')),
    null,
  );
  if (state !== null && state.errorCode === null) {
    return (
      <FormAlert tone={AlertTone.Success}>
        <p>{t('resetSent')}</p>
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
      <TextField label={t('email')} name="email" type="email" autoComplete="email" required />
      <Button type="submit" isFullWidth disabled={isPending}>
        {t('sendResetLink')}
      </Button>
    </form>
  );
};
