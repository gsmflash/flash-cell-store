const ORDER_NUMBER_PATTERN = /^PED-(\d{4})-(\d{4,})$/;

/** Monta o número do pedido a partir do ano e da sequência: PED-2026-0001. */
export function formatOrderNumber(year: number, sequence: number): string {
  return `PED-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Extrai a sequência numérica de um número de pedido existente, apenas se
 * ele pertencer ao ano informado.
 */
export function extractOrderSequenceForYear(orderNumber: string, year: number): number | null {
  const match = ORDER_NUMBER_PATTERN.exec(orderNumber);
  if (!match) return null;
  const [, matchedYear, sequence] = match;
  if (Number(matchedYear) !== year) return null;
  return Number(sequence);
}

/** Calcula o próximo número de pedido a partir do maior número já emitido no ano. */
export function nextOrderNumber(year: number, lastNumberThisYear: string | null): string {
  const lastSequence = lastNumberThisYear ? (extractOrderSequenceForYear(lastNumberThisYear, year) ?? 0) : 0;
  return formatOrderNumber(year, lastSequence + 1);
}
