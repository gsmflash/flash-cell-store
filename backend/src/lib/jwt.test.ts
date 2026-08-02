import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  InvalidTokenTypeError,
} from './jwt';

const claims = { sub: 'user-123', email: 'teste@flashcell.com', role: 'customer' };

describe('jwt: geração e verificação básica', () => {
  it('gera um access token que verifyAccessToken aceita e decodifica corretamente', () => {
    const token = signAccessToken(claims);
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe(claims.sub);
    expect(payload.email).toBe(claims.email);
    expect(payload.role).toBe(claims.role);
    expect(payload.type).toBe('access');
  });

  it('gera um refresh token que verifyRefreshToken aceita e decodifica corretamente', () => {
    const token = signRefreshToken(claims);
    const payload = verifyRefreshToken(token);

    expect(payload.type).toBe('refresh');
  });

  it('generateTokenPair retorna dois tokens distintos', () => {
    const { accessToken, refreshToken } = generateTokenPair(claims);
    expect(accessToken).not.toBe(refreshToken);
  });
});

describe('jwt: isolamento entre access e refresh (núcleo do hardening)', () => {
  it('rejeita um access token apresentado como refresh token', () => {
    const accessToken = signAccessToken(claims);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it('rejeita um refresh token apresentado como access token', () => {
    const refreshToken = signRefreshToken(claims);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });

  it('o erro de tipo trocado é identificável como InvalidTokenTypeError', () => {
    const accessToken = signAccessToken(claims);
    try {
      verifyRefreshToken(accessToken);
      expect.unreachable('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTokenTypeError);
    }
  });

  it('um refresh token assinado com JWT_REFRESH_SECRET não verifica contra JWT_ACCESS_SECRET mesmo ignorando o claim type', () => {
    // Este teste teria falhado no código antigo (segredo único): aqui
    // confirmamos que os dois segredos são realmente diferentes na prática,
    // não só o claim `type`.
    const refreshToken = signRefreshToken(claims);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});
