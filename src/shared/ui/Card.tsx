import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  className?: string;
}>;

export const Card = ({ title, subtitle, className, children }: CardProps): JSX.Element => {
  return (
    <section className={`card ${className ?? ''}`.trim()}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
};
