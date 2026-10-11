/** Turns a stored string back into an enum value, failing loudly on unknown data. */
export class EnumUtil {
  public static parse<TEnum extends Record<string, string>>(
    enumObject: TEnum,
    value: string,
  ): TEnum[keyof TEnum] {
    const values = Object.values(enumObject);
    if (!values.includes(value)) {
      throw new Error(`Unknown enum value "${value}"; expected one of ${values.join(', ')}`);
    }
    return value as TEnum[keyof TEnum];
  }
}
