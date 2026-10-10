import type { Locale } from '../enums/locale.enum';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  preferredLocale: Locale;
}

/** `link` contains a one-time token; `identity.events` uses short retention (plan §5.2). */
export interface EmailVerificationRequestedPayload {
  userId: string;
  email: string;
  preferredLocale: Locale;
  link: string;
}

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  preferredLocale: Locale;
  link: string;
}

export interface SellerApprovedPayload {
  userId: string;
  applicationId: string;
  shopName: string;
}
