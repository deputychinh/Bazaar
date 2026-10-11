const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export class HtmlUtil {
  /** Text safe to place inside HTML elements and attribute values. */
  public static escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
  }
}
