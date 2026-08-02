import { describe, it, expect } from 'vitest';
import { isValidStatusTransition, getAllowedNextStatuses, isBackwardTransition } from './serviceOrderStatus';

describe('isValidStatusTransition', () => {
  it('permite o fluxo feliz completo', () => {
    expect(isValidStatusTransition('received', 'diagnosing')).toBe(true);
    expect(isValidStatusTransition('diagnosing', 'approved')).toBe(true);
    expect(isValidStatusTransition('approved', 'in_progress')).toBe(true);
    expect(isValidStatusTransition('in_progress', 'done')).toBe(true);
    expect(isValidStatusTransition('done', 'delivered')).toBe(true);
  });

  it('permite cancelar a partir de qualquer status não-terminal', () => {
    expect(isValidStatusTransition('received', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('waiting_approval', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('in_progress', 'cancelled')).toBe(true);
  });

  it('permite voltar etapas entre estados ativos (decisão de produto: fluxo raramente é linear)', () => {
    expect(isValidStatusTransition('in_progress', 'waiting_parts')).toBe(true);
    expect(isValidStatusTransition('approved', 'diagnosing')).toBe(true);
    expect(isValidStatusTransition('done', 'in_progress')).toBe(true);
  });

  it('permite mover entre estados ativos não-adjacentes (ex: received direto pra approved)', () => {
    expect(isValidStatusTransition('received', 'approved')).toBe(true);
  });

  it('rejeita qualquer transição a partir de estados terminais (delivered/cancelled nunca reabrem)', () => {
    expect(isValidStatusTransition('delivered', 'received')).toBe(false);
    expect(isValidStatusTransition('delivered', 'in_progress')).toBe(false);
    expect(isValidStatusTransition('cancelled', 'received')).toBe(false);
  });

  it('rejeita ir para delivered a partir de qualquer estado que não seja done', () => {
    expect(isValidStatusTransition('in_progress', 'delivered')).toBe(false);
    expect(isValidStatusTransition('received', 'delivered')).toBe(false);
  });

  it('rejeita transição para o mesmo status', () => {
    expect(isValidStatusTransition('in_progress', 'in_progress')).toBe(false);
  });
});

describe('getAllowedNextStatuses', () => {
  it('retorna lista vazia para estados terminais', () => {
    expect(getAllowedNextStatuses('delivered')).toEqual([]);
    expect(getAllowedNextStatuses('cancelled')).toEqual([]);
  });

  it('a partir de "received", permite qualquer outro estado ativo + cancelar (não inclui delivered)', () => {
    const allowed = getAllowedNextStatuses('received');
    expect(allowed).toContain('diagnosing');
    expect(allowed).toContain('cancelled');
    expect(allowed).not.toContain('delivered');
  });

  it('só "done" permite ir para delivered', () => {
    expect(getAllowedNextStatuses('done')).toContain('delivered');
    expect(getAllowedNextStatuses('in_progress')).not.toContain('delivered');
  });
});

describe('isBackwardTransition', () => {
  it('identifica um retrocesso real entre estados ativos', () => {
    expect(isBackwardTransition('in_progress', 'waiting_parts')).toBe(true);
    expect(isBackwardTransition('done', 'diagnosing')).toBe(true);
  });

  it('não considera avanço como retrocesso', () => {
    expect(isBackwardTransition('received', 'diagnosing')).toBe(false);
  });

  it('não considera ida a delivered/cancelled como retrocesso', () => {
    expect(isBackwardTransition('done', 'delivered')).toBe(false);
    expect(isBackwardTransition('in_progress', 'cancelled')).toBe(false);
  });
});
