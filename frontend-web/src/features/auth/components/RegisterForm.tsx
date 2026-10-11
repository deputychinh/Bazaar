'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, type ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { TextField } from '@/components/TextField/TextField';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/constants/auth.constant';
import { AlertTone } from '@/enums/alert-tone.enum';
import type { ApiResult } from '@/interfaces/api-result.interface';
import { formText } from '@/utils/form-data.util';

import { register } from '../auth-api';

type RegisterState = ApiResult<string> | null;

export const RegisterForm = (): ReactElement => {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const [state, submit, isPending] = useActionState(
    async (_previous: RegisterState, form: FormData): Promise<RegisterState> => {
      const result = await register({
        email: formText(form, 'email'),
        password: formText(form, 'password'),
        preferredLocale: locale,
      });
      return result.data === null ? result : { data: result.data.email, errorCode: null };
    },
    null,
  );
  if (state?.data != null) {
    return (
      <FormAlert tone={AlertTone.Success}>
        <p>{t('checkInbox', { email: state.data })}</p>
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
      <TextField
        label={t('password')}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        hint={t('passwordHint', { min: PASSWORD_MIN_LENGTH })}
        required
      />
      <Button type="submit" isFullWidth disabled={isPending}>
        {t('createAccount')}
      </Button>
    </form>
  );
};
