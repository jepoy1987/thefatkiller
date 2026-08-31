import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonStyles({ variant = 'primary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return clsx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
    {
      'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
      'bg-secondary text-white hover:bg-secondary/90': variant === 'secondary',
      'border bg-card text-foreground hover:bg-muted': variant === 'outline',
      'text-muted-foreground hover:bg-muted hover:text-foreground': variant === 'ghost',
      'bg-destructive text-white hover:bg-destructive/90': variant === 'danger',
      'h-9 px-3 text-sm': size === 'sm',
      'h-11 px-4 text-sm': size === 'md',
      'h-12 px-5 text-base': size === 'lg',
    },
    className,
  );
}

export function Button({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const { variant, size, ...buttonProps } = props;
  return <button type={type} className={buttonStyles({ variant, size, className })} {...buttonProps} />;
}
