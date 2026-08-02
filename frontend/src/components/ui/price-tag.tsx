import { cn } from '@/lib/utils';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PriceTag({
  sellPrice,
  salePrice,
  size = 'md',
  className,
}: {
  sellPrice: number;
  salePrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const hasDiscount = salePrice !== undefined && salePrice !== null && salePrice < sellPrice;
  const finalPrice = hasDiscount ? salePrice : sellPrice;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={cn('flex items-baseline gap-2 font-mono', className)}>
      <span className={cn('font-semibold text-ink', sizeClasses)}>{formatBRL(finalPrice)}</span>
      {hasDiscount && <span className="text-xs text-muted-foreground line-through">{formatBRL(sellPrice)}</span>}
    </div>
  );
}
