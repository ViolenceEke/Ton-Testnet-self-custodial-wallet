import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    fullWidth?: boolean;
    loading?: boolean;
  }
>;

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger'
};

export const Button = ({
  children,
  variant = 'primary',
  fullWidth,
  loading,
  disabled,
  ...rest
}: ButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`${variantClassMap[variant]} ${fullWidth ? 'btn-full' : ''}`.trim()}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
