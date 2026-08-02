import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { rateLimiter } from './rateLimiter';

function fakeReq(ip: string): Request {
  return { ip } as unknown as Request;
}

function fakeRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('rateLimiter', () => {
  it('permite requisições dentro do limite', () => {
    const limiter = rateLimiter({ windowMs: 60_000, max: 3 });
    const req = fakeReq('1.1.1.1');
    const res = fakeRes();
    const next = vi.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('bloqueia com 429 ao exceder o limite', () => {
    const limiter = rateLimiter({ windowMs: 60_000, max: 2 });
    const req = fakeReq('2.2.2.2');
    const res = fakeRes();
    const next = vi.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next); // 3ª excede o limite de 2

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' }),
    );
  });

  it('trata IPs diferentes com contadores independentes', () => {
    const limiter = rateLimiter({ windowMs: 60_000, max: 1 });
    const resA = fakeRes();
    const resB = fakeRes();
    const next = vi.fn();

    limiter(fakeReq('3.3.3.3'), resA, next);
    limiter(fakeReq('4.4.4.4'), resB, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(resA.status).not.toHaveBeenCalled();
    expect(resB.status).not.toHaveBeenCalled();
  });

  it('libera novamente após a janela expirar', () => {
    vi.useFakeTimers();
    const limiter = rateLimiter({ windowMs: 1_000, max: 1 });
    const req = fakeReq('5.5.5.5');
    const res = fakeRes();
    const next = vi.fn();

    limiter(req, res, next);
    limiter(req, res, next); // bloqueado
    expect(res.status).toHaveBeenCalledWith(429);

    vi.advanceTimersByTime(1_001);
    limiter(req, res, next); // janela nova, deve passar

    expect(next).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
