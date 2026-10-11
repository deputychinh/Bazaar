/** Public shape of a category node (needed explicitly for the recursive zod schema). */
export interface CategoryResponse {
  id: string;
  slug: string;
  name: { en: string; vi?: string };
  children: CategoryResponse[];
}
