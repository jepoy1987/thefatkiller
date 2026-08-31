import { cloneElement, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

const controlStyles = 'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 hover:border-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(controlStyles, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(controlStyles, 'appearance-none bg-[linear-gradient(45deg,transparent_50%,currentColor_50%),linear-gradient(135deg,currentColor_50%,transparent_50%)] bg-[position:calc(100%-16px)_18px,calc(100%-11px)_18px] bg-[size:5px_5px,5px_5px] bg-no-repeat pr-9', className)} {...props}>{children}</select>;
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">{children}</label>;
}

export function FormField({ id, label, hint, error, children, className }: { id: string; label: string; hint?: string; error?: string; children: ReactElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>; className?: string }) {
  const descriptionId = hint || error ? `${id}-description` : undefined;
  return <div className={clsx('grid gap-2', className)}>
    <Label htmlFor={id}>{label}</Label>
    {cloneElement(children, { 'aria-describedby': descriptionId, 'aria-invalid': error ? true : undefined })}
    {hint || error ? <p id={descriptionId} className={clsx('text-xs leading-5', error ? 'text-destructive' : 'text-muted-foreground')}>{error ?? hint}</p> : null}
  </div>;
}
