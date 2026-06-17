// Botón base de shadcn/ui (instalación inicial del scaffold).
//
// Para añadir más componentes: `pnpm --filter @core/backoffice dlx shadcn@latest add <component>`.

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-zinc-900 text-white hover:bg-zinc-800',
      outline: 'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50',
      ghost: 'text-zinc-900 hover:bg-zinc-100',
    } as const;
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-6 text-base',
    } as const;
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
