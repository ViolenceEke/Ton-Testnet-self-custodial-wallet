import type { PropsWithChildren } from 'react';

type AlertTone = 'info' | 'warning' | 'error' | 'success';

type AlertProps = PropsWithChildren<{
  tone?: AlertTone;
  title?: string;
}>;

export const Alert = ({ tone = 'info', title, children }: AlertProps): JSX.Element => {
  return (
    <div className={`alert alert-${tone}`} role="alert">
      {title ? <strong className="alert-title">{title}</strong> : null}
      <div className="alert-body">{children}</div>
    </div>
  );
};
