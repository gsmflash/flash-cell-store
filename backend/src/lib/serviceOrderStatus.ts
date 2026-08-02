export type ServiceOrderStatus =
  | 'received'
  | 'diagnosing'
  | 'waiting_parts'
  | 'waiting_approval'
  | 'approved'
  | 'in_progress'
  | 'done'
  | 'delivered'
  | 'cancelled';

/**
 * Estados "ativos" — enquanto a OS está em qualquer um deles, o técnico
 * pode mover livremente pra qualquer outro (avançar ou voltar), porque na
 * prática o atendimento raramente é 100% linear: pode precisar voltar de
 * "em andamento" pra "aguardando peças" no meio do reparo, por exemplo.
 *
 * `delivered` e `cancelled` continuam sendo estados finais de verdade — uma
 * vez lá, não tem como voltar (reabrir exigiria um fluxo específico, que
 * não faz parte deste conjunto de mudanças).
 */
const ACTIVE_STATUSES: ServiceOrderStatus[] = [
  'received',
  'diagnosing',
  'waiting_parts',
  'waiting_approval',
  'approved',
  'in_progress',
  'done',
];

const ALLOWED_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  received: [...ACTIVE_STATUSES.filter((s) => s !== 'received'), 'cancelled'],
  diagnosing: [...ACTIVE_STATUSES.filter((s) => s !== 'diagnosing'), 'cancelled'],
  waiting_parts: [...ACTIVE_STATUSES.filter((s) => s !== 'waiting_parts'), 'cancelled'],
  waiting_approval: [...ACTIVE_STATUSES.filter((s) => s !== 'waiting_approval'), 'cancelled'],
  approved: [...ACTIVE_STATUSES.filter((s) => s !== 'approved'), 'cancelled'],
  in_progress: [...ACTIVE_STATUSES.filter((s) => s !== 'in_progress'), 'cancelled'],
  done: [...ACTIVE_STATUSES.filter((s) => s !== 'done'), 'delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function isValidStatusTransition(from: ServiceOrderStatus, to: ServiceOrderStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getAllowedNextStatuses(from: ServiceOrderStatus): ServiceOrderStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

/** Indica se a mudança é um retrocesso (útil pro frontend destacar/confirmar de forma diferente). */
export function isBackwardTransition(from: ServiceOrderStatus, to: ServiceOrderStatus): boolean {
  const fromIndex = ACTIVE_STATUSES.indexOf(from);
  const toIndex = ACTIVE_STATUSES.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false; // envolve delivered/cancelled — não é "voltar etapa"
  return toIndex < fromIndex;
}
