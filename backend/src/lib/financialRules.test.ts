import { describe, it, expect } from 'vitest';
import { computeFinalValue, computeReceivableStatus, computeChangeAmount, computeRemainingAmount } from './financialRules';

describe('computeFinalValue', () => {
  it('aplica desconto fixo em reais', () => {
    expect(computeFinalValue(200, 20, 'fixed')).toBe(180);
  });

  it('aplica desconto percentual', () => {
    expect(computeFinalValue(200, 10, 'percentage')).toBe(180);
  });

  it('nunca fica negativo mesmo com desconto maior que o subtotal', () => {
    expect(computeFinalValue(100, 500, 'fixed')).toBe(0);
  });

  it('desconto zero mantém o subtotal', () => {
    expect(computeFinalValue(150, 0, 'fixed')).toBe(150);
  });
});

describe('computeReceivableStatus', () => {
  it('pending quando nada foi recebido', () => {
    expect(computeReceivableStatus(100, 0)).toBe('pending');
  });

  it('partial quando recebeu menos que o valor final', () => {
    expect(computeReceivableStatus(100, 40)).toBe('partial');
  });

  it('paid quando recebeu o valor final exato', () => {
    expect(computeReceivableStatus(100, 100)).toBe('paid');
  });

  it('paid quando recebeu mais que o valor final (troco)', () => {
    expect(computeReceivableStatus(100, 150)).toBe('paid');
  });
});

describe('computeChangeAmount', () => {
  it('calcula troco quando o valor pago excede o saldo devedor', () => {
    expect(computeChangeAmount(100, 80)).toBe(20);
  });

  it('não gera troco negativo quando o valor pago é menor que o devido', () => {
    expect(computeChangeAmount(50, 80)).toBe(0);
  });

  it('sem troco quando o valor pago é exato', () => {
    expect(computeChangeAmount(80, 80)).toBe(0);
  });
});

describe('computeRemainingAmount', () => {
  it('calcula o saldo restante corretamente', () => {
    expect(computeRemainingAmount(100, 40)).toBe(60);
  });

  it('nunca fica negativo quando recebeu mais que o valor final', () => {
    expect(computeRemainingAmount(100, 150)).toBe(0);
  });

  it('zero quando totalmente quitado', () => {
    expect(computeRemainingAmount(100, 100)).toBe(0);
  });
});
