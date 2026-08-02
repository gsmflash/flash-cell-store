import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isLoginBlocked, registerFailedLoginAttempt, resetLoginAttempts } from './loginAttempts';

describe('loginAttempts', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('não bloqueia um identificador sem tentativas registradas', () => {
    expect(isLoginBlocked('nunca-tentou@flashcell.com')).toBe(false);
  });

  it('não bloqueia antes de atingir o número máximo de tentativas', () => {
    const email = 'quase-bloqueado@flashcell.com';
    for (let i = 0; i < 4; i++) registerFailedLoginAttempt(email);
    expect(isLoginBlocked(email)).toBe(false);
  });

  it('bloqueia ao atingir o número máximo de tentativas (5)', () => {
    const email = 'bloqueado@flashcell.com';
    for (let i = 0; i < 5; i++) registerFailedLoginAttempt(email);
    expect(isLoginBlocked(email)).toBe(true);
  });

  it('reseta o bloqueio após um login bem-sucedido', () => {
    const email = 'reset@flashcell.com';
    for (let i = 0; i < 5; i++) registerFailedLoginAttempt(email);
    expect(isLoginBlocked(email)).toBe(true);

    resetLoginAttempts(email);
    expect(isLoginBlocked(email)).toBe(false);
  });

  it('libera o bloqueio após a janela de 15 minutos expirar', () => {
    vi.useFakeTimers();
    const email = 'expira@flashcell.com';

    for (let i = 0; i < 5; i++) registerFailedLoginAttempt(email);
    expect(isLoginBlocked(email)).toBe(true);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(isLoginBlocked(email)).toBe(false);
  });

  it('identificadores diferentes não interferem entre si', () => {
    const emailA = 'a@flashcell.com';
    const emailB = 'b@flashcell.com';
    for (let i = 0; i < 5; i++) registerFailedLoginAttempt(emailA);

    expect(isLoginBlocked(emailA)).toBe(true);
    expect(isLoginBlocked(emailB)).toBe(false);
  });
});
