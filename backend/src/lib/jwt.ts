import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  type: TokenType;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Erro lançado quando um token é válido (assinatura/expiração ok) mas do tipo
 * errado para o contexto — ex.: um access token apresentado onde se espera
 * um refresh token, ou vice-versa.
 */
export class InvalidTokenTypeError extends Error {
  constructor(expected: TokenType, received: TokenType) {
    super(`Token do tipo "${received}" não pode ser usado como "${expected}".`);
    this.name = 'InvalidTokenTypeError';
  }
}

type TokenClaims = Omit<JwtPayload, 'iat' | 'exp' | 'type'>;

/**
 * Assina um access token JWT (curta duração) com segredo próprio.
 */
export function signAccessToken(payload: TokenClaims): string {
  const claims: Omit<JwtPayload, 'iat' | 'exp'> = { ...payload, type: 'access' };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Assina um refresh token JWT (longa duração) com segredo independente do
 * access token.
 */
export function signRefreshToken(payload: TokenClaims): string {
  const claims: Omit<JwtPayload, 'iat' | 'exp'> = { ...payload, type: 'refresh' };
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Gera o par access + refresh token.
 */
export function generateTokenPair(payload: TokenClaims): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * Verifica e decodifica um access token.
 * Lança se a assinatura/expiração forem inválidas, ou InvalidTokenTypeError
 * se o token apresentado for, na verdade, um refresh token.
 */
export function verifyAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  if (payload.type !== 'access') {
    throw new InvalidTokenTypeError('access', payload.type);
  }
  return payload;
}

/**
 * Verifica e decodifica um refresh token.
 * Lança se a assinatura/expiração forem inválidas, ou InvalidTokenTypeError
 * se o token apresentado for, na verdade, um access token.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  if (payload.type !== 'refresh') {
    throw new InvalidTokenTypeError('refresh', payload.type);
  }
  return payload;
}
