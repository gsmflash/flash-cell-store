const OS_NUMBER_PATTERN = /^OS-(\d{4})-(\d{4,})$/;

/** Monta o número da OS a partir do ano e da sequência: OS-2026-0001. */
export function formatOsNumber(year: number, sequence: number): string {
  return `OS-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Extrai a sequência numérica de um número de OS existente, apenas se ele
 * pertencer ao ano informado. Retorna null para números de outros anos ou
 * que não seguem o padrão (não devem contar na próxima sequência).
 */
export function extractSequenceForYear(osNumber: string, year: number): number | null {
  const match = OS_NUMBER_PATTERN.exec(osNumber);
  if (!match) return null;
  const [, matchedYear, sequence] = match;
  if (Number(matchedYear) !== year) return null;
  return Number(sequence);
}

/** Calcula o próximo número de OS a partir do maior número já emitido no ano. */
export function nextOsNumber(year: number, lastNumberThisYear: string | null): string {
  const lastSequence = lastNumberThisYear ? (extractSequenceForYear(lastNumberThisYear, year) ?? 0) : 0;
  return formatOsNumber(year, lastSequence + 1);
}
