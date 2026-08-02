import type { ApiErrorBody } from '@/types/api';
import { tokenStore } from './tokenStore';
import { getSessionId } from './sessionId';

// Em desenvolvimento, o Vite proxy redireciona /api → http://localhost:3001
// Em produção (Cloudflare Pages), VITE_API_URL aponta para o backend real
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
  /** Pula o header Authorization mesmo se houver um token salvo (ex.: login/register). */
  skipAuth?: boolean;
}

class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function buildUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    url = `${url}?${new URLSearchParams(params).toString()}`;
  }
  return url;
}

async function rawRequest(url: string, fetchOptions: RequestInit, skipAuth?: boolean): Promise<Response> {
  const accessToken = skipAuth ? null : tokenStore.getAccessToken();
  return fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : { 'X-Session-Id': getSessionId() }),
      ...fetchOptions.headers,
    },
  });
}

/** Troca o refresh token salvo por um novo par de tokens. Retorna false se falhar. */
async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;

    const body = (await response.json()) as { data: { accessToken: string; refreshToken: string } };
    tokenStore.setTokens(body.data.accessToken, body.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, skipAuth, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);

  let response = await rawRequest(url, fetchOptions, skipAuth);

  // Sessão expirada: tenta renovar o access token uma única vez e refaz a
  // requisição original. Evita deslogar o usuário por um token de 15min
  // vencido no meio do uso.
  const isAuthEndpoint = endpoint.startsWith('/auth/');
  if (response.status === 401 && !skipAuth && !isAuthEndpoint) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      response = await rawRequest(url, fetchOptions, skipAuth);
    } else {
      tokenStore.clear();
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Erro na requisição' }));
    const errorData = errorBody as ApiErrorBody;
    throw new ApiClientError(response.status, errorData.message ?? `HTTP ${response.status}`, errorBody);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: 'DELETE', ...options }),
};

export { ApiClientError };
