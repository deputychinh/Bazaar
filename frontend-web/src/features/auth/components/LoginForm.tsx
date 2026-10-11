'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useActionState, useState, type ReactElement } from 'react';

import { ErrorCode } from '@/api/gateway.schema';
import { Button } from '@/components/Button/Button';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { TextField } from '@/components/TextField/TextField';
import { AlertTone } from '@/enums/alert-tone.enum';
import { Link, useRouter } from '@/i18n/navigation';
import { formText } from '@/utils/form-data.util';
import { safeNextPath } from '@/utils/safe-redirect.util';

import { resendVerification } from '../auth-api';
import { useAuth } from '../useAuth';

export const LoginForm = (): ReactElement => {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const { login } = useAuth();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'), '/account');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [errorCode, submit, isPending] = useActionState(
    async (_previous: ErrorCode | null, form: FormData): Promise<ErrorCode | null> => {
      const result = await login({
        email: formText(form, 'email'),
        password: formText(form, 'password'),
      });
      if (result.errorCode !== null) return result.errorCode;
      // `next` was checked to be a local path; typed routes cannot know it statically.
      router.replace(next);
      return null;
    },
    null,
  );
  const handleResend = async (): Promise<void> => {
    await resendVerification(email);
    setResent(true);
  };
  return (
    <form className="stack" action={submit}>
      {errorCode !== null && (
        <FormAlert tone={AlertTone.Error}>
          <p>{tErrors(errorCode)}</p>
          {errorCode === ErrorCode.EMAIL_NOT_VERIFIED &&
            (resent ? (
              <p>{t('verificationResent')}</p>
            ) : (
              <Button onClick={() => void handleResend()}>{t('resendVerification')}</Button>
            ))}
        </FormAlert>
      )}
      <TextField
        label={t('email')}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label={t('password')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Link href="/forgot-password">{t('forgotLink')}</Link>
      <Button type="submit" isFullWidth disabled={isPending}>
        {isPending ? t('signingIn') : t('signIn')}
      </Button>
    </form>
  );
};
