// Shared settings for the k6 scenarios. Targets the kind staging cluster by default.
import http from 'k6/http';

export const API = __ENV.API_URL || 'http://bazaar.localhost';
export const WEB = __ENV.WEB_URL || 'http://bazaar.localhost';

/** Product slugs to spread reads over (first pages of the seeded catalog). */
export const productSlugs = (pages = 5) => {
  const slugs = [];
  for (let page = 1; page <= pages; page += 1) {
    const response = http.get(`${API}/api/v1/products?pageSize=50&page=${page}`);
    for (const item of response.json('items') || []) slugs.push(item.slug);
  }
  if (slugs.length === 0) throw new Error(`no products at ${API}`);
  return slugs;
};

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
