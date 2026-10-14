import { expect, type Page } from '@playwright/test';

export const GATEWAY = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';
export const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8026';
export const PASSWORD = 'Bazaar@2026!';

/** JSON call to the gateway (setup steps that are not part of the journey). */
export const api = async <T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> => {
  const response = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.token === undefined ? {} : { authorization: `Bearer ${init.token}` }),
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error(
      `${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`,
    );
  return (response.status === 204 ? undefined : await response.json()) as T;
};

const tokens = new Map<string, Promise<string>>();

/**
 * An access token for `email`, logged in once per run: the gateway rate-limits logins per IP,
 * and every journey (plus the UI sign-ins) shares the same address.
 */
export const tokenFor = (email: string, password = PASSWORD): Promise<string> => {
  const cached = tokens.get(email);
  if (cached !== undefined) return cached;
  const token = api<{ accessToken: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then((session) => session.accessToken);
  tokens.set(email, token);
  token.catch(() => tokens.delete(email));
  return token;
};

/** The verification link mailed to `email` (sent by the notification service through Mailpit). */
export const verificationToken = async (email: string): Promise<string> => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const search = (await (
      await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`)
    ).json()) as {
      messages?: { ID: string }[];
    };
    const first = search.messages?.[0];
    if (first !== undefined) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${first.ID}`)).json()) as {
        Text: string;
      };
      const token = /token=([\w-]+)/.exec(message.Text)?.[1];
      if (token !== undefined) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no verification email for ${email}`);
};

/** Signs in through the admin site's form, like a person would. */
export const signIn = async (page: Page, email: string): Promise<void> => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
};
