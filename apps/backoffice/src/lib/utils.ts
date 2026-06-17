// Helper estándar de shadcn: combina clsx + tailwind-merge para que las
// clases de Tailwind se fusionen correctamente eliminando duplicados.
//
// Uso: <div className={cn('p-2 text-sm', isActive && 'bg-zinc-100', extra)} />

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
