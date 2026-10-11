'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactElement } from 'react';

import { ErrorCode } from '@/api/gateway.schema';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { AlertTone } from '@/enums/alert-tone.enum';
import { Link } from '@/i18n/navigation';
import type { ApiResult } from '@/interfaces/api-result.interface';

import { verifyEmail } from '../auth-api';

/**
 * Confirms the token from the email link. It is a POST sent by script, so mail scanners that
 * merely open (GET) the link cannot use it up.
 */
export const VerifyEmail = (): ReactElement => {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const token = useSearchParams().get('token');
  const [result, setResult] = useState<ApiResult<undefined> | null>(null);
  useEffect(() => {
    if (token === null) return undefined;
    let isCurrent = true;
    void verifyEmail(token).then((outcome) => {
      if (isCurrent) setResult(outcome);
    });
    return () => {
      isCurrent = false;
    };
  }, [token]);
  if (token === null || result?.errorCode != null) {
    return (
      <FormAlert tone={AlertTone.Error}>
        <p>{tErrors(result?.errorCode ?? ErrorCode.INVALID_TOKEN)}</p>
        <Link href="/login">{t('signIn')}</Link>
      </FormAlert>
    );
  }
  if (result === null) return <p role="status">{t('verifying')}</p>;
  return (
    <FormAlert tone={AlertTone.Success}>
      <p>{t('verified')}</p>
      <Link href="/login">{t('signIn')}</Link>
    </FormAlert>
  );
};
