import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitário para combinar classes Tailwind sem conflitos.
 * Usado pelo shadcn/ui e em toda a aplicação.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
