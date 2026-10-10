/** Text stored in both languages; a missing `vi` falls back to `en` (plan §2B). */
export interface LocalizedText {
  en: string;
  vi?: string;
}
