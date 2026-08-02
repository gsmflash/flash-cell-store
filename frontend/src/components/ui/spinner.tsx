import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn('h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}
