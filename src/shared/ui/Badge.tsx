import type { PropsWithChildren } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone;
}>;

export const Badge = ({ tone = 'neutral', children }: BadgeProps): JSX.Element => {
  return <span className={`badge badge-${tone}`}>{children}</span>;
};
