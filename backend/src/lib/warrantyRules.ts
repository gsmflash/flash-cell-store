export type WarrantyType = 'manufacturer' | 'store' | 'service';

/**
 * Prazos padrão de garantia em dias. 90 dias é o mínimo legal do CDC
 * (Código de Defesa do Consumidor) para produtos duráveis no Brasil — usamos
 * isso como piso tanto para produto quanto para serviço, e um prazo maior
 * para garantia de fabricante (convenção comum de 1 ano).
 */
export const DEFAULT_WARRANTY_DAYS: Record<WarrantyType, number> = {
  service: 90,
  store: 90,
  manufacturer: 365,
};

/** Calcula a data de fim da garantia a partir da data de início e do tipo. */
export function computeWarrantyEndDate(startDate: Date, type: WarrantyType): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + DEFAULT_WARRANTY_DAYS[type]);
  return end;
}

/** Uma garantia está dentro do prazo se isActive e a data atual ainda não passou de endDate. */
export function isWarrantyValid(isActive: boolean, endDate: Date, now: Date = new Date()): boolean {
  return isActive && now <= endDate;
}
