/** A text field of a submitted form; files and missing fields read as empty. */
export const formText = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};
