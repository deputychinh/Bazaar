import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { ErrorCode } from '@/api/gateway.schema';
import { Button } from '@/components/Button/Button';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { TextField } from '@/components/TextField/TextField';
import { HOME_BY_ROLE } from '@/constants/area.constant';
import { AlertTone } from '@/enums/alert-tone.enum';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { safeNextPath } from '@/utils/safe-redirect.util';

import './LoginPage.css';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });

/** Sign-in for sellers and admins (React Hook Form + zod; server errors shown as messages). */
export const LoginPage = (): ReactElement => {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (user !== null)
    return (
      <Navigate to={safeNextPath(params.get('next'), HOME_BY_ROLE[user.role] ?? '/')} replace />
    );

  const submit = form.handleSubmit(async (values) => {
    const result = await login(values);
    if (result.data === null) {
      form.setError('root', { message: result.errorCode });
      return;
    }
    await navigate(safeNextPath(params.get('next'), HOME_BY_ROLE[result.data.role] ?? '/'), {
      replace: true,
    });
  });
  const rootError = form.formState.errors.root?.message as ErrorCode | undefined;

  return (
    <main id="main" className="login-page container">
      <form className="login-page__card stack" onSubmit={(event) => void submit(event)} noValidate>
        <h1 className="login-page__title">{t('login.title')}</h1>
        {rootError !== undefined && (
          <FormAlert tone={AlertTone.Error}>
            <p>{t(`errors.${rootError}`, { defaultValue: t(`errors.${ErrorCode.INTERNAL}`) })}</p>
          </FormAlert>
        )}
        <TextField
          label={t('login.email')}
          type="email"
          autoComplete="email"
          hint={form.formState.errors.email ? t('login.emailInvalid') : undefined}
          aria-invalid={form.formState.errors.email !== undefined}
          {...form.register('email')}
        />
        <TextField
          label={t('login.password')}
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
        <Button type="submit" isFullWidth disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('login.signingIn') : t('login.signIn')}
        </Button>
      </form>
    </main>
  );
};
