import { useId, type InputHTMLAttributes, type ReactElement } from 'react';

import './TextField.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

/** Labelled input; the hint is announced with the field. */
export const TextField = ({ label, hint, id, ...input }: TextFieldProps): ReactElement => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  return (
    <div className="text-field">
      <label className="text-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="text-field__input"
        id={inputId}
        aria-describedby={hint === undefined ? undefined : hintId}
        {...input}
      />
      {hint !== undefined && (
        <p className="text-field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
};
