import { describe, it, expect } from 'vitest';
import { mapMercadoPagoStatus } from './paymentStatus';

describe('mapMercadoPagoStatus', () => {
  it('mapeia approved para paid', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('paid');
  });

  it('mapeia pending e in_process para pending', () => {
    expect(mapMercadoPagoStatus('pending')).toBe('pending');
    expect(mapMercadoPagoStatus('in_process')).toBe('pending');
  });

  it('mapeia rejected para failed', () => {
    expect(mapMercadoPagoStatus('rejected')).toBe('failed');
  });

  it('mapeia refunded e charged_back para refunded', () => {
    expect(mapMercadoPagoStatus('refunded')).toBe('refunded');
    expect(mapMercadoPagoStatus('charged_back')).toBe('refunded');
  });

  it('nunca assume "paid" para um status desconhecido — cai em pending por segurança', () => {
    expect(mapMercadoPagoStatus('algum_status_novo_que_ainda_nao_existe')).toBe('pending');
  });
});
