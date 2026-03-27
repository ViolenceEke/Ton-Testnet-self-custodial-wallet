import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const Input = ({ label, error, hint, id, ...props }: InputProps): JSX.Element => {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <input id={inputId} className={`input ${error ? 'input-error' : ''}`} {...props} />
      {error ? <span className="field-error">{error}</span> : null}
      {!error && hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
};
