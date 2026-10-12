import { browserCatalogApi } from '@/api/client.browser';
import { ErrorCode } from '@/api/gateway.schema';
import type { Locale } from '@/api/gateway.schema';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type { ReviewEligibility, ReviewPage, ReviewView } from '@/interfaces/catalog.interface';

const UNREACHABLE = { data: null, errorCode: ErrorCode.UPSTREAM_UNAVAILABLE } as const;

export const listReviews = async (slug: string): Promise<ApiResult<ReviewPage>> => {
  try {
    const { data, error } = await browserCatalogApi.GET('/api/v1/products/{slug}/reviews', {
      params: { path: { slug } },
    });
    return data === undefined ? { data: null, errorCode: error.code } : { data, errorCode: null };
  } catch {
    return UNREACHABLE;
  }
};

export const reviewEligibility = async (
  accessToken: string,
  slug: string,
): Promise<ReviewEligibility | null> => {
  try {
    const { data } = await browserCatalogApi.GET('/api/v1/products/{slug}/reviews/eligibility', {
      params: { path: { slug } },
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return data ?? null;
  } catch {
    return null;
  }
};

export const submitReview = async (
  accessToken: string,
  slug: string,
  review: { rating: number; comment: string; locale: Locale },
): Promise<ApiResult<ReviewView>> => {
  try {
    const { data, error } = await browserCatalogApi.POST('/api/v1/products/{slug}/reviews', {
      params: { path: { slug } },
      headers: { authorization: `Bearer ${accessToken}` },
      body: review,
    });
    return data === undefined ? { data: null, errorCode: error.code } : { data, errorCode: null };
  } catch {
    return UNREACHABLE;
  }
};
